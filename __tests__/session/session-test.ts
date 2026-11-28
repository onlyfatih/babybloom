/**
 * R1 auth state model: state resolution, explicit family selection, failed
 * bootstrap, stale results after identity changes, scope-change cleanup and
 * subscription lifecycle. Uses in-memory fakes, no network.
 */
import type { IdentityEvent, SessionBackend } from '@/data/session/contracts';
import { SessionController } from '@/data/session/session-controller';
import { AuthIdentity, MembershipSummary, resolveActiveMembership, resolveSession } from '@/data/session/session-state';
import { DataError } from '@/data/repositories/types';
import { isPrivilegedKey, parseConfig } from '@/infrastructure/configuration/app-config';

const me: AuthIdentity = { userId: 'u1', email: 'kurgu@example.test' };
const other: AuthIdentity = { userId: 'u2', email: 'baska@example.test' };
const ms = (familyId: string, status: 'active' | 'revoked' | 'left' = 'active'): MembershipSummary => ({
  membership: { id: `m-${familyId}`, familyId, userId: 'u1', role: 'owner', relationshipLabel: 'Anne', status, joinedAt: '2026-01-01T00:00:00Z', revokedAt: null },
  family: { id: familyId, name: `Aile ${familyId}`, createdBy: 'u1', createdAt: '2026-01-01T00:00:00Z' },
  user: { id: 'u1', displayName: 'Kurgu' },
});

describe('resolveSession', () => {
  it('signed out without identity', () => {
    expect(resolveSession({ identity: null, memberships: [], activeFamilyId: null, profileCount: null, previousFamilyId: null }).kind).toBe('signed-out');
  });
  it('a valid user without a family is not signed out', () => {
    expect(resolveSession({ identity: me, memberships: [], activeFamilyId: null, profileCount: null, previousFamilyId: null })).toEqual({ kind: 'authenticated-without-family', identity: me, choices: [] });
  });
  it('family without profiles, then ready', () => {
    const f = { identity: me, memberships: [ms('f1')], activeFamilyId: null, previousFamilyId: null };
    expect(resolveSession({ ...f, profileCount: 0 }).kind).toBe('authenticated-with-family-without-profile');
    expect(resolveSession({ ...f, profileCount: 2 }).kind).toBe('ready');
  });
  it('never picks the first of several families; uses the stored choice', () => {
    expect(resolveActiveMembership([ms('f1'), ms('f2')], null)).toBeNull();
    expect(resolveActiveMembership([ms('f1'), ms('f2')], 'f2')!.family.id).toBe('f2');
    expect(resolveActiveMembership([ms('f1', 'revoked'), ms('f2')], 'f1')!.family.id).toBe('f2');
  });
  it('reports a revocation found on a cold start too, but not a voluntary leave', () => {
    const revoked = { ...ms('f1'), membership: { ...ms('f1').membership, status: 'revoked' as const } };
    const left = { ...ms('f2'), membership: { ...ms('f2').membership, status: 'left' as const } };
    expect(resolveSession({ identity: me, memberships: [revoked], activeFamilyId: null, profileCount: null, previousFamilyId: null })).toMatchObject({ kind: 'authenticated-without-family', notice: 'membership-revoked' });
    expect(resolveSession({ identity: me, memberships: [left], activeFamilyId: null, profileCount: null, previousFamilyId: null })).not.toHaveProperty('notice');
  });

  it('reports revocation of the family in use', () => {
    const s = resolveSession({ identity: me, memberships: [ms('f1', 'revoked'), ms('f2'), ms('f3')], activeFamilyId: 'f1', profileCount: null, previousFamilyId: 'f1' });
    expect(s).toMatchObject({ kind: 'authenticated-without-family', notice: 'membership-revoked' });
    expect(s.kind === 'authenticated-without-family' && s.choices.map((c) => c.family.id)).toEqual(['f2', 'f3']);
  });
});

function fakeBackend() {
  let who: AuthIdentity | null = null;
  let listener: ((e: IdentityEvent) => void) | null = null;
  const b = {
    unsubscribed: 0,
    signOuts: 0,
    memberships: [] as MembershipSummary[],
    active: null as string | null,
    profiles: 1,
    failNext: null as Error | null,
    delayFor: null as string | null,
    release: null as null | (() => void),
    /** When set, signOut() waits for this before removing the identity (like a network revoke). */
    holdSignOut: null as null | Promise<void>,
    setUser(u: AuthIdentity | null) {
      who = u;
    },
    emit(e: IdentityEvent) {
      listener?.(e);
    },
  };
  const backend: SessionBackend = {
    identity: {
      current: async () => who,
      subscribe: (l) => {
        listener = l;
        return () => {
          listener = null;
          b.unsubscribed += 1;
        };
      },
      requestEmailCode: async () => undefined,
      verifyEmailCode: async () => me,
      signOut: async () => {
        b.signOuts += 1;
        if (b.holdSignOut) await b.holdSignOut;
        who = null;
      },
      setForeground: () => undefined,
    },
    memberships: {
      listMine: async () => {
        const asked = who?.userId;
        if (b.failNext) {
          const e = b.failNext;
          b.failNext = null;
          throw e;
        }
        if (asked && asked === b.delayFor) await new Promise<void>((r) => (b.release = r));
        return b.memberships;
      },
      activeFamilyId: async () => b.active,
      setActiveFamily: async (id) => {
        b.active = id;
      },
      createFamily: async () => 'f-new',
      leaveFamily: async () => undefined,
      profileCount: async () => b.profiles,
    },
    invitations: { accept: async () => ({ result: 'joined', familyId: 'f1' }) },
  };
  return { b, backend };
}

describe('SessionController', () => {
  it('bootstraps to signed-out, then follows sign-in events', async () => {
    const { b, backend } = fakeBackend();
    const scopes: unknown[] = [];
    const c = new SessionController({ backend, onScopeChange: (p, n) => void scopes.push([p, n]) });
    expect(c.current.kind).toBe('bootstrapping');
    await c.start();
    expect(c.current.kind).toBe('signed-out');
    b.setUser(me);
    b.memberships = [ms('f1')];
    b.emit({ type: 'signed-in', identity: me });
    await new Promise((r) => setTimeout(r, 0));
    expect(c.current.kind).toBe('ready');
    expect(scopes).toEqual([[null, { userId: 'u1', familyId: 'f1' }]]);
  });

  it('a failed bootstrap is recoverable and retry recovers', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1')];
    b.failNext = new DataError('offline');
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    expect(c.current).toMatchObject({ kind: 'recoverable-error', error: 'offline' });
    await c.refresh();
    expect(c.current.kind).toBe('ready');
  });

  it('discards a slow result for the previous user', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(other);
    b.delayFor = 'u2';
    b.memberships = [ms('f1')];
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    const first = c.start(); // stuck on u2's membership request
    await new Promise((r) => setTimeout(r, 0));
    b.setUser(me);
    b.delayFor = null;
    await c.refresh(); // u1 resolves first
    expect(c.current.kind === 'ready' && c.current.identity.userId).toBe('u1');
    b.release?.(); // u2's late answer arrives
    await first;
    expect(c.current.kind === 'ready' && c.current.identity.userId).toBe('u1');
  });

  it('clears the previous scope before publishing another user', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1')];
    const calls: string[] = [];
    const c = new SessionController({
      backend,
      onScopeChange: async (p, n) => {
        calls.push(`clear ${p?.userId ?? '-'}→${n?.userId ?? '-'} while state=${c.current.kind}`);
      },
    });
    await c.start();
    await c.signOut();
    expect(b.signOuts).toBe(1);
    expect(c.current).toEqual({ kind: 'signed-out', reason: 'signed-out' });
    // Nothing to clear when leaving bootstrapping; on sign-out the cache is cleared while u1's state is still current.
    expect(calls).toEqual(['clear u1→- while state=ready']);
  });

  // Regression (R3 review): a refresh racing a sign-out made the session ready again.
  it('a refresh during sign-out cannot bring the old session back', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1')];
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    let finish!: () => void;
    b.holdSignOut = new Promise<void>((r) => (finish = r));
    const out = c.signOut();
    // The backend still returns the old identity while it revokes the session.
    const during = [c.refresh(), new Promise<void>((r) => setTimeout(r, 0)).then(() => b.emit({ type: 'token-refreshed', identity: me }))];
    finish();
    await out;
    await Promise.all(during);
    await new Promise((r) => setTimeout(r, 0));
    await c.refresh();
    expect(c.current).toEqual({ kind: 'signed-out', reason: 'signed-out' });
  });

  it('a refresh that started before sign-out and finishes after it is discarded', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1')];
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    b.delayFor = 'u1';
    const stale = c.refresh(); // stuck in listMine with u1's identity
    await new Promise((r) => setTimeout(r, 0));
    await c.signOut();
    b.release?.();
    await stale;
    expect(c.current).toEqual({ kind: 'signed-out', reason: 'signed-out' });
  });

  it('a resolution whose cache clear outlives a sign-out does not publish', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(other);
    b.memberships = [ms('f1')];
    let slowClear: (() => void) | null = null;
    const c = new SessionController({
      backend,
      onScopeChange: async (_p, n) => {
        if (n?.userId === 'u1') await new Promise<void>((r) => (slowClear = r));
      },
    });
    await c.start(); // ready as u2
    b.setUser(me);
    const switching = c.refresh(); // u2 → u1, blocked while clearing u2's cache
    await new Promise((r) => setTimeout(r, 0));
    expect(slowClear).not.toBeNull();
    const out = c.signOut();
    await new Promise((r) => setTimeout(r, 0));
    (slowClear as unknown as () => void)();
    await Promise.all([out, switching]);
    expect(c.current).toEqual({ kind: 'signed-out', reason: 'signed-out' });
  });

  it('a failed sign-out re-reads the session instead of claiming signed-out', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1')];
    backend.identity.signOut = async () => {
      throw new DataError('offline');
    };
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    await expect(c.signOut()).rejects.toMatchObject({ code: 'offline' });
    expect(c.current.kind).toBe('ready');
  });

  it('a session that disappears is reported as expired, not as a sign-out', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1')];
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    b.setUser(null);
    b.emit({ type: 'signed-out' });
    await new Promise((r) => setTimeout(r, 0));
    expect(c.current).toEqual({ kind: 'signed-out', reason: 'session-expired' });
  });

  it('an explicit sign-out keeps its reason when the SIGNED_OUT event re-resolves', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1')];
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    await c.signOut();
    b.emit({ type: 'signed-out' });
    await new Promise((r) => setTimeout(r, 0));
    await c.refresh();
    expect(c.current).toEqual({ kind: 'signed-out', reason: 'signed-out' });
    expect(b.signOuts).toBe(1);
  });

  it('revocation moves the user out of the family with a notice', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1')];
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    b.memberships = [ms('f1', 'revoked')];
    await c.refresh();
    expect(c.current).toMatchObject({ kind: 'authenticated-without-family', notice: 'membership-revoked', choices: [] });
  });

  it('family selection is explicit and stored', async () => {
    const { b, backend } = fakeBackend();
    b.setUser(me);
    b.memberships = [ms('f1'), ms('f2')];
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    expect(c.current.kind).toBe('authenticated-without-family');
    await c.selectFamily('f2');
    expect(c.current.kind === 'ready' && c.current.current.family.id).toBe('f2');
    expect(b.active).toBe('f2');
  });

  it('stop() unsubscribes from identity events', async () => {
    const { b, backend } = fakeBackend();
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    c.stop();
    expect(b.unsubscribed).toBe(1);
  });
});

describe('configuration', () => {
  const pub = 'sb_publishable_abc';
  it('defaults to the labelled demo environment', () => {
    expect(parseConfig({})).toEqual({ ok: true, config: { env: 'demo', backend: 'demo', buildVariant: 'development', supabase: null } });
  });
  it('production never falls back to demo', () => {
    const r = parseConfig({ EXPO_PUBLIC_APP_ENV: 'production' });
    expect(r.ok).toBe(false);
    expect(parseConfig({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'demo' }).ok).toBe(false);
  });
  it('production needs https and a client key', () => {
    expect(parseConfig({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'supabase', EXPO_PUBLIC_SUPABASE_URL: 'http://x.example', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub }).ok).toBe(false);
    expect(parseConfig({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_BACKEND: 'supabase', EXPO_PUBLIC_SUPABASE_URL: 'https://x.example/', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub })).toEqual({
      ok: true,
      config: { env: 'production', backend: 'supabase', buildVariant: 'production', supabase: { url: 'https://x.example', publishableKey: pub } },
    });
  });
  it('refuses privileged keys', () => {
    const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.y`;
    expect(isPrivilegedKey('sb_secret_abc')).toBe(true);
    expect(isPrivilegedKey(jwt('service_role'))).toBe(true);
    expect(isPrivilegedKey(jwt('anon'))).toBe(false);
    expect(isPrivilegedKey(pub)).toBe(false);
    expect(parseConfig({ EXPO_PUBLIC_APP_ENV: 'development', EXPO_PUBLIC_BACKEND: 'supabase', EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_x' }).ok).toBe(false);
  });
  it('the demo environment cannot point at a real backend', () => {
    expect(parseConfig({ EXPO_PUBLIC_APP_ENV: 'demo', EXPO_PUBLIC_BACKEND: 'supabase' }).ok).toBe(false);
  });
});
