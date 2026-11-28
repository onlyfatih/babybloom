/**
 * Private media: reservation, upload, server-side verification at finalize,
 * signed-URL access by visibility and membership, and deletion queueing.
 */
import { readFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { child, cleanup, failure, familyOf, invite, join, newUser, ok, sql, TestUser, uuid } from './harness';

const photo = readFileSync(joinPath(__dirname, '../../assets/fixtures/sea.jpg'));
const BUCKET = 'family-media';

let A: TestUser;
let B: TestUser;
let C: TestUser;
let F: string;
let kid: string;

async function reserve(u: TestUser, fam: string, purpose: 'memory' | 'avatar' = 'memory') {
  const rows = await ok(u.client.rpc('reserve_media_upload', { p_family_id: fam, p_purpose: purpose, p_mime_type: 'image/jpeg', p_byte_size: photo.length, p_width: 100, p_height: 100 }));
  return (rows as { media_id: string; storage_key: string }[])[0]!;
}
async function upload(u: TestUser, key: string, type = 'image/jpeg') {
  return u.client.storage.from(BUCKET).upload(key, photo, { contentType: type, upsert: false });
}
function finalize(u: TestUser, mediaIds: string[], visibility: 'family' | 'private' = 'family', key = uuid()) {
  return u.client.rpc('finalize_memory', {
    p_family_id: F, p_memory_id: null, p_client_request_id: key, p_pregnancy_id: null, p_child_id: kid,
    p_title: 'Fotoğraflı', p_body: null, p_event_date: '2026-11-01', p_visibility: visibility, p_media_ids: mediaIds, p_expected_version: null,
  });
}
const signed = (u: TestUser, key: string) => u.client.storage.from(BUCKET).createSignedUrl(key, 60);

beforeAll(async () => {
  [A, B, C] = await Promise.all([newUser('sa'), newUser('sb'), newUser('sc')]);
  F = await familyOf(A, 'Kurgu Medya');
  await familyOf(C, 'Kurgu Başka');
  kid = await child(A, F);
  await join(B, await invite(A, F));
});
afterAll(cleanup);

describe('upload slot', () => {
  it('only the reserving user can upload into it; nothing outside a slot', async () => {
    const slot = await reserve(A, F);
    expect((await upload(B, slot.storage_key)).error).not.toBeNull();
    expect((await upload(C, slot.storage_key)).error).not.toBeNull();
    expect((await upload(A, `${F}/${uuid()}.jpg`)).error).not.toBeNull();
    expect((await upload(A, slot.storage_key)).error).toBeNull();
    // No overwrite of an uploaded object.
    expect((await A.client.storage.from(BUCKET).upload(slot.storage_key, photo, { contentType: 'image/jpeg', upsert: true })).error).not.toBeNull();
  });
  it('the bucket refuses types outside the allow-list', async () => {
    const slot = await reserve(A, F);
    expect((await upload(A, slot.storage_key, 'image/gif')).error).not.toBeNull();
  });
  it('another family cannot reserve slots here', async () => {
    expect(await failure(C.client.rpc('reserve_media_upload', { p_family_id: F, p_purpose: 'memory', p_mime_type: 'image/jpeg', p_byte_size: 10, p_width: 1, p_height: 1 }))).toBe('forbidden');
  });
});

describe('finalize verifies the stored object', () => {
  it('refuses a photo that was never uploaded', async () => {
    const slot = await reserve(A, F);
    expect(await failure(finalize(A, [slot.media_id]))).toBe('upload-failed');
    const st = await sql<{ status: string }>(`select status from media_assets where id = $1`, [slot.media_id]);
    expect(st[0]!.status).toBe('pending');
  });
  it('refuses someone else’s upload and records the real object size', async () => {
    const slot = await reserve(B, F);
    expect((await upload(B, slot.storage_key)).error).toBeNull();
    expect(await failure(finalize(A, [slot.media_id]))).toBe('validation');
    await sql(`update media_assets set byte_size = 1 where id = $1`, [slot.media_id]); // a lying client declaration
    await ok(finalize(B, [slot.media_id]));
    const row = await sql<{ status: string; byte_size: number }>(`select status, byte_size from media_assets where id = $1`, [slot.media_id]);
    expect(row[0]).toEqual({ status: 'ready', byte_size: photo.length });
  });
});

describe('reading media', () => {
  it('family memory photo: members get a signed URL, other families do not', async () => {
    const slot = await reserve(A, F);
    await upload(A, slot.storage_key);
    await ok(finalize(A, [slot.media_id], 'family'));
    expect((await signed(A, slot.storage_key)).error).toBeNull();
    const b = await signed(B, slot.storage_key);
    expect(b.error).toBeNull();
    const res = await fetch(b.data!.signedUrl);
    expect(res.status).toBe(200);
    expect((await signed(C, slot.storage_key)).error).not.toBeNull();
    expect((await C.client.storage.from(BUCKET).download(slot.storage_key)).error).not.toBeNull();
  });
  it('private memory photo: only the author, never the owner or other adults', async () => {
    const slot = await reserve(B, F);
    await upload(B, slot.storage_key);
    await ok(finalize(B, [slot.media_id], 'private'));
    expect((await signed(B, slot.storage_key)).error).toBeNull();
    expect((await signed(A, slot.storage_key)).error).not.toBeNull();
    expect((await A.client.storage.from(BUCKET).download(slot.storage_key)).error).not.toBeNull();
    expect(await ok(A.client.from('media_assets').select('id').eq('id', slot.media_id))).toHaveLength(0);
  });
  it('a photo cannot be attached to a second (wider) memory', async () => {
    const slot = await reserve(B, F);
    await upload(B, slot.storage_key);
    await ok(finalize(B, [slot.media_id], 'private'));
    expect(await failure(finalize(B, [slot.media_id], 'family'))).toMatch(/duplicate key|memory_media_media_id_key/);
    expect((await signed(A, slot.storage_key)).error).not.toBeNull();
  });
  it('a revoked member cannot obtain new URLs', async () => {
    const R = await newUser('sr');
    await join(R, await invite(A, F));
    const slot = await reserve(A, F);
    await upload(A, slot.storage_key);
    await ok(finalize(A, [slot.media_id], 'family'));
    expect((await signed(R, slot.storage_key)).error).toBeNull();
    const m = (await ok(A.client.from('family_memberships').select('id').eq('user_id', R.id).single())) as { id: string };
    await ok(A.client.rpc('revoke_member', { p_membership_id: m.id }));
    expect((await signed(R, slot.storage_key)).error).not.toBeNull();
  });
  it('profile photos are visible to members and replaced atomically', async () => {
    const first = await reserve(A, F, 'avatar');
    await upload(A, first.storage_key);
    await ok(A.client.rpc('set_child_avatar', { p_child_id: kid, p_media_id: first.media_id }));
    expect((await signed(B, first.storage_key)).error).toBeNull();
    const second = await reserve(B, F, 'avatar');
    await upload(B, second.storage_key);
    await ok(B.client.rpc('set_child_avatar', { p_child_id: kid, p_media_id: second.media_id }));
    expect(await sql(`select 1 from media_assets where id = $1`, [first.media_id])).toHaveLength(0);
    expect(await sql(`select 1 from app.storage_deletions where object_path = $1 and done_at is null`, [first.storage_key])).toHaveLength(1);
    // A memory photo slot cannot be used as an avatar.
    const mem = await reserve(A, F, 'memory');
    await upload(A, mem.storage_key);
    expect(await failure(A.client.rpc('set_child_avatar', { p_child_id: kid, p_media_id: mem.media_id }))).toBe('validation');
  });
});

describe('deletion', () => {
  it('deleting a memory deletes its media rows and queues the objects (not yet physically deleted)', async () => {
    const slot = await reserve(A, F);
    await upload(A, slot.storage_key);
    const memory = await ok(finalize(A, [slot.media_id], 'family'));
    expect(await ok(A.client.from('memories').delete().eq('id', memory).select('id'))).toHaveLength(1);
    expect(await sql(`select 1 from media_assets where id = $1`, [slot.media_id])).toHaveLength(0);
    expect(await sql(`select 1 from app.storage_deletions where object_path = $1`, [slot.storage_key])).toHaveLength(1);
    expect(await sql(`select 1 from storage.objects where name = $1`, [slot.storage_key])).toHaveLength(1);
    expect((await signed(A, slot.storage_key)).error).not.toBeNull();
  });
  it('removing a photo in an edit queues just that object', async () => {
    const s1 = await reserve(A, F);
    const s2 = await reserve(A, F);
    await upload(A, s1.storage_key);
    await upload(A, s2.storage_key);
    const memory = (await ok(finalize(A, [s1.media_id, s2.media_id]))) as string;
    await ok(A.client.rpc('finalize_memory', {
      p_family_id: F, p_memory_id: memory, p_client_request_id: uuid(), p_pregnancy_id: null, p_child_id: kid,
      p_title: 'Tek fotoğraf', p_body: null, p_event_date: '2026-11-01', p_visibility: 'family', p_media_ids: [s2.media_id], p_expected_version: 1,
    }));
    expect(await sql(`select media_id, position from memory_media where memory_id = $1`, [memory])).toEqual([{ media_id: s2.media_id, position: 0 }]);
    expect(await sql(`select 1 from app.storage_deletions where object_path = $1`, [s1.storage_key])).toHaveLength(1);
  });
});
