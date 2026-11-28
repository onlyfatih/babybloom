-- Transactional operations (R1). All are SECURITY DEFINER with an empty
-- search_path and do their own authorization checks, because they write
-- rows that clients cannot write directly.
--
-- Errors: `raise exception '<code>' using errcode = 'P0001'`. The message is a
-- stable code mapped to DataErrorCode by src/data/providers/supabase/errors.ts.

-- ---------------------------------------------------------------- helpers

create or replace function app.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'session-expired' using errcode = 'P0001';
  end if;
  return uid;
end $$;

create or replace function app.require_member(fam uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  st public.membership_status;
begin
  select m.status into st from public.family_memberships m where m.family_id = fam and m.user_id = auth.uid();
  if st is null then
    raise exception 'forbidden' using errcode = 'P0001';
  elsif st <> 'active' then
    raise exception 'membership-revoked' using errcode = 'P0001';
  end if;
end $$;

create or replace function app.require_owner(fam uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_member(fam);
  if not app.is_owner(fam) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
end $$;

create or replace function app.bypass_guards() returns void
language sql volatile set search_path = '' as $$
  select set_config('app.bypass_guard', 'on', true);
$$;

-- Normalized token → sha256. Tokens are case-insensitive and ignore separators.
create or replace function app.invitation_hash(token text) returns bytea
language sql immutable set search_path = '' as $$
  select extensions.digest(upper(regexp_replace(coalesce(token, ''), '[^A-Za-z0-9]', '', 'g')), 'sha256');
$$;

-- 20 symbols from a 32-symbol alphabet (no I, O, 0, 1) = 100 bits, from
-- gen_random_bytes. 256 is a multiple of 32, so `byte & 31` is unbiased.
create or replace function app.new_invitation_token() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(20);
  out text := '';
begin
  for i in 0..19 loop
    if i > 0 and i % 5 = 0 then out := out || '-'; end if;
    out := out || substr(alphabet, (get_byte(bytes, i) & 31) + 1, 1);
  end loop;
  return out;
end $$;

create or replace function app.set_active_family(uid uuid, fam uuid) returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.user_preferences (user_id, active_family_id) values (uid, fam)
  on conflict (user_id) do update set active_family_id = excluded.active_family_id,
    selected_pregnancy_id = null, selected_child_id = null;
$$;

-- Verifies that a reserved media row has a stored object that matches it,
-- then records the actual object size. Raises 'upload-failed' otherwise.
create or replace function app.verify_media_object(media uuid, fam uuid, want_purpose public.media_purpose, uid uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  a public.media_assets;
  obj_size bigint;
  obj_type text;
begin
  select * into a from public.media_assets where id = media for update;
  if a.id is null or a.family_id <> fam or a.purpose <> want_purpose then
    raise exception 'validation' using errcode = 'P0001';
  end if;
  if a.status = 'ready' then
    return;
  end if;
  if a.uploaded_by <> uid or a.status <> 'pending' then
    raise exception 'validation' using errcode = 'P0001';
  end if;
  select (o.metadata ->> 'size')::bigint, o.metadata ->> 'mimetype' into obj_size, obj_type
  from storage.objects o where o.bucket_id = 'family-media' and o.name = a.storage_key;
  if obj_size is null then
    raise exception 'upload-failed' using errcode = 'P0001';
  end if;
  if obj_size < 1 or obj_size > 5242880 or obj_type is distinct from a.mime_type then
    raise exception 'validation' using errcode = 'P0001';
  end if;
  update public.media_assets set status = 'ready', ready_at = now(), byte_size = obj_size where id = media;
end $$;

-- ---------------------------------------------------------------- family

create or replace function public.create_family(p_family_name text, p_display_name text, p_relationship_label text)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  fam uuid;
begin
  if (select count(*) from public.family_memberships where user_id = uid and status = 'active') >= 5 then
    raise exception 'validation' using errcode = 'P0001', detail = 'too-many-families';
  end if;
  insert into public.families (name, created_by) values (btrim(p_family_name), uid) returning id into fam;
  insert into public.family_memberships (family_id, user_id, role, relationship_label, display_name)
    values (fam, uid, 'owner', btrim(p_relationship_label), btrim(p_display_name));
  perform app.set_active_family(uid, fam);
  return fam;
end $$;

create or replace function public.set_active_family(p_family_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
begin
  perform app.require_member(p_family_id);
  perform app.set_active_family(uid, p_family_id);
end $$;

create or replace function public.create_invitation(p_family_id uuid, p_relationship_label text)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  tok text := app.new_invitation_token();
  inv public.family_invitations;
begin
  perform app.require_owner(p_family_id);
  if (select count(*) from public.family_invitations i
      where i.family_id = p_family_id and i.status = 'pending' and i.expires_at > now()) >= 20 then
    raise exception 'validation' using errcode = 'P0001', detail = 'too-many-invitations';
  end if;
  insert into public.family_invitations (family_id, invited_by, relationship_label, token_hash, expires_at)
    values (p_family_id, uid, btrim(p_relationship_label), app.invitation_hash(tok), now() + interval '48 hours')
    returning * into inv;
  return query select inv.id, tok, inv.expires_at;
end $$;

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  fam uuid;
begin
  perform app.require_user();
  select family_id into fam from public.family_invitations where id = p_invitation_id;
  if fam is null then
    raise exception 'not-found' using errcode = 'P0001';
  end if;
  perform app.require_owner(fam);
  update public.family_invitations set status = 'revoked', revoked_at = now()
    where id = p_invitation_id and status = 'pending';
end $$;

-- Returns a result instead of raising for wrong tokens, so the failed attempt
-- is committed and counts towards the limit (10 per 15 minutes per user).
create or replace function public.accept_invitation(p_token text, p_display_name text)
returns table (result text, family_id uuid)
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  inv public.family_invitations;
  existing public.family_memberships;
begin
  if (select count(*) from app.invitation_attempts a
      where a.user_id = uid and a.attempted_at > now() - interval '15 minutes') >= 10 then
    return query select 'rate-limited'::text, null::uuid;
    return;
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 60 then
    raise exception 'validation' using errcode = 'P0001';
  end if;

  -- Row lock: concurrent accepts of the same token serialize here.
  select * into inv from public.family_invitations i where i.token_hash = app.invitation_hash(p_token) for update;
  if inv.id is null or inv.status <> 'pending' or inv.expires_at <= now() then
    insert into app.invitation_attempts (user_id) values (uid);
    return query select 'invalid-invitation'::text, null::uuid;
    return;
  end if;

  select * into existing from public.family_memberships m where m.family_id = inv.family_id and m.user_id = uid for update;
  if existing.id is not null and existing.status = 'active' then
    -- Already a member: the invitation stays usable for the intended person.
    return query select 'already-member'::text, inv.family_id;
    return;
  end if;

  if existing.id is not null then
    -- Rejoining after leaving or being revoked: a fresh invitation from an owner is consent.
    update public.family_memberships
      set status = 'active', role = 'adult', ended_at = null, joined_at = now(),
          display_name = btrim(p_display_name), relationship_label = inv.relationship_label
      where id = existing.id;
  else
    insert into public.family_memberships (family_id, user_id, role, relationship_label, display_name)
      values (inv.family_id, uid, 'adult', inv.relationship_label, btrim(p_display_name));
  end if;

  update public.family_invitations set status = 'accepted', accepted_by = uid, accepted_at = now() where id = inv.id;
  perform app.set_active_family(uid, inv.family_id);
  return query select 'joined'::text, inv.family_id;
end $$;

-- Owners revoke others; anyone leaves. The last active owner can do neither.
create or replace function app.end_membership(target uuid, new_status public.membership_status) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  t public.family_memberships;
  owners int;
begin
  select * into t from public.family_memberships where id = target for update;
  if t.id is null or t.status <> 'active' then
    raise exception 'not-found' using errcode = 'P0001';
  end if;
  -- Lock the family's memberships so two owners cannot remove each other at once.
  perform 1 from public.family_memberships where family_id = t.family_id and status = 'active' for update;
  select count(*) into owners from public.family_memberships
    where family_id = t.family_id and status = 'active' and role = 'owner' and id <> t.id;
  if t.role = 'owner' and owners = 0 then
    raise exception 'last-owner' using errcode = 'P0001';
  end if;
  update public.family_memberships set status = new_status, ended_at = now() where id = t.id;
  update public.user_preferences set active_family_id = null, selected_pregnancy_id = null, selected_child_id = null
    where user_id = t.user_id and active_family_id = t.family_id;
end $$;

create or replace function public.revoke_member(p_membership_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  t public.family_memberships;
begin
  select * into t from public.family_memberships where id = p_membership_id;
  if t.id is null then
    raise exception 'not-found' using errcode = 'P0001';
  end if;
  perform app.require_owner(t.family_id);
  if t.user_id = uid then
    raise exception 'validation' using errcode = 'P0001', detail = 'use-leave-family';
  end if;
  perform app.end_membership(p_membership_id, 'revoked');
end $$;

create or replace function public.leave_family(p_family_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  mid uuid;
begin
  perform app.require_member(p_family_id);
  select id into mid from public.family_memberships where family_id = p_family_id and user_id = uid;
  perform app.end_membership(mid, 'left');
end $$;

create or replace function public.transfer_ownership(p_family_id uuid, p_to_membership_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  t public.family_memberships;
begin
  perform app.require_owner(p_family_id);
  perform 1 from public.family_memberships where family_id = p_family_id and status = 'active' for update;
  select * into t from public.family_memberships where id = p_to_membership_id;
  if t.id is null or t.family_id <> p_family_id or t.status <> 'active' or t.user_id = uid then
    raise exception 'validation' using errcode = 'P0001';
  end if;
  update public.family_memberships set role = 'owner' where id = t.id;
  update public.family_memberships set role = 'adult' where family_id = p_family_id and user_id = uid;
end $$;

-- ---------------------------------------------------------------- profiles

-- p_children: [{ "name", "birth_date", "birth_time"?, "measurements": [{ "kind", "canonical_value", "entered_unit" }] }]
create or replace function public.record_birth(p_pregnancy_id uuid, p_children jsonb, p_request_id uuid)
returns setof uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  p public.pregnancies;
  c jsonb;
  m jsonb;
  child uuid;
  bdate date;
begin
  select * into p from public.pregnancies where id = p_pregnancy_id for update;
  if p.id is null then
    raise exception 'not-found' using errcode = 'P0001';
  end if;
  perform app.require_member(p.family_id);
  if p.status = 'born' then
    if p.birth_request_id = p_request_id then
      -- Retry of the same request: return the same children.
      return query select ch.id from public.children ch where ch.origin_pregnancy_id = p.id order by ch.created_at, ch.id;
      return;
    end if;
    raise exception 'already-born' using errcode = 'P0001';
  end if;
  if p.status <> 'active' or p_request_id is null
     or jsonb_typeof(p_children) <> 'array' or jsonb_array_length(p_children) not between 1 and 4 then
    raise exception 'validation' using errcode = 'P0001';
  end if;

  perform app.bypass_guards();
  for c in select * from jsonb_array_elements(p_children) loop
    bdate := (c ->> 'birth_date')::date;
    if bdate is null or bdate > current_date + 1 then
      raise exception 'validation' using errcode = 'P0001';
    end if;
    insert into public.children (family_id, name, birth_date, birth_time, origin_pregnancy_id, created_by)
      values (p.family_id, btrim(c ->> 'name'), bdate, nullif(c ->> 'birth_time', '')::time, p.id, uid)
      returning id into child;
    for m in select * from jsonb_array_elements(coalesce(c -> 'measurements', '[]'::jsonb)) loop
      insert into public.growth_measurements (family_id, child_id, kind, canonical_value, entered_unit, measured_on, is_birth_measurement, author_id)
        values (p.family_id, child, m ->> 'kind', (m ->> 'canonical_value')::int, m ->> 'entered_unit', bdate, true, uid);
    end loop;
    return next child;
  end loop;
  update public.pregnancies set status = 'born', birth_request_id = p_request_id where id = p.id;
end $$;

create or replace function public.set_child_archived(p_child_id uuid, p_archived boolean)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  fam uuid;
begin
  perform app.require_user();
  select family_id into fam from public.children where id = p_child_id;
  if fam is null then
    raise exception 'not-found' using errcode = 'P0001';
  end if;
  perform app.require_owner(fam);
  perform app.bypass_guards();
  update public.children set archived_at = case when p_archived then coalesce(archived_at, now()) else null end where id = p_child_id;
end $$;

-- ---------------------------------------------------------------- media

create or replace function public.reserve_media_upload(
  p_family_id uuid, p_purpose public.media_purpose, p_mime_type text, p_byte_size int, p_width int, p_height int)
returns table (media_id uuid, storage_key text)
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  mid uuid := gen_random_uuid();
  ext text;
  key text;
begin
  perform app.require_member(p_family_id);
  if (select count(*) from public.media_assets a where a.uploaded_by = uid and a.status = 'pending'
      and a.created_at > now() - interval '1 day') >= 100 then
    raise exception 'validation' using errcode = 'P0001', detail = 'too-many-pending-uploads';
  end if;
  ext := case p_mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' end;
  if ext is null then
    raise exception 'validation' using errcode = 'P0001', detail = 'mime-type';
  end if;
  key := p_family_id::text || '/' || mid::text || '.' || ext;
  insert into public.media_assets (id, family_id, purpose, storage_key, mime_type, width, height, byte_size, uploaded_by)
    values (mid, p_family_id, p_purpose, key, p_mime_type, p_width, p_height, p_byte_size, uid);
  return query select mid, key;
end $$;

-- Creates (p_memory_id null) or edits a memory and sets its photos, in one
-- transaction. Idempotent: create is keyed by (author, client_request_id),
-- edit by last_request_id. Edits use optimistic concurrency (p_expected_version).
create or replace function public.finalize_memory(
  p_family_id uuid,
  p_memory_id uuid,
  p_client_request_id uuid,
  p_pregnancy_id uuid,
  p_child_id uuid,
  p_title text,
  p_body text,
  p_event_date date,
  p_visibility public.visibility,
  p_media_ids uuid[],
  p_expected_version int)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  mem public.memories;
  media uuid;
  pos int := 0;
  ids uuid[] := coalesce(p_media_ids, '{}');
begin
  perform app.require_member(p_family_id);
  if p_client_request_id is null then
    raise exception 'validation' using errcode = 'P0001';
  end if;
  if cardinality(ids) > 10 or cardinality(ids) <> (select count(distinct x) from unnest(ids) x) then
    raise exception 'validation' using errcode = 'P0001', detail = 'photos';
  end if;
  if coalesce(btrim(p_title), '') = '' and coalesce(btrim(p_body), '') = '' and cardinality(ids) = 0 then
    raise exception 'validation' using errcode = 'P0001', detail = 'empty';
  end if;
  if p_event_date is null or p_event_date > current_date + 1 then
    raise exception 'validation' using errcode = 'P0001', detail = 'event-date';
  end if;

  if p_memory_id is null then
    select * into mem from public.memories where author_id = uid and client_request_id = p_client_request_id;
    if mem.id is not null then
      return mem.id;                       -- retry of a create that already committed
    end if;
    -- A concurrent retry with the same key waits on the unique index and then
    -- returns the row the first call created.
    insert into public.memories (family_id, pregnancy_id, child_id, title, body, event_date, visibility, author_id, client_request_id)
      values (p_family_id, p_pregnancy_id, p_child_id, nullif(btrim(p_title), ''), nullif(btrim(p_body), ''),
              p_event_date, coalesce(p_visibility, 'family'), uid, p_client_request_id)
      on conflict (author_id, client_request_id) do nothing
      returning * into mem;
    if mem.id is null then
      select * into mem from public.memories where author_id = uid and client_request_id = p_client_request_id;
      return mem.id;
    end if;
  else
    select * into mem from public.memories where id = p_memory_id for update;
    if mem.id is null or mem.family_id <> p_family_id or not (mem.visibility = 'family' or mem.author_id = uid) then
      raise exception 'not-found' using errcode = 'P0001';
    end if;
    if mem.author_id <> uid then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
    if mem.last_request_id = p_client_request_id then
      return mem.id;                       -- retry of an edit that already committed
    end if;
    if p_expected_version is distinct from mem.version then
      raise exception 'conflict' using errcode = 'P0001';
    end if;
    if p_pregnancy_id is distinct from mem.pregnancy_id or p_child_id is distinct from mem.child_id then
      raise exception 'validation' using errcode = 'P0001', detail = 'subject-is-fixed';
    end if;
    perform app.bypass_guards();
    update public.memories set title = nullif(btrim(p_title), ''), body = nullif(btrim(p_body), ''),
      event_date = p_event_date, visibility = coalesce(p_visibility, mem.visibility),
      version = mem.version + 1, last_request_id = p_client_request_id
      where id = mem.id;
    -- Photos no longer listed are detached; the trigger deletes them and queues the objects.
    delete from public.memory_media mm where mm.memory_id = mem.id and not (mm.media_id = any (ids));
  end if;

  foreach media in array ids loop
    if not exists (select 1 from public.memory_media mm where mm.memory_id = mem.id and mm.media_id = media) then
      perform app.verify_media_object(media, p_family_id, 'memory', uid);
      insert into public.memory_media (memory_id, media_id, family_id, position) values (mem.id, media, p_family_id, pos);
    else
      update public.memory_media set position = pos where memory_id = mem.id and media_id = media;
    end if;
    pos := pos + 1;
  end loop;
  return mem.id;
end $$;

create or replace function public.set_child_avatar(p_child_id uuid, p_media_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  c public.children;
begin
  select * into c from public.children where id = p_child_id for update;
  if c.id is null then
    raise exception 'not-found' using errcode = 'P0001';
  end if;
  perform app.require_member(c.family_id);
  if p_media_id is not null then
    perform app.verify_media_object(p_media_id, c.family_id, 'avatar', uid);
  end if;
  perform app.bypass_guards();
  update public.children set avatar_media_id = p_media_id where id = c.id;
  if c.avatar_media_id is not null and c.avatar_media_id is distinct from p_media_id then
    delete from public.media_assets where id = c.avatar_media_id;   -- queues the old object
  end if;
end $$;

-- ---------------------------------------------------------------- grants

revoke all on function
  public.create_family(text, text, text), public.set_active_family(uuid),
  public.create_invitation(uuid, text), public.revoke_invitation(uuid), public.accept_invitation(text, text),
  public.revoke_member(uuid), public.leave_family(uuid), public.transfer_ownership(uuid, uuid),
  public.record_birth(uuid, jsonb, uuid), public.set_child_archived(uuid, boolean),
  public.reserve_media_upload(uuid, public.media_purpose, text, int, int, int),
  public.finalize_memory(uuid, uuid, uuid, uuid, uuid, text, text, date, public.visibility, uuid[], int),
  public.set_child_avatar(uuid, uuid)
from public, anon;

grant execute on function
  public.create_family(text, text, text), public.set_active_family(uuid),
  public.create_invitation(uuid, text), public.revoke_invitation(uuid), public.accept_invitation(text, text),
  public.revoke_member(uuid), public.leave_family(uuid), public.transfer_ownership(uuid, uuid),
  public.record_birth(uuid, jsonb, uuid), public.set_child_archived(uuid, boolean),
  public.reserve_media_upload(uuid, public.media_purpose, text, int, int, int),
  public.finalize_memory(uuid, uuid, uuid, uuid, uuid, text, text, date, public.visibility, uuid[], int),
  public.set_child_avatar(uuid, uuid)
to authenticated;

-- Internal helpers are not callable by clients.
revoke all on all functions in schema app from public, anon, authenticated;
grant execute on function app.is_active_member(uuid), app.is_owner(uuid), app.can_read_media(uuid) to authenticated;
