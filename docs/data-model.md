# Data model

Domain types: `src/domain/model.ts`. Relational draft:
`backend/supabase/migrations/20261127000000_initial_schema.sql` (not executed).

## Entities

| Entity | Key fields | Notes |
| --- | --- | --- |
| `families` | name, created_by | One family per user in V1 |
| `family_memberships` | family_id, user_id, role (`owner`/`adult`), relationship_label, status (`active`/`revoked`) | Revoked rows are kept for audit; revoked users lose all access |
| `family_invitations` | role, relationship_label, `code_hash`, expires_at, status | Plain code shown once to inviter; only its hash is stored. Demo expiry 36 h |
| `pregnancies` | nickname, clinician_due_date, last_menstrual_period, status (`active`/`born`/`archived`/`ended`), reminders_paused, content_hidden | At least one dating field required |
| `children` | name, birth_date (date), birth_time (time, optional), origin_pregnancy_id, avatar_media_id | Never created by renaming a pregnancy |
| `memories` | pregnancy_id XOR child_id, title, body, event_date (date), visibility, author_id, client_request_id | CHECK: exactly one subject. `unique(author_id, client_request_id)` gives idempotent finalize |
| `memory_media` | memory_id, media_id, position 0–9 | Max 10 photos |
| `media_assets` | storage_key, mime_type, width, height, byte_size, status (`pending`/`ready`/`orphaned`) | Private bucket key, never a public URL |
| `growth_measurements` | child_id, kind, canonical_value (int g or mm), entered_unit, measured_on, is_birth_measurement | |
| `appointments` | optional pregnancy_id or child_id, title, start_date, start_time, time_zone (IANA), location, notes, visibility | Instant is derived, wall time is the source of truth |
| `user_preferences` | selected profile, locale, measurement_system, notification toggles | Self only |

## Conventions

- Dates without time (`event_date`, `birth_date`, `measured_on`, dating
  fields) are SQL `date` / domain `LocalDate` strings. Never timestamps.
- Created/updated times are `timestamptz` / ISO UTC `Instant`.
- Measurements are integers in grams / millimetres; display conversion in
  `src/domain/measurements/units.ts`.
- Deleting a memory deletes its `memory_media` rows and media objects
  (`mediaToDelete` in `src/domain/memories/memory-rules.ts`).

## Migrations

- Files: `backend/supabase/migrations/<UTC timestamp>_<name>.sql`, forward only.
- Every table change updates: this doc, `src/domain/model.ts`, the mapping in
  `src/data/mapping`, the demo fixture, and policy tests.
- Run locally with `supabase db reset` (P3). Never edit a migration that has
  run against a hosted project; add a new one.
