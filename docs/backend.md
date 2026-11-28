# Backend (Supabase)

Local first: everything below runs and is tested against the local stack
(`npx supabase start --workdir backend`, Docker). No hosted project exists.

## Layout

| Path | What |
| --- | --- |
| `backend/supabase/config.toml` | Local stack config (auth email code, templates, limits) |
| `backend/supabase/migrations/20261128000100_core_schema.sql` | Tables, constraints, indexes, integrity triggers, RLS |
| `backend/supabase/migrations/20261128000200_rpc.sql` | Transactional RPCs (security definer, own auth checks) |
| `backend/supabase/migrations/20261128000300_storage.sql` | Private bucket `family-media` and object policies |
| `backend/tests/*.test.ts` | Integration tests (`npm run test:db`) |
| `src/data/providers/supabase/` | Client-side provider: generated types, error mapping, session backend |

## Draft review (P0 draft → R1 migrations)

The unexecuted P0 draft (`20261127000000_initial_schema.sql`, in git history)
was reviewed and replaced. Changes and why:

| Finding in the draft | Change |
| --- | --- |
| Records referenced profiles/media by id only: a row in family A could point at a child of family B | Composite foreign keys `(x_id, family_id)` everywhere; `ON DELETE SET NULL (col)` keeps family_id intact |
| `author_id`, `family_id`, `created_by` could be updated by the author | `app.guard_immutable` trigger on every table |
| Pregnancy status (incl. `born`) and membership role freely writable by members | `born` only through `record_birth`; archive owner-only; no client update on memberships |
| Invitation `role` client-chosen; plaintext-equivalent lookup; no attempt limit | Role fixed to `adult`; sha256 token hash not readable by clients; 10 wrong guesses / 15 min / user; row lock for concurrent accept |
| Memory insert/update and media `ready` status writable by clients | Only `finalize_memory`, which verifies each object in Storage (exists, size ≤ 5 MB, type) and records the real size |
| A media row could be attached to several memories | `unique (media_id)` on `memory_media`: a private memory's photo cannot be reached through a family memory |
| Avatar and memory photos shared one pool | `media_assets.purpose` with composite keys: an avatar slot cannot become a memory photo and vice versa |
| Pending media never cleaned up; storage objects never deleted | Deleting a media row (directly or by cascade) queues its object in `app.storage_deletions` in the same transaction |
| HEIC allowed | Removed: the app re-encodes to JPEG (ADR-007); bucket allow-list jpeg/png/webp |
| Helpers in `public` (callable via the API) | Helpers in schema `app`, not exposed; `search_path = ''` |
| No idempotency for edits; no edit conflict detection | `version` + `last_request_id` on memories: retries return the same result, stale edits get `conflict` |
| Membership end had one state | `revoked` (by owner) vs `left` (self), with `ended_at` |
| No active-family selection | `user_preferences.active_family_id`, set by `create_family`, `accept_invitation`, `set_active_family` |

## Product rules recorded here (changes or clarifications)

- Invitations always grant **adult**. Owners are made only by transfer.
- An **already active** member using an invitation gets `already-member`; the
  invitation stays usable. A member who **left or was revoked** can rejoin with
  a new invitation (role adult).
- **Measurement correction**: only the author edits a measurement; author or
  owner deletes (the delete rule is unchanged). Birth measurements are created
  only by `record_birth`.
- **Profiles are not deleted by clients in V1**; children are archived by an
  owner (`set_child_archived`). Deleting a family removes everything (R5).
- A photo belongs to exactly one memory. Profile photos are family-visible.
- **Twins**: `record_birth` takes 1–4 children; each gets
  `origin_pregnancy_id`. Pregnancy memories stay attached to the pregnancy and
  appear in each child's timeline as "before birth" (export already includes
  origin-pregnancy memories when a child is selected).
- Max 5 active families per user; max 20 pending invitations per family;
  max 100 pending uploads per user per day.

## Media lifecycle (server side, R1; client side in R3)

1. `reserve_media_upload(family, purpose, type, declared size, w, h)` → media id + object path `<family>/<media>.<ext>`.
2. Client uploads to that path (Storage insert policy: only the reserving user, only while pending, only active members; no upsert).
3. `finalize_memory` / `set_child_avatar` verifies the object and marks the row ready with the stored size.
4. Reads: `createSignedUrl` succeeds only where `app.can_read_media` allows (uploader while pending; memory visible to the reader; profile photo).
5. Deletes: row deletion queues the object; a worker with the secret key
   deletes queued objects and records attempts/errors (worker: R5). Until the
   worker runs, an object can still exist physically but no client can get a
   URL for it (tested).
6. Abandoned pending rows: R5 cleanup job (age > 24 h).

## Account deletion and authored records (proposal, needs owner decision, R5)

Authored rows reference `auth.users`. Proposal: deleting an account
(1) requires transferring ownership or deleting families where the user is
the last owner, (2) deletes the user's private records and media,
(3) keeps family-visible records the user wrote, attributed to "Eski üye",
(4) then deletes the auth user. Not implemented yet.

## Tests (`npm run test:db`)

Identities are created with the local admin API in the harness; every
authorization assertion runs as that user's own session. 40 tests:
`access.test.ts` (other family, forged ids, immutable fields, private
records, finalize idempotency/conflict, invitations incl. concurrent and
rate limit, revocation, last owner, transfer, birth concurrency,
measurements, expired JWT), `storage.test.ts` (slots, bucket types,
verification, signed URLs by visibility/membership, avatars, deletion
queue), `session.test.ts` (email code sign-in via Mailpit, relaunch restore,
sign-out keeps data, two devices, revocation seen by the controller).
