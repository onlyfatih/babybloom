-- Private media bucket (R1). Objects live at <family_id>/<media_id>.<ext>.
-- Clients never get public URLs; reads go through short-lived signed URLs,
-- which Storage only issues when the select policy below allows the object.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-media', 'family-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function app.can_read_object(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.media_assets a where a.storage_key = object_name and app.can_read_media(a.id));
$$;

-- Upload only into a slot reserved by reserve_media_upload, by its uploader,
-- while it is pending and the uploader is still an active member.
create or replace function app.can_upload_object(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.media_assets a
                 where a.storage_key = object_name and a.status = 'pending'
                   and a.uploaded_by = (select auth.uid()) and app.is_active_member(a.family_id));
$$;

revoke all on function app.can_read_object(text), app.can_upload_object(text) from public, anon;
grant execute on function app.can_read_object(text), app.can_upload_object(text) to authenticated;

create policy family_media_select on storage.objects for select to authenticated
  using (bucket_id = 'family-media' and app.can_read_object(name));

create policy family_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'family-media' and app.can_upload_object(name));

-- No update policy: an uploaded object is never overwritten (no upsert).
-- Uploader may delete its own object while the slot is still pending (cancel).
create policy family_media_delete_pending on storage.objects for delete to authenticated
  using (bucket_id = 'family-media' and app.can_upload_object(name));
