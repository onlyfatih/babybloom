/**
 * R1 exit gate: identity and negative-access checks against the real local
 * database, PostgREST and Storage. Every assertion runs as a signed-in test
 * user (or anonymously); the admin key is used only in harness setup.
 */
import { createHmac } from 'node:crypto';
import { anonClient, child, cleanup, failure, familyOf, invite, join, newUser, ok, sql, textMemory, TestUser, uuid } from './harness';

let A: TestUser; // owner of family F
let B: TestUser; // invited adult in F
let C: TestUser; // owner of an unrelated family G
let F: string;
let G: string;
let kid: string;

beforeAll(async () => {
  [A, B, C] = await Promise.all([newUser('a'), newUser('b'), newUser('c')]);
  F = await familyOf(A, 'Kurgu Yıldız');
  G = await familyOf(C, 'Kurgu Deniz');
  kid = await child(A, F);
  const joined = await join(B, await invite(A, F));
  expect(joined).toEqual({ result: 'joined', family_id: F });
});
afterAll(cleanup);

describe('unauthenticated requests', () => {
  it('read nothing and cannot call RPCs', async () => {
    const anon = anonClient();
    const fams = await anon.from('families').select('id');
    expect(fams.data ?? []).toHaveLength(0);
    const mems = await anon.from('memories').select('id');
    expect(mems.data ?? []).toHaveLength(0);
    expect(await failure(anon.rpc('create_family', { p_family_name: 'x', p_display_name: 'x', p_relationship_label: 'x' }))).not.toBe('no-error');
  });
});

describe('another family', () => {
  it('is invisible', async () => {
    expect(await ok(C.client.from('families').select('id').eq('id', F))).toHaveLength(0);
    expect(await ok(C.client.from('children').select('id').eq('family_id', F))).toHaveLength(0);
    expect(await ok(C.client.from('family_memberships').select('id').eq('family_id', F))).toHaveLength(0);
  });
  it('cannot be written into with a forged family id', async () => {
    expect(await failure(C.client.from('children').insert({ family_id: F, name: 'Sızma', birth_date: '2026-01-01', created_by: C.id }))).toMatch(/row-level security/);
    expect(await failure(C.client.from('appointments').insert({ family_id: F, title: 'x', start_date: '2026-12-01', start_time: '10:00', time_zone: 'Europe/Istanbul', author_id: C.id }))).toMatch(/row-level security/);
  });
  it('cannot link a record to a profile of another family (composite keys)', async () => {
    const msg = await failure(C.client.from('appointments').insert({ family_id: G, child_id: kid, title: 'x', start_date: '2026-12-01', start_time: '10:00', time_zone: 'Europe/Istanbul', author_id: C.id }));
    expect(msg).toMatch(/foreign key|row-level security/);
    expect(await failure(C.client.rpc('finalize_memory', {
      p_family_id: G, p_memory_id: null, p_client_request_id: uuid(), p_pregnancy_id: null, p_child_id: kid,
      p_title: 'x', p_body: null, p_event_date: '2026-11-01', p_visibility: 'family', p_media_ids: [], p_expected_version: null,
    }))).toMatch(/foreign key/);
  });
  it('cannot accept itself into a family by calling membership tables directly', async () => {
    expect(await failure(C.client.from('family_memberships').insert({ family_id: F, user_id: C.id, role: 'owner', relationship_label: 'x', display_name: 'x' }))).toMatch(/row-level security|permission/);
  });
});

describe('forged authorship and immutable fields', () => {
  it('rejects records authored as someone else', async () => {
    expect(await failure(B.client.from('appointments').insert({ family_id: F, title: 'x', start_date: '2026-12-01', start_time: '10:00', time_zone: 'Europe/Istanbul', author_id: A.id }))).toMatch(/row-level security/);
    expect(await failure(B.client.from('growth_measurements').insert({ family_id: F, child_id: kid, kind: 'weight', canonical_value: 4000, entered_unit: 'kg', measured_on: '2026-07-01', author_id: A.id }))).toMatch(/row-level security/);
  });
  it('does not let an author reassign author or family', async () => {
    const row = await ok(B.client.from('appointments').insert({ family_id: F, title: 'Kontrol', start_date: '2026-12-01', start_time: '10:00', time_zone: 'Europe/Istanbul', author_id: B.id }).select('id').single());
    const id = (row as { id: string }).id;
    expect(await failure(B.client.from('appointments').update({ author_id: A.id }).eq('id', id))).toMatch(/read-only|row-level security/);
    expect(await failure(B.client.from('appointments').update({ family_id: G }).eq('id', id))).toMatch(/read-only|row-level security/);
  });
  it('blocks client-side birth and role changes', async () => {
    const preg = await ok(A.client.from('pregnancies').insert({ family_id: F, clinician_due_date: '2027-03-01', created_by: A.id }).select('id').single());
    expect(await failure(A.client.from('pregnancies').update({ status: 'born' }).eq('id', (preg as { id: string }).id))).toMatch(/record_birth|read-only/);
    const mine = await ok(B.client.from('family_memberships').update({ role: 'owner' }).eq('user_id', B.id).select('id'));
    expect(mine).toHaveLength(0); // no update policy: nothing changes
    expect((await sql<{ role: string }>(`select role from family_memberships where user_id = $1`, [B.id]))[0]!.role).toBe('adult');
  });
  it('rejects client-inserted birth measurements', async () => {
    expect(await failure(B.client.from('growth_measurements').insert({ family_id: F, child_id: kid, kind: 'weight', canonical_value: 3300, entered_unit: 'kg', measured_on: '2026-06-01', author_id: B.id, is_birth_measurement: true }))).toMatch(/row-level security/);
  });
});

describe('private records', () => {
  it('a private memory is invisible to every other member, including the owner', async () => {
    const bPrivate = await textMemory(B, F, kid, 'private', 'B gizli');
    const aPrivate = await textMemory(A, F, kid, 'private', 'A gizli');
    const shared = await textMemory(A, F, kid, 'family', 'Ortak');
    const seenByA = (await ok(A.client.from('memories').select('id').eq('family_id', F))) as { id: string }[];
    const seenByB = (await ok(B.client.from('memories').select('id').eq('family_id', F))) as { id: string }[];
    expect(seenByA.map((r) => r.id)).toEqual(expect.arrayContaining([aPrivate, shared]));
    expect(seenByA.map((r) => r.id)).not.toContain(bPrivate);
    expect(seenByB.map((r) => r.id)).toEqual(expect.arrayContaining([bPrivate, shared]));
    expect(seenByB.map((r) => r.id)).not.toContain(aPrivate);
    // Direct id lookup returns nothing, and the owner cannot delete it either.
    expect(await ok(A.client.from('memories').select('id').eq('id', bPrivate))).toHaveLength(0);
    expect(await ok(A.client.from('memories').delete().eq('id', bPrivate).select('id'))).toHaveLength(0);
    // Editing someone else's private memory through the RPC reveals nothing.
    expect(await failure(A.client.rpc('finalize_memory', {
      p_family_id: F, p_memory_id: bPrivate, p_client_request_id: uuid(), p_pregnancy_id: null, p_child_id: kid,
      p_title: 'x', p_body: null, p_event_date: '2026-11-01', p_visibility: 'family', p_media_ids: [], p_expected_version: 1,
    }))).toBe('not-found');
  });
  it('family records: other adult cannot edit or delete; owner may delete', async () => {
    const bShared = await textMemory(B, F, kid, 'family', 'B ortak');
    const aShared = await textMemory(A, F, kid, 'family', 'A ortak');
    expect(await failure(B.client.rpc('finalize_memory', {
      p_family_id: F, p_memory_id: aShared, p_client_request_id: uuid(), p_pregnancy_id: null, p_child_id: kid,
      p_title: 'değişti', p_body: null, p_event_date: '2026-11-01', p_visibility: 'family', p_media_ids: [], p_expected_version: 1,
    }))).toBe('forbidden');
    expect(await ok(B.client.from('memories').delete().eq('id', aShared).select('id'))).toHaveLength(0);
    expect(await ok(A.client.from('memories').delete().eq('id', bShared).select('id'))).toHaveLength(1);
  });
});

describe('memory finalize', () => {
  it('is idempotent per client request id and detects edit conflicts', async () => {
    const key = uuid();
    const args = { p_family_id: F, p_memory_id: null, p_client_request_id: key, p_pregnancy_id: null, p_child_id: kid, p_title: 'Bir kez', p_body: null, p_event_date: '2026-11-02', p_visibility: 'family', p_media_ids: [], p_expected_version: null };
    const [m1, m2] = await Promise.all([ok(A.client.rpc('finalize_memory', args)), ok(A.client.rpc('finalize_memory', args))]);
    expect(m1).toBe(m2);
    expect((await sql(`select id from memories where client_request_id = $1`, [key])).length).toBe(1);
    const edit = (v: number, k = uuid()) => A.client.rpc('finalize_memory', { ...args, p_memory_id: m1, p_client_request_id: k, p_title: `v${v}`, p_expected_version: v });
    const k1 = uuid();
    expect(await ok(edit(1, k1))).toBe(m1);
    expect(await ok(edit(1, k1))).toBe(m1); // retry of the same edit
    expect(await failure(edit(1))).toBe('conflict'); // stale version from another device
  });
  it('refuses empty memories and future dates', async () => {
    const base = { p_family_id: F, p_memory_id: null, p_pregnancy_id: null, p_child_id: kid, p_visibility: 'family', p_media_ids: [], p_expected_version: null };
    expect(await failure(A.client.rpc('finalize_memory', { ...base, p_client_request_id: uuid(), p_title: '  ', p_body: null, p_event_date: '2026-11-01' }))).toBe('validation');
    expect(await failure(A.client.rpc('finalize_memory', { ...base, p_client_request_id: uuid(), p_title: 'x', p_body: null, p_event_date: '2099-01-01' }))).toBe('validation');
  });
});

describe('invitations', () => {
  it('cannot be reused, and concurrent acceptance admits exactly one person', async () => {
    const token = await invite(A, F);
    const [x, y] = await Promise.all([newUser('x'), newUser('y')]);
    const results = await Promise.all([join(x, token), join(y, token)]);
    expect(results.map((r) => r.result).sort()).toEqual(['invalid-invitation', 'joined']);
    const z = await newUser('z');
    expect((await join(z, token)).result).toBe('invalid-invitation');
  });
  it('expired and revoked invitations do not work', async () => {
    const expired = await invite(A, F);
    await sql(`update family_invitations set created_at = now() - interval '3 days', expires_at = now() - interval '1 hour' where status = 'pending' and family_id = $1`, [F]);
    const u = await newUser('late');
    expect((await join(u, expired)).result).toBe('invalid-invitation');
    const token = await invite(A, F);
    const rows = (await ok(A.client.from('family_invitations').select('id').eq('family_id', F).eq('status', 'pending'))) as { id: string }[];
    for (const r of rows) await ok(A.client.rpc('revoke_invitation', { p_invitation_id: r.id }));
    expect((await join(u, token)).result).toBe('invalid-invitation');
  });
  it('only owners create invitations; the role is always adult; the hash is not readable', async () => {
    expect(await failure(B.client.rpc('create_invitation', { p_family_id: F, p_relationship_label: 'x' }))).toBe('forbidden');
    expect(await failure(A.client.from('family_invitations').select('token_hash').eq('family_id', F))).toMatch(/permission denied/);
    expect(await failure(A.client.from('family_invitations').insert({ family_id: F, invited_by: A.id, role: 'owner', relationship_label: 'x', token_hash: '\\x00', expires_at: '2099-01-01' }))).toMatch(/row-level security|permission/);
  });
  it('an existing member does not consume an invitation', async () => {
    const token = await invite(A, F);
    expect((await join(B, token)).result).toBe('already-member');
    const n = await newUser('n');
    expect((await join(n, token)).result).toBe('joined');
  });
  it('wrong guesses are bounded per user', async () => {
    const g = await newUser('guess');
    const results: string[] = [];
    for (let i = 0; i < 11; i++) results.push((await join(g, `WRONG-${i}`)).result);
    expect(results.slice(0, 10).every((r) => r === 'invalid-invitation')).toBe(true);
    expect(results[10]).toBe('rate-limited');
  });
});

describe('membership revocation and owners', () => {
  it('a revoked member loses all server access', async () => {
    const R = await newUser('revoked');
    await join(R, await invite(A, F));
    const memory = await textMemory(A, F, kid, 'family', 'Önce görünür');
    expect(await ok(R.client.from('memories').select('id').eq('id', memory))).toHaveLength(1);
    const m = (await ok(A.client.from('family_memberships').select('id').eq('user_id', R.id).single())) as { id: string };
    await ok(A.client.rpc('revoke_member', { p_membership_id: m.id }));
    expect(await ok(R.client.from('memories').select('id').eq('family_id', F))).toHaveLength(0);
    expect(await ok(R.client.from('children').select('id').eq('family_id', F))).toHaveLength(0);
    expect(await failure(R.client.from('appointments').insert({ family_id: F, title: 'x', start_date: '2026-12-01', start_time: '10:00', time_zone: 'Europe/Istanbul', author_id: R.id }))).toMatch(/row-level security/);
    expect(await failure(R.client.rpc('reserve_media_upload', { p_family_id: F, p_purpose: 'memory', p_mime_type: 'image/jpeg', p_byte_size: 10, p_width: 1, p_height: 1 }))).toBe('membership-revoked');
    expect(await failure(R.client.rpc('finalize_memory', {
      p_family_id: F, p_memory_id: null, p_client_request_id: uuid(), p_pregnancy_id: null, p_child_id: kid,
      p_title: 'x', p_body: null, p_event_date: '2026-11-01', p_visibility: 'family', p_media_ids: [], p_expected_version: null,
    }))).toBe('membership-revoked');
  });
  it('the last owner can neither be removed nor leave; adults cannot revoke', async () => {
    const mine = (await ok(A.client.from('family_memberships').select('id').eq('user_id', A.id).eq('family_id', F).single())) as { id: string };
    expect(await failure(A.client.rpc('leave_family', { p_family_id: F }))).toBe('last-owner');
    expect(await failure(A.client.rpc('revoke_member', { p_membership_id: mine.id }))).toBe('validation');
    expect(await failure(B.client.rpc('revoke_member', { p_membership_id: mine.id }))).toBe('forbidden');
  });
  it('ownership transfer swaps roles atomically', async () => {
    const T = await newUser('transfer');
    const fam = await familyOf(T, 'Kurgu Transfer');
    const U = await newUser('heir');
    await join(U, await invite(T, fam));
    const um = (await ok(T.client.from('family_memberships').select('id').eq('user_id', U.id).single())) as { id: string };
    await ok(T.client.rpc('transfer_ownership', { p_family_id: fam, p_to_membership_id: um.id }));
    const roles = await sql<{ user_id: string; role: string }>(`select user_id, role from family_memberships where family_id = $1`, [fam]);
    expect(roles.find((r) => r.user_id === U.id)!.role).toBe('owner');
    expect(roles.find((r) => r.user_id === T.id)!.role).toBe('adult');
    await ok(T.client.rpc('leave_family', { p_family_id: fam })); // no longer the last owner
  });
});

describe('record birth', () => {
  it('is atomic, idempotent per request, and keeps pregnancy memories', async () => {
    const preg = (await ok(A.client.from('pregnancies').insert({ family_id: F, clinician_due_date: '2026-12-20', created_by: A.id }).select('id').single())) as { id: string };
    const pm = await ok(A.client.rpc('finalize_memory', {
      p_family_id: F, p_memory_id: null, p_client_request_id: uuid(), p_pregnancy_id: preg.id, p_child_id: null,
      p_title: 'İlk tekme', p_body: null, p_event_date: '2026-10-01', p_visibility: 'family', p_media_ids: [], p_expected_version: null,
    }));
    const req = uuid();
    const kids = [
      { name: 'Kurgu İkiz 1', birth_date: '2026-11-20', measurements: [{ kind: 'weight', canonical_value: 2600, entered_unit: 'kg' }] },
      { name: 'Kurgu İkiz 2', birth_date: '2026-11-20', measurements: [] },
    ];
    const [r1, r2] = await Promise.all([
      ok(A.client.rpc('record_birth', { p_pregnancy_id: preg.id, p_children: kids, p_request_id: req })),
      ok(B.client.rpc('record_birth', { p_pregnancy_id: preg.id, p_children: kids, p_request_id: req })),
    ]);
    expect((r1 as string[]).length).toBe(2);
    expect([...(r1 as string[])].sort()).toEqual([...(r2 as string[])].sort());
    expect(await failure(A.client.rpc('record_birth', { p_pregnancy_id: preg.id, p_children: kids, p_request_id: uuid() }))).toBe('already-born');
    const state = await sql<{ status: string }>(`select status from pregnancies where id = $1`, [preg.id]);
    expect(state[0]!.status).toBe('born');
    expect(await ok(A.client.from('memories').select('id').eq('id', pm))).toHaveLength(1);
    expect((await sql(`select id from growth_measurements where is_birth_measurement and child_id = any($1::uuid[])`, [r1])).length).toBe(1);
  });
});

describe('measurements', () => {
  it('author corrects; other adult cannot; owner may delete', async () => {
    const row = (await ok(B.client.from('growth_measurements').insert({ family_id: F, child_id: kid, kind: 'weight', canonical_value: 5000, entered_unit: 'kg', measured_on: '2026-08-01', author_id: B.id }).select('id').single())) as { id: string };
    expect(await ok(A.client.from('growth_measurements').update({ canonical_value: 1 }).eq('id', row.id).select('id'))).toHaveLength(0);
    expect(await ok(B.client.from('growth_measurements').update({ canonical_value: 5100, note: 'düzeltme' }).eq('id', row.id).select('canonical_value'))).toEqual([{ canonical_value: 5100 }]);
    expect(await failure(B.client.from('growth_measurements').update({ child_id: kid, is_birth_measurement: true }).eq('id', row.id))).toMatch(/read-only/);
    expect(await ok(A.client.from('growth_measurements').delete().eq('id', row.id).select('id'))).toHaveLength(1);
  });
});

describe('expired session token', () => {
  it('is rejected by the API', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const head = b64({ alg: 'HS256', typ: 'JWT' });
    const body = b64({ sub: A.id, role: 'authenticated', aud: 'authenticated', iat: now - 7200, exp: now - 3600 });
    const sig = createHmac('sha256', process.env.JWT_SECRET!).update(`${head}.${body}`).digest('base64url');
    const res = await fetch(`${process.env.API_URL}/rest/v1/families?select=id`, {
      headers: { apikey: process.env.PUBLISHABLE_KEY!, Authorization: `Bearer ${head}.${body}.${sig}` },
    });
    expect(res.status).toBe(401);
    // Control: the same token with a valid expiry is accepted, so the 401 is about expiry.
    const fresh = b64({ sub: A.id, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 600 });
    const sig2 = createHmac('sha256', process.env.JWT_SECRET!).update(`${head}.${fresh}`).digest('base64url');
    const ok2 = await fetch(`${process.env.API_URL}/rest/v1/families?select=id`, {
      headers: { apikey: process.env.PUBLISHABLE_KEY!, Authorization: `Bearer ${head}.${fresh}.${sig2}` },
    });
    expect(ok2.status).toBe(200);
  });
});
