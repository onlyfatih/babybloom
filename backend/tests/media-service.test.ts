/**
 * R3: the app's own media path (Supabase provider) against the local stack:
 * reserve → upload → server-verified finalize → signed URL, for the author,
 * another member, a private memory, and after revocation. Every call runs
 * with the user's own session.
 */
import { readFileSync } from 'node:fs';
import { createSupabaseBackend, SIGNED_URL_SECONDS } from '@/data/providers/supabase/supabase-backend';
import type { LocalDate } from '@/domain/dates/local-date';
import { child, cleanup, familyOf, invite, join, newUser, ok, sql, uuid, type TestUser } from './harness';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

afterAll(cleanup);

const jpeg = readFileSync(`${__dirname}/../../assets/fixtures/sea.jpg`);
const photo = () => ({ localId: uuid(), uri: `data:image/jpeg;base64,${jpeg.toString('base64')}`, width: 800, height: 600, byteSize: jpeg.length, mimeType: 'image/jpeg' as const });

async function photoMemory(u: TestUser, familyId: string, childId: string, visibility: 'family' | 'private') {
  const app = createSupabaseBackend(u.client as never);
  const p = photo();
  const [slot] = await app.memories.prepareUploads(familyId, [p]);
  await app.memories.uploadPhoto(slot!, p, () => undefined);
  const memory = await app.memories.finalize(
    { familyId, subject: { kind: 'child', childId }, title: 'Fotoğraflı', body: null, eventDate: '2026-11-01' as LocalDate, visibility, mediaIds: [slot!.mediaId] },
    { clientRequestId: uuid() },
  );
  return { memory, mediaId: slot!.mediaId };
}

describe('media service through the app provider', () => {
  let a: TestUser;
  let b: TestUser;
  let familyId: string;
  let childId: string;

  beforeAll(async () => {
    a = await newUser('media-a');
    b = await newUser('media-b');
    familyId = await familyOf(a);
    childId = await child(a, familyId);
    await join(b, await invite(a, familyId));
  });

  it('uploads, verifies on the server, and serves a short-lived signed URL to members', async () => {
    const { mediaId } = await photoMemory(a, familyId, childId, 'family');
    const [row] = await sql<{ status: string; byte_size: number }>(`select status, byte_size from public.media_assets where id = $1`, [mediaId]);
    expect(row).toEqual({ status: 'ready', byte_size: jpeg.length }); // size from the stored object, not the client

    const before = Date.now();
    const forA = await createSupabaseBackend(a.client as never).memories.resolveMedia(mediaId);
    expect(forA).not.toBeNull();
    expect(forA!.expiresAt! - before).toBeLessThanOrEqual(SIGNED_URL_SECONDS * 1000 + 1000);
    const res = await fetch(String(forA!.uri));
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(jpeg)).toBe(true);

    const forB = await createSupabaseBackend(b.client as never).memories.resolveMedia(mediaId);
    expect(forB).not.toBeNull();
  });

  it('a private memory photo resolves for its author only', async () => {
    const { mediaId } = await photoMemory(a, familyId, childId, 'private');
    expect(await createSupabaseBackend(a.client as never).memories.resolveMedia(mediaId)).not.toBeNull();
    expect(await createSupabaseBackend(b.client as never).memories.resolveMedia(mediaId)).toBeNull();
    // Not even through Storage directly, with a guessed path.
    const [{ storage_key }] = await sql<{ storage_key: string }>(`select storage_key from public.media_assets where id = $1`, [mediaId]);
    const direct = await b.client.storage.from('family-media').createSignedUrl(storage_key, 60);
    expect(direct.data).toBeNull();
  });

  it('a missing or unknown id resolves to null (same answer as "not allowed")', async () => {
    expect(await createSupabaseBackend(a.client as never).memories.resolveMedia(uuid())).toBeNull();
  });

  it('a child created with a profile photo: verified upload, visible to every member', async () => {
    const app = createSupabaseBackend(a.client as never);
    const requestId = uuid();
    const input = { familyId, name: 'Fotoğraflı Bebek', birthDate: '2026-09-01' as LocalDate, birthTime: null, originPregnancyId: null, avatar: photo(), birthMeasurements: [] };
    const c = await app.profiles.createChild(input, { requestId });
    expect(c.avatarMediaId).toBeTruthy();
    // Retried create: same child, no second avatar.
    const again = await app.profiles.createChild(input, { requestId });
    expect(again).toMatchObject({ id: c.id, avatarMediaId: c.avatarMediaId });
    const [{ n }] = await sql<{ n: string }>(`select count(*) as n from public.media_assets where family_id = $1 and purpose = 'avatar'`, [familyId]);
    expect(Number(n)).toBe(1);
    expect(await createSupabaseBackend(b.client as never).memories.resolveMedia(c.avatarMediaId!)).not.toBeNull();
  });

  it('a revoked member gets no new URLs', async () => {
    const { mediaId } = await photoMemory(a, familyId, childId, 'family');
    expect(await createSupabaseBackend(b.client as never).memories.resolveMedia(mediaId)).not.toBeNull();
    const [{ id: membershipId }] = await sql<{ id: string }>(`select id from public.family_memberships where family_id = $1 and user_id = $2`, [familyId, b.id]);
    await ok(a.client.rpc('revoke_member', { p_membership_id: membershipId }));
    expect(await createSupabaseBackend(b.client as never).memories.resolveMedia(mediaId)).toBeNull();
  });
});
