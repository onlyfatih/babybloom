/**
 * Client-side mirror of the permission matrix in docs/permissions.md.
 *
 * This decides what the UI *offers*. It is NOT authorization: the server
 * enforces the same rules with row-level security (backend/supabase/migrations).
 * Tests in __tests__/domain/permissions-test.ts and backend policy tests must agree.
 */
import type { FamilyMembership, Id, Visibility } from '../model';

export interface Actor {
  userId: Id;
  membership: Pick<FamilyMembership, 'familyId' | 'role' | 'status'> | null;
}

export interface RecordRef {
  familyId: Id;
  authorId: Id;
  /** Profiles and measurements are always family-visible. */
  visibility: Visibility;
}

export type RecordAction = 'view' | 'edit' | 'delete';

export type FamilyAction =
  | 'invite-member'
  | 'revoke-member'
  | 'transfer-ownership'
  | 'delete-family'
  | 'create-record'
  | 'manage-profile' // edit child/pregnancy details, record birth
  | 'archive-profile'
  | 'export-own-view';

function isActiveMember(actor: Actor, familyId: Id): boolean {
  return actor.membership?.familyId === familyId && actor.membership.status === 'active';
}

export function canOnRecord(actor: Actor, action: RecordAction, record: RecordRef): boolean {
  if (!isActiveMember(actor, record.familyId)) return false;
  const isAuthor = actor.userId === record.authorId;

  if (record.visibility === 'private') {
    // Owner status never grants access to author-private entries.
    return isAuthor;
  }

  switch (action) {
    case 'view':
      return true;
    case 'edit':
      return isAuthor;
    case 'delete':
      return isAuthor || actor.membership?.role === 'owner';
  }
}

export function canOnFamily(actor: Actor, action: FamilyAction, familyId: Id): boolean {
  if (!isActiveMember(actor, familyId)) return false;
  const isOwner = actor.membership?.role === 'owner';
  switch (action) {
    case 'create-record':
    case 'manage-profile':
    case 'export-own-view':
      return true;
    case 'invite-member':
    case 'revoke-member':
    case 'transfer-ownership':
    case 'delete-family':
    case 'archive-profile':
      return isOwner;
  }
}

/**
 * The last active owner cannot leave or be revoked; ownership must be
 * transferred first, or the family deleted.
 */
export function canRemoveMember(
  memberships: Pick<FamilyMembership, 'userId' | 'role' | 'status'>[],
  targetUserId: Id,
): 'ok' | 'last-owner' | 'not-member' {
  const target = memberships.find((m) => m.userId === targetUserId && m.status === 'active');
  if (!target) return 'not-member';
  if (target.role === 'owner') {
    const owners = memberships.filter((m) => m.role === 'owner' && m.status === 'active');
    if (owners.length <= 1) return 'last-owner';
  }
  return 'ok';
}
