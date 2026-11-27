# Permissions

Source of truth for the rules. Client mirror: `src/domain/permissions/permissions.ts`
(tests: `__tests__/domain/permissions-test.ts`). Server enforcement: RLS in
`backend/supabase/migrations/` (draft, P3). The client mirror only decides
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
| Delete measurement | author | or owner |
| Archive profile | | ✓ |

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

## Verified so far

Unit tests of the client mirror and demo provider (private hidden from owner,
revoked member blocked). No RLS policy test has run; there is no database yet.
