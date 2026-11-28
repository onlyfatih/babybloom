/**
 * Application session state (R1). Pure: no React, no I/O. The session
 * controller (session-controller.ts) feeds it facts from the identity,
 * membership and preference repositories.
 *
 * A valid signed-in user may have no family yet. That is its own state, not
 * "signed out", and it never fabricates a SessionInfo.
 */
import type { Family, FamilyMembership, Id, User } from '@/domain/model';

export interface AuthIdentity {
  userId: Id;
  email: string | null;
}

export interface MembershipSummary {
  membership: FamilyMembership;
  family: Family;
  /** The member's display name inside this family. */
  user: User;
}

export type SessionErrorKind = 'offline' | 'bootstrap-failed' | 'configuration';

export type SessionState =
  | { kind: 'bootstrapping' }
  | { kind: 'signed-out'; reason?: 'session-expired' | 'signed-out' }
  | {
      kind: 'authenticated-without-family';
      identity: AuthIdentity;
      /** Active memberships to choose from when there is more than one and none is selected. */
      choices: MembershipSummary[];
      /** Set when the user was just removed from the family they were using. */
      notice?: 'membership-revoked';
    }
  | { kind: 'authenticated-with-family-without-profile'; identity: AuthIdentity; current: MembershipSummary }
  | { kind: 'ready'; identity: AuthIdentity; current: MembershipSummary }
  | { kind: 'recoverable-error'; error: SessionErrorKind; identity: AuthIdentity | null };

export interface SessionFacts {
  identity: AuthIdentity | null;
  /** All memberships of the user, any status. */
  memberships: MembershipSummary[];
  /** Server-side preference (user_preferences.active_family_id). */
  activeFamilyId: Id | null;
  /** Number of pregnancy + child profiles in the resolved family (null if not loaded). */
  profileCount: number | null;
  /** Family id the app was using before this resolution, to detect revocation. */
  previousFamilyId: Id | null;
}

/**
 * Picks the family explicitly. V1 policy:
 * 1. the stored active family, if the user is still an active member;
 * 2. otherwise the only active membership, if there is exactly one;
 * 3. otherwise none: the user chooses (never "the first row returned").
 */
export function resolveActiveMembership(memberships: MembershipSummary[], activeFamilyId: Id | null): MembershipSummary | null {
  const active = memberships.filter((m) => m.membership.status === 'active');
  const preferred = active.find((m) => m.family.id === activeFamilyId);
  if (preferred) return preferred;
  return active.length === 1 ? active[0]! : null;
}

export function resolveSession(f: SessionFacts): SessionState {
  if (!f.identity) return { kind: 'signed-out' };
  const current = resolveActiveMembership(f.memberships, f.activeFamilyId);
  if (!current) {
    // Removed by an owner: either from the family in use just now, or (cold
    // start, nothing remembered) any revoked membership. Leaving is not removal.
    const lostPrevious =
      (f.previousFamilyId !== null && f.memberships.some((m) => m.family.id === f.previousFamilyId && m.membership.status !== 'active')) ||
      f.memberships.some((m) => m.membership.status === 'revoked');
    return {
      kind: 'authenticated-without-family',
      identity: f.identity,
      choices: f.memberships.filter((m) => m.membership.status === 'active'),
      ...(lostPrevious ? { notice: 'membership-revoked' as const } : {}),
    };
  }
  if (f.profileCount === 0) return { kind: 'authenticated-with-family-without-profile', identity: f.identity, current };
  return { kind: 'ready', identity: f.identity, current };
}

/** Cache/draft scope: anything cached for one scope must never be shown in another. */
export function sessionScope(state: SessionState): { userId: Id; familyId: Id | null } | null {
  switch (state.kind) {
    case 'ready':
    case 'authenticated-with-family-without-profile':
      return { userId: state.identity.userId, familyId: state.current.family.id };
    case 'authenticated-without-family':
      return { userId: state.identity.userId, familyId: null };
    case 'recoverable-error':
      return state.identity ? { userId: state.identity.userId, familyId: null } : null;
    default:
      return null;
  }
}

export function sameScope(a: ReturnType<typeof sessionScope>, b: ReturnType<typeof sessionScope>): boolean {
  return a?.userId === b?.userId && a?.familyId === b?.familyId;
}
