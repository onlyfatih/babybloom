-- Minik Atlas: initial schema DRAFT (P0).
-- STATUS: not executed anywhere. No Supabase project exists. Review in P3,
-- run with `supabase db reset` against the local CLI stack, and add policy
-- tests (backend/supabase/tests) before any hosted project is created.
--
-- Rules mirrored from docs/permissions.md and src/domain/permissions/permissions.ts:
--   * private rows: author only (owner status never grants access)
--   * family rows: any active member views; author edits; author or owner deletes
--   * owner only: invitations, revoking members, archiving profiles

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- core tables

create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create type public.family_role as enum ('owner', 'adult');
create type public.membership_status as enum ('active', 'revoked');

create table public.family_memberships (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references public.families(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  role                public.family_role not null,
  relationship_label  text not null check (char_length(relationship_label) between 1 and 40),
  display_name        text not null check (char_length(display_name) between 1 and 60),
  status              public.membership_status not null default 'active',
  joined_at           timestamptz not null default now(),
  revoked_at          timestamptz,
  unique (family_id, user_id)
);
create index on public.family_memberships (user_id) where status = 'active';

create table public.family_invitations (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references public.families(id) on delete cascade,
  invited_by          uuid not null references auth.users(id),
  role                public.family_role not null default 'adult',
  relationship_label  text not null,
  code_hash           text not null unique,          -- sha256 of the code; plain code is shown once
  expires_at          timestamptz not null,
  status              text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  created_at          timestamptz not null default now()
);

create table public.pregnancies (
  id                     uuid primary key default gen_random_uuid(),
  family_id              uuid not null references public.families(id) on delete cascade,
  nickname               text check (char_length(nickname) <= 40),
  clinician_due_date     date,
  last_menstrual_period  date,
  status                 text not null default 'active' check (status in ('active','born','archived','ended')),
  reminders_paused       boolean not null default false,
  content_hidden         boolean not null default false,
  created_by             uuid not null references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (clinician_due_date is not null or last_menstrual_period is not null)
);

create table public.media_assets (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  storage_key  text not null unique,                 -- private bucket object key
  mime_type    text not null check (mime_type in ('image/jpeg','image/png','image/heic','image/webp')),
  width        int not null check (width > 0),
  height       int not null check (height > 0),
  byte_size    int not null check (byte_size > 0 and byte_size <= 15000000),
  status       text not null default 'pending' check (status in ('pending','ready','orphaned')),
  uploaded_by  uuid not null references auth.users(id),
  created_at   timestamptz not null default now()
);

create table public.children (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid not null references public.families(id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 40),
  birth_date           date not null,
  birth_time           time,
  origin_pregnancy_id  uuid references public.pregnancies(id) on delete set null,
  avatar_media_id      uuid references public.media_assets(id) on delete set null,
  created_by           uuid not null references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create type public.visibility as enum ('family', 'private');

create table public.memories (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  pregnancy_id  uuid references public.pregnancies(id) on delete cascade,
  child_id      uuid references public.children(id) on delete cascade,
  title         text check (char_length(title) <= 120),
  body          text check (char_length(body) <= 10000),
  event_date    date not null,
  visibility    public.visibility not null default 'family',
  author_id     uuid not null references auth.users(id),
  client_request_id uuid not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- exactly one subject
  check ((pregnancy_id is null) <> (child_id is null)),
  unique (author_id, client_request_id)              -- finalize() idempotency
);

create table public.memory_media (
  memory_id  uuid not null references public.memories(id) on delete cascade,
  media_id   uuid not null references public.media_assets(id) on delete cascade,
  position   smallint not null check (position between 0 and 9),  -- MAX_PHOTOS_PER_MEMORY = 10
  primary key (memory_id, media_id),
  unique (memory_id, position)
);

create table public.growth_measurements (
  id                    uuid primary key default gen_random_uuid(),
  family_id             uuid not null references public.families(id) on delete cascade,
  child_id              uuid not null references public.children(id) on delete cascade,
  kind                  text not null check (kind in ('weight','length','head-circumference')),
  canonical_value       int not null check (canonical_value > 0),   -- grams or millimetres
  entered_unit          text not null check (entered_unit in ('kg','g','lb','cm','in')),
  measured_on           date not null,
  is_birth_measurement  boolean not null default false,
  author_id             uuid not null references auth.users(id),
  created_at            timestamptz not null default now()
);

create table public.appointments (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  pregnancy_id  uuid references public.pregnancies(id) on delete set null,
  child_id      uuid references public.children(id) on delete set null,
  title         text not null check (char_length(title) between 1 and 120),
  start_date    date not null,
  start_time    time not null,
  time_zone     text not null,                       -- IANA id; instant derived on read
  location      text check (char_length(location) <= 200),
  notes         text check (char_length(notes) <= 2000),
  visibility    public.visibility not null default 'family',
  author_id     uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (not (pregnancy_id is not null and child_id is not null))
);

create table public.user_preferences (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  selected_pregnancy_id uuid references public.pregnancies(id) on delete set null,
  selected_child_id     uuid references public.children(id) on delete set null,
  locale                text not null default 'tr',
  measurement_system    text not null default 'metric' check (measurement_system in ('metric','imperial')),
  appointment_reminders boolean not null default true,
  weekly_pregnancy_update boolean not null default true
);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_active_member(fam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_memberships
                 where family_id = fam and user_id = auth.uid() and status = 'active');
$$;

create or replace function public.is_owner(fam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_memberships
                 where family_id = fam and user_id = auth.uid() and status = 'active' and role = 'owner');
$$;

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

create policy families_select on public.families for select using (is_active_member(id));
create policy families_update on public.families for update using (is_owner(id));
create policy families_delete on public.families for delete using (is_owner(id));
-- Family creation and invitation acceptance go through security-definer RPCs (P3),
-- so there is no direct insert policy on families / family_memberships.

create policy memberships_select on public.family_memberships for select using (is_active_member(family_id));
create policy memberships_revoke on public.family_memberships for update using (is_owner(family_id));

create policy invitations_owner on public.family_invitations for all using (is_owner(family_id)) with check (is_owner(family_id));

-- Profiles: family-visible; any active member manages; owner archives (enforced in RPC/trigger, P3).
create policy pregnancies_rw on public.pregnancies for all using (is_active_member(family_id)) with check (is_active_member(family_id));
create policy children_rw on public.children for all using (is_active_member(family_id)) with check (is_active_member(family_id));
create policy measurements_select on public.growth_measurements for select using (is_active_member(family_id));
create policy measurements_insert on public.growth_measurements for insert with check (is_active_member(family_id) and author_id = auth.uid());
create policy measurements_delete on public.growth_measurements for delete using (author_id = auth.uid() or is_owner(family_id));

-- Visibility-aware records.
create policy memories_select on public.memories for select using (
  is_active_member(family_id) and (visibility = 'family' or author_id = auth.uid()));
create policy memories_insert on public.memories for insert with check (
  is_active_member(family_id) and author_id = auth.uid());
create policy memories_update on public.memories for update using (
  is_active_member(family_id) and author_id = auth.uid()) with check (author_id = auth.uid());
create policy memories_delete on public.memories for delete using (
  is_active_member(family_id) and (author_id = auth.uid() or (visibility = 'family' and is_owner(family_id))));

create policy appointments_select on public.appointments for select using (
  is_active_member(family_id) and (visibility = 'family' or author_id = auth.uid()));
create policy appointments_insert on public.appointments for insert with check (
  is_active_member(family_id) and author_id = auth.uid());
create policy appointments_update on public.appointments for update using (
  is_active_member(family_id) and author_id = auth.uid()) with check (author_id = auth.uid());
create policy appointments_delete on public.appointments for delete using (
  is_active_member(family_id) and (author_id = auth.uid() or (visibility = 'family' and is_owner(family_id))));

-- Media is readable only through a memory the reader can see (or by its uploader while pending).
create policy media_select on public.media_assets for select using (
  uploaded_by = auth.uid()
  or exists (select 1 from memory_media mm join memories m on m.id = mm.memory_id
             where mm.media_id = media_assets.id
               and m.family_id = media_assets.family_id
               and is_active_member(m.family_id)
               and (m.visibility = 'family' or m.author_id = auth.uid())));
create policy media_insert on public.media_assets for insert with check (
  is_active_member(family_id) and uploaded_by = auth.uid());

create policy memory_media_select on public.memory_media for select using (
  exists (select 1 from memories m where m.id = memory_id
          and is_active_member(m.family_id) and (m.visibility = 'family' or m.author_id = auth.uid())));
create policy memory_media_write on public.memory_media for all using (
  exists (select 1 from memories m where m.id = memory_id and m.author_id = auth.uid()))
  with check (exists (select 1 from memories m where m.id = memory_id and m.author_id = auth.uid()));

create policy preferences_self on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- TODO (P3): storage bucket 'family-media' (private) with object policies keyed
-- on media_assets; RPCs create_family, accept_invitation, record_birth,
-- transfer_ownership, delete_family; last-owner guard trigger; orphan cleanup job.
