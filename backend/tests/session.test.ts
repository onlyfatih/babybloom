/**
 * R1: the app's own session code (createSupabaseSessionBackend +
 * SessionController) against the local stack, signing in with real email
 * codes captured by the local mail catcher (Mailpit).
 */
import { randomUUID } from 'node:crypto';
import { createSupabaseSessionBackend } from '@/data/providers/supabase/session-backend';
import { SessionController } from '@/data/session/session-controller';
import type { SessionState } from '@/data/session/session-state';
import { appClient, latestCode, messageIds, signInWithCode } from './app-client';
import { child, cleanup, familyOf, invite, newUser, ok, sql } from './harness';

const created: string[] = [];
afterAll(async () => {
  await cleanup(); // harness users' families first (they hold invitations our users accepted)
  if (created.length) {
    await sql(`delete from public.families where created_by in (select id from auth.users where email = any($1))`, [created]);
    await sql(`delete from auth.users where email = any($1)`, [created]);
  }
});
const email = (label: string) => {
  const e = `${label}-${randomUUID().slice(0, 8)}@example.test`;
  created.push(e);
  return e;
};

describe('email code sign-in', () => {
  it('a wrong code is rejected without creating a session', async () => {
    const e = email('wrong');
    const { client } = appClient();
    const backend = createSupabaseSessionBackend(client);
    await backend.identity.requestEmailCode(e);
    await latestCode(e);
    await expect(backend.identity.verifyEmailCode(e, '000000')).rejects.toMatchObject({ code: 'validation', message: 'invalid-code' });
    expect(await backend.identity.current()).toBeNull();
  });

  it('new user → no family → family without profile → ready; survives relaunch; sign-out keeps data', async () => {
    const e = email('flow');
    const { backend, device } = await signInWithCode(e);
    const states: SessionState['kind'][] = [];
    let cleared = 0;
    const controller = new SessionController({ backend, onScopeChange: () => void (cleared += 1) });
    controller.subscribe((s) => states.push(s.kind));
    await controller.start();
    expect(controller.current.kind).toBe('authenticated-without-family');

    const familyId = await backend.memberships.createFamily({ familyName: 'Kurgu Aile', displayName: 'Kurgu Ebeveyn', relationshipLabel: 'Anne' });
    await controller.refresh();
    expect(controller.current.kind).toBe('authenticated-with-family-without-profile');

    const uid = controller.current.kind === 'authenticated-with-family-without-profile' ? controller.current.identity.userId : '';
    await ok(device.client.from('children').insert({ family_id: familyId, name: 'Kurgu Bebek', birth_date: '2026-06-01', created_by: uid }));
    await controller.refresh();
    expect(controller.current.kind).toBe('ready');
    controller.stop();

    // Relaunch: a new client on the same device storage restores the session.
    const relaunched = appClient(device.storage);
    const backend2 = createSupabaseSessionBackend(relaunched.client);
    const c2 = new SessionController({ backend: backend2, onScopeChange: () => undefined });
    await c2.start();
    expect(c2.current.kind).toBe('ready');

    await c2.signOut();
    expect(c2.current).toEqual({ kind: 'signed-out', reason: 'signed-out' });
    expect(await sql(`select 1 from children where family_id = $1`, [familyId])).toHaveLength(1);
    c2.stop();

    // Signing in again finds the same family and child.
    const again = await signInWithCode(e);
    const c3 = new SessionController({ backend: again.backend, onScopeChange: () => undefined });
    await c3.start();
    expect(c3.current.kind === 'ready' && c3.current.current.family.id).toBe(familyId);
    c3.stop();
    expect(states[0]).toBe('authenticated-without-family');
    expect(cleared).toBeGreaterThan(0);
  });

  it('sign-out on one device leaves the other device signed in', async () => {
    const e = email('two-devices');
    const phone = await signInWithCode(e);
    const tablet = await signInWithCode(e);
    await phone.backend.identity.signOut();
    expect(await phone.backend.identity.current()).toBeNull();
    expect(await tablet.backend.identity.current()).not.toBeNull();
  });
});

describe('membership changes seen by the controller', () => {
  it('revocation moves the member out with a notice; joining selects the family', async () => {
    const owner = await newUser('owner');
    const familyId = await familyOf(owner, 'Kurgu Paylaşım');
    await child(owner, familyId);
    const token = await invite(owner, familyId);

    const e = email('member');
    const { backend } = await signInWithCode(e);
    const c = new SessionController({ backend, onScopeChange: () => undefined });
    await c.start();
    expect(c.current.kind).toBe('authenticated-without-family');
    expect(await backend.invitations.accept(token, 'Kurgu Teyze')).toEqual({ result: 'joined', familyId });
    await c.refresh();
    expect(c.current.kind === 'ready' && c.current.current.family.id).toBe(familyId);

    const memberId = (await sql<{ id: string }>(`select m.id from family_memberships m join auth.users u on u.id = m.user_id where u.email = $1`, [e]))[0]!.id;
    await ok(owner.client.rpc('revoke_member', { p_membership_id: memberId }));
    await c.refresh();
    expect(c.current).toMatchObject({ kind: 'authenticated-without-family', notice: 'membership-revoked' });
    await expect(backend.invitations.accept(token, 'Kurgu Teyze')).rejects.toMatchObject({ code: 'invalid-invitation' });
    c.stop();
  });
});
