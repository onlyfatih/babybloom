/**
 * Session-related repository contracts (R1). Identity, family membership,
 * invitation acceptance and active-family selection are separate concerns;
 * the old AuthRepository mixed them and is kept only for the demo provider
 * until R2 moves the screens over.
 */
import type { Id } from '@/domain/model';
import type { AuthIdentity, MembershipSummary } from './session-state';

export type IdentityEvent =
  | { type: 'signed-in'; identity: AuthIdentity }
  | { type: 'token-refreshed'; identity: AuthIdentity }
  | { type: 'signed-out' };

export interface IdentityRepository {
  /** Restores a stored session (refreshing it if needed). null when there is none or it expired. */
  current(): Promise<AuthIdentity | null>;
  /** Auth state changes, including expiry detected during refresh. Returns an unsubscribe function. */
  subscribe(listener: (event: IdentityEvent) => void): () => void;
  /** Sends a one-time sign-in code by email (creates the account on first use). */
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<AuthIdentity>;
  /** Ends this device's session. Never deletes any data. */
  signOut(): Promise<void>;
  /** Token auto-refresh runs only while the app is in the foreground. */
  setForeground(active: boolean): void;
}

export interface MembershipRepository {
  /** The current user's memberships in every family, any status. */
  listMine(): Promise<MembershipSummary[]>;
  activeFamilyId(): Promise<Id | null>;
  setActiveFamily(familyId: Id): Promise<void>;
  createFamily(input: { familyName: string; displayName: string; relationshipLabel: string }): Promise<Id>;
  leaveFamily(familyId: Id): Promise<void>;
  /** Pregnancy + child profiles visible in the family (archived included). */
  profileCount(familyId: Id): Promise<number>;
}

export type AcceptInvitationResult = { result: 'joined' | 'already-member'; familyId: Id };

export interface InvitationAcceptance {
  /** Rejects with DataError('invalid-invitation') or DataError('validation', 'rate-limited'). */
  accept(token: string, displayName: string): Promise<AcceptInvitationResult>;
}

export interface SessionBackend {
  identity: IdentityRepository;
  memberships: MembershipRepository;
  invitations: InvitationAcceptance;
}
