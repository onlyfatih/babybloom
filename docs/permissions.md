# Permissions

Source of truth for the rules. Client mirror: `src/domain/permissions/permissions.ts`
(tests: `__tests__/domain/permissions-test.ts`). Server enforcement: RLS, RPCs and Storage
policies in `backend/supabase/migrations/`. The client mirror only decides
what the UI offers; it is not authorization. Feature flags never grant access.

## Roles

- **owner**: created the family or received ownership. Can be more than one.
- **adult**: invited member (partner, grandparent, caregiver).
- Anyone with a revoked membership, or no membership, can do nothing.

## Records with visibility (memories, appointments)

| Action | Family record, author | Family record, other adult | Family record, owner (not author) | Private record, author | Private record, anyone else incl. owner |
| --- | --- | --- | --- | --- | --- |
| View | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit | ✓ | ✗ | ✗ | ✓ | ✗ |
| Delete | ✓ | ✗ | ✓ | ✓ | ✗ |

Private records do not exist for other members: they are absent from lists,
counts and exports, and a direct id lookup returns `not-found`.

## Profiles and measurements (always family-visible)

| Action | Any active member | Owner only |
| --- | --- | --- |
| View pregnancy / child / measurements | ✓ | |
| Create and edit profile details, dating, record birth | ✓ | |
| Add measurement | ✓ | |
| Correct (edit) measurement | author | |
| Delete measurement | author | or owner |
| Archive profile | | ✓ |
| Delete profile | | – (V1: only by deleting the family) |

## Family actions

| Action | Adult | Owner |
| --- | --- | --- |
| Invite member (code, expiry) | ✗ | ✓ |
| Revoke invitation / member | ✗ | ✓ |
| Transfer ownership | ✗ | ✓ |
| Delete family | ✗ | ✓ |
| Export own view | ✓ | ✓ |

The last active owner cannot be revoked or leave (`canRemoveMember` →
`last-owner`); ownership must be transferred first.

## Export

Exports contain only what the exporting user can view, for the profiles they
selected, plus memories of a child's origin pregnancy when that child is
selected (`selectForExport` in `src/domain/permissions/export-selection.ts`).

Invitations always grant the adult role; owner only through transfer. See
docs/backend.md § Product rules for rejoin and already-member behaviour.

## Verified so far

- Client mirror and demo provider: unit tests.
- Server (R1): RLS, RPC and Storage policies tested against the local
  Supabase stack with real user sessions, `npm run test:db` (40 tests,
  docs/backend.md § Tests). Not yet run against a hosted project.
