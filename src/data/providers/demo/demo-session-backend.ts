/**
 * Demo implementation of the session contracts (R2). Adapts the demo
 * provider's combined AuthRepository so the app runs one session state
 * machine (SessionController) for both providers.
 *
 * The demo has no email identity: a "user" exists once a family was created,
 * joined or loaded on this device. Everything stays on the device.
 */
import { DataError, type Backend } from '../../repositories/types';
import type { SessionBackend } from '../../session/contracts';
import type { MembershipSummary } from '../../session/session-state';

export function createDemoSessionBackend(backend: Backend): SessionBackend {
  const session = () => backend.auth.getSession();
  return {
    identity: {
      async current() {
        const s = await session();
        return s ? { userId: s.user.id, email: null } : null;
      },
      subscribe() {
        return () => undefined;
      },
      async requestEmailCode() {
        throw new DataError('validation', 'demo-no-email');
      },
      async verifyEmailCode() {
        throw new DataError('validation', 'demo-no-email');
      },
      signOut: () => backend.auth.signOut(),
      setForeground() {},
    },
    memberships: {
      async listMine(): Promise<MembershipSummary[]> {
        const s = await session();
        return s ? [{ membership: s.membership, family: s.family, user: s.user }] : [];
      },
      async activeFamilyId() {
        return (await session())?.family.id ?? null;
      },
      async setActiveFamily() {},
      async createFamily({ displayName, relationshipLabel }) {
        return (await backend.auth.createFamily({ displayName, relationshipLabel })).family.id;
      },
      async leaveFamily() {
        throw new DataError('forbidden', 'demo-leave-unsupported');
      },
      async profileCount(familyId) {
        const { pregnancies, children } = await backend.profiles.list(familyId);
        return pregnancies.length + children.length;
      },
    },
    invitations: {
      async accept(token, displayName) {
        const s = await backend.auth.acceptInvitation({ code: token, displayName });
        return { result: 'joined', familyId: s.family.id };
      },
    },
  };
}
