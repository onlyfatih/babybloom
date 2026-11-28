-- R2: create a child with birth measurements atomically (outside the
-- pregnancy → birth flow). Birth measurements cannot be inserted directly.
-- Idempotent per request id: a retry returns the same child.

alter table public.children add column create_request_id uuid;
create unique index children_create_request on public.children (created_by, create_request_id) where create_request_id is not null;

create or replace function public.create_child(
  p_family_id uuid, p_name text, p_birth_date date, p_birth_time time, p_measurements jsonb, p_request_id uuid)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := app.require_user();
  child uuid;
  m jsonb;
begin
  perform app.require_member(p_family_id);
  if p_request_id is null or p_birth_date is null or p_birth_date > current_date + 1 then
    raise exception 'validation' using errcode = 'P0001';
  end if;
  select id into child from public.children where created_by = uid and create_request_id = p_request_id;
  if child is not null then
    return child;
  end if;
  insert into public.children (family_id, name, birth_date, birth_time, created_by, create_request_id)
    values (p_family_id, btrim(p_name), p_birth_date, p_birth_time, uid, p_request_id)
    on conflict (created_by, create_request_id) where create_request_id is not null do nothing
    returning id into child;
  if child is null then
    select id into child from public.children where created_by = uid and create_request_id = p_request_id;
    return child;
  end if;
  for m in select * from jsonb_array_elements(coalesce(p_measurements, '[]'::jsonb)) loop
    insert into public.growth_measurements (family_id, child_id, kind, canonical_value, entered_unit, measured_on, is_birth_measurement, author_id)
      values (p_family_id, child, m ->> 'kind', (m ->> 'canonical_value')::int, m ->> 'entered_unit', p_birth_date, true, uid);
  end loop;
  return child;
end $$;

revoke all on function public.create_child(uuid, text, date, time, jsonb, uuid) from public, anon;
grant execute on function public.create_child(uuid, text, date, time, jsonb, uuid) to authenticated;

-- create_request_id is set only by create_child.
drop trigger children_guard on public.children;
create trigger children_guard before update on public.children for each row
  execute function app.guard_immutable('id', 'family_id', 'created_by', 'created_at', 'origin_pregnancy_id', 'avatar_media_id', 'archived_at', 'create_request_id');
drop policy children_insert on public.children;
create policy children_insert on public.children for insert to authenticated
  with check (app.is_active_member(family_id) and created_by = (select auth.uid()) and avatar_media_id is null
              and archived_at is null and create_request_id is null);
