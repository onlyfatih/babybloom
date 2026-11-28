/**
 * R2.2: a late response for user A is never shown to user B, and A's cache
 * is gone after the switch. Uses a fake SessionBackend (no network).
 */
import { useQuery } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { AppBackends } from '@/data/backend';
import type { SessionBackend, IdentityEvent } from '@/data/session/contracts';
import type { MembershipSummary } from '@/data/session/session-state';
import { SessionProvider, useSessionApi } from '@/features/session';

function membership(userId: string, familyId: string): MembershipSummary {
  return {
    membership: { id: `m-${userId}`, familyId, userId, role: 'owner', relationshipLabel: 'Anne', status: 'active', joinedAt: '2026-11-28T00:00:00Z', revokedAt: null },
    family: { id: familyId, name: 'Örnek', createdBy: userId, createdAt: '2026-11-28T00:00:00Z' },
    user: { id: userId, displayName: userId },
  };
}

function fakeBackends() {
  let user: string | null = 'A';
  let listener: ((e: IdentityEvent) => void) | null = null;
  const session: SessionBackend = {
    identity: {
      current: async () => (user ? { userId: user, email: `${user}@example.test` } : null),
      subscribe: (l) => {
        listener = l;
        return () => (listener = null);
      },
      requestEmailCode: async () => undefined,
      verifyEmailCode: async () => ({ userId: user!, email: null }),
      signOut: async () => {
        user = null;
      },
      setForeground: () => undefined,
    },
    memberships: {
      listMine: async () => (user ? [membership(user, `fam-${user}`)] : []),
      activeFamilyId: async () => (user ? `fam-${user}` : null),
      setActiveFamily: async () => undefined,
      createFamily: async () => 'x',
      leaveFamily: async () => undefined,
      profileCount: async () => 1,
    },
    invitations: { accept: async () => ({ result: 'joined', familyId: 'x' }) },
  };
  const backends = { kind: 'supabase', backend: {} as AppBackends['backend'], session } as AppBackends;
  return {
    backends,
    switchTo(next: string) {
      user = next;
      listener?.({ type: 'signed-in', identity: { userId: next, email: null } });
    },
  };
}

// Each user's "records" query: A's response is held back until released.
let releaseA: (() => void) | null = null;
let fetchesSeen: string[] = [];

function Records() {
  const { state } = useSessionApi();
  const uid = state.kind === 'ready' ? state.identity.userId : null;
  const q = useQuery({
    // Deliberately NOT scoped by user: isolation must come from the per-scope client.
    queryKey: ['records'],
    enabled: !!uid,
    queryFn: async () => {
      fetchesSeen.push(uid!);
      if (uid === 'A') await new Promise<void>((r) => (releaseA = r));
      return `records of ${uid}`;
    },
  });
  return <Text testID="records">{`${uid ?? '-'}|${q.data ?? 'none'}`}</Text>;
}

const flush = () => act(async () => {
  await new Promise((r) => setTimeout(r, 0));
});

describe('SessionProvider scope isolation', () => {
  beforeEach(() => {
    releaseA = null;
    fetchesSeen = [];
  });

  it('never shows a late response for user A to user B', async () => {
    const fake = fakeBackends();
    await render(
      <SessionProvider backends={fake.backends}>
        <Records />
      </SessionProvider>,
    );
    await flush();
    expect(fetchesSeen).toEqual(['A']); // A's request is in flight
    await act(async () => fake.switchTo('B'));
    await flush();
    await flush();
    expect(screen.getByTestId('records').props.children).toBe('B|records of B');
    // A's response now arrives late.
    await act(async () => releaseA?.());
    await flush();
    expect(screen.getByTestId('records').props.children).toBe('B|records of B');
  });

  it('sign-out publishes signed-out and drops the cached records', async () => {
    const fake = fakeBackends();
    let api: ReturnType<typeof useSessionApi> | null = null;
    function Probe() {
      api = useSessionApi();
      return null;
    }
    await render(
      <SessionProvider backends={fake.backends}>
        <Probe />
        <Records />
      </SessionProvider>,
    );
    await flush();
    await act(async () => releaseA?.());
    await flush();
    expect(screen.getByTestId('records').props.children).toBe('A|records of A');
    await act(async () => api!.signOut());
    await flush();
    expect(api!.state.kind).toBe('signed-out');
    expect(screen.getByTestId('records').props.children).toBe('-|none');
  });
});
