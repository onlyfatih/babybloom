-- Minik Atlas core schema (R1). Replaces the unexecuted P0 draft
-- (git history: 20261127000000_initial_schema.sql). Review notes:
-- docs/backend.md § "Draft review".
--
-- Principles
-- * Every record row carries family_id. Cross-table references use composite
--   foreign keys (id, family_id), so a record can never point into another family.
-- * Author/creator, family and creation columns are immutable (trigger).
-- * Membership, invitation, birth, memory finalization and media status change
--   only through security-definer RPCs (next migration). Clients have no
--   insert/update policy for those columns.
-- * Private records are visible to their author only. Owner status never
--   grants access to someone else's private record.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------- types

create type public.family_role as enum ('owner', 'adult');
create type public.membership_status as enum ('active', 'revoked', 'left');
create type public.visibility as enum ('family', 'private');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');
create type public.pregnancy_status as enum ('active', 'born', 'ended', 'archived');
create type public.media_status as enum ('pending', 'ready', 'orphaned');
create type public.media_purpose as enum ('memory', 'avatar');

-- ---------------------------------------------------------------- families

create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.family_memberships (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references public.families(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  role                public.family_role not null,
  relationship_label  text not null check (char_length(btrim(relationship_label)) between 1 and 40),
  display_name        text not null check (char_length(btrim(display_name)) between 1 and 60),
  status              public.membership_status not null default 'active',
  joined_at           timestamptz not null default now(),
  ended_at            timestamptz,
  unique (family_id, user_id),
  check ((status = 'active') = (ended_at is null))
);
create index family_memberships_user_active on public.family_memberships (user_id) where status = 'active';

create table public.family_invitations (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references public.families(id) on delete cascade,
  invited_by          uuid not null references auth.users(id),
  -- V1 policy: invitations always grant 'adult'. Ownership only by transfer.
  role                public.family_role not null default 'adult' check (role = 'adult'),
  relationship_label  text not null check (char_length(btrim(relationship_label)) between 1 and 40),
  token_hash          bytea not null unique,       -- sha256(token); the token is shown once
  expires_at          timestamptz not null,
  status              public.invitation_status not null default 'pending',
  accepted_by         uuid references auth.users(id),
  accepted_at         timestamptz,
  revoked_at          timestamptz,
  created_at          timestamptz not null default now(),
  check (expires_at > created_at),
  check ((status = 'accepted') = (accepted_by is not null and accepted_at is not null)),
  check ((status = 'revoked') = (revoked_at is not null))
);
create index family_invitations_family on public.family_invitations (family_id, created_at desc);

-- Failed invitation lookups per user, for bounded guessing (accept_invitation).
create table app.invitation_attempts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index invitation_attempts_user_time on app.invitation_attempts (user_id, attempted_at desc);

-- ---------------------------------------------------------------- profiles

create table public.pregnancies (
  id                     uuid primary key default gen_random_uuid(),
  family_id              uuid not null references public.families(id) on delete cascade,
  nickname               text check (char_length(btrim(nickname)) between 1 and 40),
  clinician_due_date     date,
  last_menstrual_period  date,
  status                 public.pregnancy_status not null default 'active',
  reminders_paused       boolean not null default false,
  content_hidden         boolean not null default false,
  birth_request_id       uuid,                      -- record_birth idempotency key
  created_by             uuid not null references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (id, family_id),
  check (clinician_due_date is not null or last_menstrual_period is not null),
  check ((status = 'born') = (birth_request_id is not null))
);
create index pregnancies_family on public.pregnancies (family_id);

create table public.media_assets (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  purpose      public.media_purpose not null,
  -- Object path inside the private bucket 'family-media': <family_id>/<id>.<ext>
  storage_key  text not null unique,
  mime_type    text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  width        int not null check (width between 1 and 8000),
  height       int not null check (height between 1 and 8000),
  -- Declared at reservation; verified against the stored object at finalize.
  byte_size    int not null check (byte_size between 1 and 5242880),
  status       public.media_status not null default 'pending',
  uploaded_by  uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  ready_at     timestamptz,
  unique (id, family_id),
  unique (id, family_id, purpose),
  check ((status = 'ready') = (ready_at is not null))
);
create index media_assets_pending on public.media_assets (created_at) where status <> 'ready';

create table public.children (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid not null references public.families(id) on delete cascade,
  name                 text not null check (char_length(btrim(name)) between 1 and 40),
  birth_date           date not null,
  birth_time           time,
  origin_pregnancy_id  uuid,
  avatar_media_id      uuid,
  avatar_purpose       public.media_purpose not null default 'avatar' check (avatar_purpose = 'avatar'),
  archived_at          timestamptz,
  created_by           uuid not null references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, family_id),
  foreign key (origin_pregnancy_id, family_id) references public.pregnancies (id, family_id) on delete set null (origin_pregnancy_id),
  foreign key (avatar_media_id, family_id, avatar_purpose) references public.media_assets (id, family_id, purpose) on delete set null (avatar_media_id)
);
create index children_family on public.children (family_id);
create index children_origin on public.children (origin_pregnancy_id) where origin_pregnancy_id is not null;

-- ---------------------------------------------------------------- records

create table public.memories (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references public.families(id) on delete cascade,
  pregnancy_id       uuid,
  child_id           uuid,
  title              text check (char_length(title) <= 120),
  body               text check (char_length(body) <= 10000),
  event_date         date not null,
  visibility         public.visibility not null default 'family',
  author_id          uuid not null references auth.users(id),
  client_request_id  uuid not null,
  version            int not null default 1,          -- optimistic concurrency for edits
  last_request_id    uuid,                            -- idempotency key of the latest edit
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, family_id),
  unique (author_id, client_request_id),
  check ((pregnancy_id is null) <> (child_id is null)),
  -- "not empty" (text or at least one photo) is checked in finalize_memory, which sees the media too.
  foreign key (pregnancy_id, family_id) references public.pregnancies (id, family_id) on delete cascade,
  foreign key (child_id, family_id) references public.children (id, family_id) on delete cascade
);
create index memories_family_order on public.memories (family_id, event_date desc, created_at desc, id desc);

create table public.memory_media (
  memory_id      uuid not null,
  media_id       uuid not null,
  family_id      uuid not null,
  media_purpose  public.media_purpose not null default 'memory' check (media_purpose = 'memory'),
  position       smallint not null check (position between 0 and 9),   -- MAX_PHOTOS_PER_MEMORY = 10
  primary key (memory_id, media_id),
  unique (memory_id, position) deferrable initially deferred,
  -- A photo belongs to exactly one memory, so it can never be reached through
  -- a memory with wider visibility than the one it was uploaded for.
  unique (media_id),
  foreign key (memory_id, family_id) references public.memories (id, family_id) on delete cascade,
  foreign key (media_id, family_id, media_purpose) references public.media_assets (id, family_id, purpose) on delete cascade
);

create table public.growth_measurements (
  id                    uuid primary key default gen_random_uuid(),
  family_id             uuid not null references public.families(id) on delete cascade,
  child_id              uuid not null,
  kind                  text not null check (kind in ('weight', 'length', 'head-circumference')),
  canonical_value       int not null check (canonical_value > 0),     -- grams or millimetres
  entered_unit          text not null check (entered_unit in ('kg', 'g', 'lb', 'cm', 'in')),
  measured_on           date not null,
  method                text check (method in ('recumbent-length', 'standing-height')),
  source                text check (source in ('home', 'clinician', 'imported')),
  note                  text check (char_length(note) <= 500),
  is_birth_measurement  boolean not null default false,
  author_id             uuid not null references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check ((kind = 'weight') = (entered_unit in ('kg', 'g', 'lb'))),
  check (method is null or kind = 'length'),
  foreign key (child_id, family_id) references public.children (id, family_id) on delete cascade
);
create index growth_measurements_child on public.growth_measurements (child_id, measured_on);

create table public.appointments (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  pregnancy_id  uuid,
  child_id      uuid,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  start_date    date not null,
  start_time    time not null,
  time_zone     text not null check (char_length(time_zone) between 1 and 64),   -- IANA id
  location      text check (char_length(location) <= 200),
  notes         text check (char_length(notes) <= 2000),
  visibility    public.visibility not null default 'family',
  author_id     uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (not (pregnancy_id is not null and child_id is not null)),
  foreign key (pregnancy_id, family_id) references public.pregnancies (id, family_id) on delete set null (pregnancy_id),
  foreign key (child_id, family_id) references public.children (id, family_id) on delete set null (child_id)
);
create index appointments_family_start on public.appointments (family_id, start_date, start_time);

create table public.user_preferences (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  active_family_id        uuid references public.families(id) on delete set null,
  selected_pregnancy_id   uuid references public.pregnancies(id) on delete set null,
  selected_child_id       uuid references public.children(id) on delete set null,
  locale                  text not null default 'tr' check (locale in ('tr')),
  measurement_system      text not null default 'metric' check (measurement_system in ('metric', 'imperial')),
  check (selected_pregnancy_id is null or selected_child_id is null)
);

-- Storage objects to delete, written in the same transaction as the row
-- deletion and processed by a retrying worker (docs/backend.md § Media).
create table app.storage_deletions (
  id           bigint generated always as identity primary key,
  bucket_id    text not null,
  object_path  text not null,
  enqueued_at  timestamptz not null default now(),
  attempts     int not null default 0,
  last_error   text,
  done_at      timestamptz,
  unique (bucket_id, object_path)
);

-- ---------------------------------------------------------------- helpers

create or replace function app.is_active_member(fam uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_memberships m
                 where m.family_id = fam and m.user_id = (select auth.uid()) and m.status = 'active');
$$;

create or replace function app.is_owner(fam uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_memberships m
                 where m.family_id = fam and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'owner');
$$;

-- Can the current user read this media row (and therefore its object)?
create or replace function app.can_read_media(media uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.media_assets a
    where a.id = media
      and app.is_active_member(a.family_id)
      and (
        -- uploader, while the upload is in progress
        (a.status = 'pending' and a.uploaded_by = (select auth.uid()))
        -- a photo of a memory the reader can see
        or exists (select 1 from public.memory_media mm join public.memories m on m.id = mm.memory_id
                   where mm.media_id = a.id and (m.visibility = 'family' or m.author_id = (select auth.uid())))
        -- a profile photo (profiles are family-visible)
        or exists (select 1 from public.children c where c.avatar_media_id = a.id)
      )
  );
$$;

revoke all on function app.is_active_member(uuid), app.is_owner(uuid), app.can_read_media(uuid) from public;
grant execute on function app.is_active_member(uuid), app.is_owner(uuid), app.can_read_media(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- integrity triggers

-- updated_at
create or replace function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Columns a client may never change after insert. RPCs that legitimately
-- change lifecycle columns set app.bypass_guard for their transaction.
create or replace function app.guard_immutable() returns trigger
language plpgsql set search_path = '' as $$
declare
  col text;
begin
  if coalesce(current_setting('app.bypass_guard', true), '') = 'on' then
    return new;
  end if;
  foreach col in array tg_argv loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise exception 'column % is read-only', col using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

create trigger families_touch before update on public.families for each row execute function app.touch_updated_at();
create trigger families_guard before update on public.families for each row execute function app.guard_immutable('id', 'created_by', 'created_at');

create trigger pregnancies_touch before update on public.pregnancies for each row execute function app.touch_updated_at();
create trigger pregnancies_guard before update on public.pregnancies for each row
  execute function app.guard_immutable('id', 'family_id', 'created_by', 'created_at', 'birth_request_id');

create trigger children_touch before update on public.children for each row execute function app.touch_updated_at();
create trigger children_guard before update on public.children for each row
  execute function app.guard_immutable('id', 'family_id', 'created_by', 'created_at', 'origin_pregnancy_id', 'avatar_media_id', 'archived_at');

create trigger memories_touch before update on public.memories for each row execute function app.touch_updated_at();
create trigger memories_guard before update on public.memories for each row
  execute function app.guard_immutable('id', 'family_id', 'author_id', 'client_request_id', 'created_at', 'pregnancy_id', 'child_id', 'title', 'body', 'event_date', 'visibility', 'version', 'last_request_id');

create trigger measurements_touch before update on public.growth_measurements for each row execute function app.touch_updated_at();
create trigger measurements_guard before update on public.growth_measurements for each row
  execute function app.guard_immutable('id', 'family_id', 'child_id', 'author_id', 'created_at', 'is_birth_measurement');

create trigger appointments_touch before update on public.appointments for each row execute function app.touch_updated_at();
create trigger appointments_guard before update on public.appointments for each row
  execute function app.guard_immutable('id', 'family_id', 'author_id', 'created_at');

-- Pregnancy status: clients may end, re-open or (owner) archive; 'born' only via record_birth.
create or replace function app.guard_pregnancy_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.bypass_guard', true), '') = 'on' or new.status = old.status then
    return new;
  end if;
  if new.status = 'born' or old.status = 'born' then
    raise exception 'birth is recorded with record_birth' using errcode = '42501';
  end if;
  if new.status = 'archived' and not app.is_owner(new.family_id) then
    raise exception 'only an owner can archive' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger pregnancies_status before update on public.pregnancies for each row execute function app.guard_pregnancy_status();

-- Media rows: deleting one queues its storage object for deletion.
create or replace function app.enqueue_media_object() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into app.storage_deletions (bucket_id, object_path) values ('family-media', old.storage_key)
  on conflict (bucket_id, object_path) do nothing;
  return old;
end $$;
create trigger media_assets_enqueue after delete on public.media_assets for each row execute function app.enqueue_media_object();

-- Removing a photo from a memory deletes the media row (and so queues the object).
create or replace function app.delete_detached_media() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.media_assets where id = old.media_id;
  return old;
end $$;
create trigger memory_media_detach after delete on public.memory_media for each row execute function app.delete_detached_media();

-- ---------------------------------------------------------------- RLS

alter table public.families            enable row level security;
alter table public.family_memberships  enable row level security;
alter table public.family_invitations  enable row level security;
alter table public.pregnancies         enable row level security;
alter table public.children            enable row level security;
alter table public.media_assets        enable row level security;
alter table public.memories            enable row level security;
alter table public.memory_media        enable row level security;
alter table public.growth_measurements enable row level security;
alter table public.appointments        enable row level security;
alter table public.user_preferences    enable row level security;

-- families: members read; owners rename. Create/delete via RPC.
create policy families_select on public.families for select to authenticated using (app.is_active_member(id));
create policy families_update on public.families for update to authenticated using (app.is_owner(id)) with check (app.is_owner(id));

-- memberships: members read their family's list (including ended members, for attribution). Changes via RPC.
create policy memberships_select on public.family_memberships for select to authenticated
  using (user_id = (select auth.uid()) or app.is_active_member(family_id));

-- invitations: owners read. Create/revoke/accept via RPC; the token hash never leaves the server.
create policy invitations_select on public.family_invitations for select to authenticated using (app.is_owner(family_id));
revoke select on public.family_invitations from authenticated;
grant select (id, family_id, invited_by, role, relationship_label, expires_at, status, accepted_by, accepted_at, revoked_at, created_at)
  on public.family_invitations to authenticated;

-- profiles: family-visible; any active member creates and edits.
create policy pregnancies_select on public.pregnancies for select to authenticated using (app.is_active_member(family_id));
create policy pregnancies_insert on public.pregnancies for insert to authenticated
  with check (app.is_active_member(family_id) and created_by = (select auth.uid()) and status = 'active' and birth_request_id is null);
create policy pregnancies_update on public.pregnancies for update to authenticated
  using (app.is_active_member(family_id)) with check (app.is_active_member(family_id));

create policy children_select on public.children for select to authenticated using (app.is_active_member(family_id));
create policy children_insert on public.children for insert to authenticated
  with check (app.is_active_member(family_id) and created_by = (select auth.uid()) and avatar_media_id is null and archived_at is null);
create policy children_update on public.children for update to authenticated
  using (app.is_active_member(family_id)) with check (app.is_active_member(family_id));

-- media rows: readable as described in app.can_read_media. Written only by RPCs.
create policy media_select on public.media_assets for select to authenticated using (app.can_read_media(id));

-- memories: visibility-aware read; author or (family-visible) owner deletes. Create/edit via finalize_memory.
create policy memories_select on public.memories for select to authenticated
  using (app.is_active_member(family_id) and (visibility = 'family' or author_id = (select auth.uid())));
create policy memories_delete on public.memories for delete to authenticated
  using (app.is_active_member(family_id) and (author_id = (select auth.uid()) or (visibility = 'family' and app.is_owner(family_id))));

create policy memory_media_select on public.memory_media for select to authenticated
  using (exists (select 1 from public.memories m where m.id = memory_id
                 and app.is_active_member(m.family_id) and (m.visibility = 'family' or m.author_id = (select auth.uid()))));

-- measurements: family-visible; any member adds (as author); author corrects; author or owner deletes.
create policy measurements_select on public.growth_measurements for select to authenticated using (app.is_active_member(family_id));
create policy measurements_insert on public.growth_measurements for insert to authenticated
  with check (app.is_active_member(family_id) and author_id = (select auth.uid()) and not is_birth_measurement);
create policy measurements_update on public.growth_measurements for update to authenticated
  using (app.is_active_member(family_id) and author_id = (select auth.uid()))
  with check (app.is_active_member(family_id) and author_id = (select auth.uid()));
create policy measurements_delete on public.growth_measurements for delete to authenticated
  using (app.is_active_member(family_id) and (author_id = (select auth.uid()) or app.is_owner(family_id)));

-- appointments: like memories, but plain rows (no media).
create policy appointments_select on public.appointments for select to authenticated
  using (app.is_active_member(family_id) and (visibility = 'family' or author_id = (select auth.uid())));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (app.is_active_member(family_id) and author_id = (select auth.uid()));
create policy appointments_update on public.appointments for update to authenticated
  using (app.is_active_member(family_id) and author_id = (select auth.uid()))
  with check (app.is_active_member(family_id) and author_id = (select auth.uid()));
create policy appointments_delete on public.appointments for delete to authenticated
  using (app.is_active_member(family_id) and (author_id = (select auth.uid()) or (visibility = 'family' and app.is_owner(family_id))));

-- preferences: self only; referenced family/profile must be one the user belongs to.
create policy preferences_select on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy preferences_insert on public.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()) and (active_family_id is null or app.is_active_member(active_family_id)));
create policy preferences_update on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (active_family_id is null or app.is_active_member(active_family_id)));

-- Anonymous users get nothing.
revoke all on all tables in schema public from anon;
