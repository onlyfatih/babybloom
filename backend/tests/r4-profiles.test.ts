/**
 * R4: profiles, measurements and appointments through the app's Supabase
 * provider, each call with the user's own session. The admin connection is
 * used only to observe server-side effects (deletion queue), never to grant
 * or prove access.
 */
import { readFileSync } from 'node:fs';
import { createSupabaseBackend } from '@/data/providers/supabase/supabase-backend';
import type { LocalDate } from '@/domain/dates/local-date';
import type { LocalTime } from '@/domain/dates/zoned-date-time';
import { child, cleanup, familyOf, invite, join, newUser, sql, uuid, type TestUser } from './harness';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

afterAll(cleanup);

const jpeg = readFileSync(`${__dirname}/../../assets/fixtures/sea.jpg`);
const photo = () => ({ localId: uuid(), uri: `data:image/jpeg;base64,${jpeg.toString('base64')}`, width: 800, height: 600, byteSize: jpeg.length, mimeType: 'image/jpeg' as const });
const app = (u: TestUser) => createSupabaseBackend(u.client as never);
const d = (s: string) => s as LocalDate;

describe('R4 through the app provider', () => {
  let owner: TestUser;
  let adult: TestUser;
  let stranger: TestUser;
  let familyId: string;

  beforeAll(async () => {
    owner = await newUser('r4-owner');
    adult = await newUser('r4-adult');
    stranger = await newUser('r4-stranger');
    familyId = await familyOf(owner);
    await familyOf(stranger, 'Başka aile');
    await join(adult, await invite(owner, familyId));
  });

  it('pregnancy → birth keeps pregnancy memories and links the child', async () => {
    const preg = await app(owner).profiles.createPregnancy({ familyId, nickname: 'Fıstık', clinicianDueDate: d('2026-12-20'), lastMenstrualPeriod: null });
    const note = await app(adult).memories.finalize(
      { familyId, subject: { kind: 'pregnancy', pregnancyId: preg.id }, title: 'İlk tekme', body: null, eventDate: d('2026-10-01'), visibility: 'family', mediaIds: [] },
      { clientRequestId: uuid() },
    );
    const requestId = uuid();
    const input = [{ name: 'Kurgu Bebek', birthDate: d('2026-11-20'), birthTime: '04:30' as LocalTime, avatar: null, birthMeasurements: [{ kind: 'weight' as const, canonicalValue: 3300, enteredUnit: 'kg' as const }] }];
    const [born] = await app(adult).profiles.recordBirth(preg.id, input, { requestId });
    const [again] = await app(adult).profiles.recordBirth(preg.id, input, { requestId }); // lost response, retried
    expect(again!.id).toBe(born!.id);
    expect(born!.originPregnancyId).toBe(preg.id);
    const after = await app(owner).profiles.list(familyId);
    expect(after.pregnancies.find((p) => p.id === preg.id)!.status).toBe('born');
    expect(after.children.filter((c) => c.originPregnancyId === preg.id)).toHaveLength(1);
    expect((await app(owner).memories.get(note.id)).subject).toEqual({ kind: 'pregnancy', pregnancyId: preg.id });
    expect((await app(owner).measurements.listForChild(born!.id)).map((m) => m.canonicalValue)).toEqual([3300]);
  });

  it('any member edits a child; another family cannot', async () => {
    const childId = await child(owner, familyId, 'Eski Ad');
    const edited = await app(adult).profiles.updateChild(childId, { name: ' Yeni Ad ', birthDate: d('2026-08-02'), birthTime: '10:15' as LocalTime });
    expect(edited).toMatchObject({ name: 'Yeni Ad', birthDate: '2026-08-02', birthTime: '10:15' });
    await expect(app(stranger).profiles.updateChild(childId, { name: 'X' })).rejects.toMatchObject({ code: 'forbidden' });
    expect((await app(owner).profiles.list(familyId)).children.find((c) => c.id === childId)!.name).toBe('Yeni Ad');
  });

  it('only the owner archives and restores a child; records stay', async () => {
    const childId = await child(owner, familyId, 'Arşiv Bebek');
    await app(adult).measurements.create({ familyId, childId, kind: 'length', canonicalValue: 55, enteredUnit: 'cm', measuredOn: d('2026-11-01') });
    await expect(app(adult).profiles.setChildArchived(childId, true)).rejects.toMatchObject({ code: 'forbidden' });
    const archived = await app(owner).profiles.setChildArchived(childId, true);
    expect(archived.archivedAt).toBeTruthy();
    expect(await app(adult).measurements.listForChild(childId)).toHaveLength(1);
    const restored = await app(owner).profiles.setChildArchived(childId, false);
    expect(restored.archivedAt).toBeNull();
  });

  it('replacing a profile photo queues the old object and hides it; removing works too', async () => {
    const childId = await child(owner, familyId, 'Foto Bebek');
    const first = await app(adult).profiles.setChildPhoto(childId, photo());
    const oldMedia = first.avatarMediaId!;
    const [{ storage_key: oldKey }] = await sql<{ storage_key: string }>(`select storage_key from public.media_assets where id = $1`, [oldMedia]);
    expect(await app(owner).memories.resolveMedia(oldMedia)).not.toBeNull();

    const second = await app(owner).profiles.setChildPhoto(childId, photo());
    expect(second.avatarMediaId).not.toBe(oldMedia);
    expect(await app(adult).memories.resolveMedia(oldMedia)).toBeNull();
    expect(await app(adult).memories.resolveMedia(second.avatarMediaId!)).not.toBeNull();
    const queued = await sql(`select 1 from app.storage_deletions where object_path = $1`, [oldKey]);
    expect(queued).toHaveLength(1);

    const removed = await app(adult).profiles.setChildPhoto(childId, null);
    expect(removed.avatarMediaId).toBeNull();
    expect(await app(adult).memories.resolveMedia(second.avatarMediaId!)).toBeNull();
    await expect(app(stranger).profiles.setChildPhoto(childId, null)).rejects.toMatchObject({ code: 'not-found' });
  });

  it('a measurement is corrected only by its author; author or owner deletes', async () => {
    const childId = await child(owner, familyId, 'Ölçüm Bebek');
    const m = await app(adult).measurements.create({ familyId, childId, kind: 'weight', canonicalValue: 4100, enteredUnit: 'kg', measuredOn: d('2026-11-10') });
    const fixed = await app(adult).measurements.update(m.id, { canonicalValue: 4150, enteredUnit: 'g', measuredOn: d('2026-11-11') });
    expect(fixed).toMatchObject({ kind: 'weight', canonicalValue: 4150, enteredUnit: 'g', measuredOn: '2026-11-11' });
    expect(Date.parse(fixed.updatedAt!)).toBeGreaterThanOrEqual(Date.parse(m.createdAt));
    await expect(app(owner).measurements.update(m.id, { canonicalValue: 1, enteredUnit: 'kg', measuredOn: d('2026-11-11') })).rejects.toMatchObject({ code: 'forbidden' });
    expect((await app(owner).measurements.listForChild(childId))[0]!.canonicalValue).toBe(4150);
    const other = await app(adult).measurements.create({ familyId, childId, kind: 'length', canonicalValue: 56, enteredUnit: 'cm', measuredOn: d('2026-11-10') });
    await app(owner).measurements.remove(other.id); // owner may delete another member's measurement
    await app(adult).measurements.remove(m.id);
    expect(await app(owner).measurements.listForChild(childId)).toHaveLength(0);
  });

  it('appointments keep their explicit time zone; only the author edits', async () => {
    const start = { date: d('2027-01-15'), time: '09:30' as LocalTime, timeZone: 'America/New_York' };
    const input = { familyId, subject: null, title: 'Kontrol', start, location: 'Kurgu Klinik', notes: null, visibility: 'family' as const };
    const a = await app(adult).appointments.create(input);
    expect(a.start).toEqual(start);
    expect((await app(owner).appointments.list(familyId)).find((x) => x.id === a.id)!.start).toEqual(start);
    const moved = await app(adult).appointments.update(a.id, { ...input, start: { ...start, time: '11:00' as LocalTime, timeZone: 'Europe/Istanbul' } });
    expect(moved.start).toEqual({ date: '2027-01-15', time: '11:00', timeZone: 'Europe/Istanbul' });
    await expect(app(owner).appointments.update(a.id, input)).rejects.toMatchObject({ code: 'forbidden' });
    const mine = await app(owner).appointments.create({ ...input, visibility: 'private' });
    expect((await app(adult).appointments.list(familyId)).some((x) => x.id === mine.id)).toBe(false);
    await app(adult).appointments.remove(a.id);
    expect((await app(owner).appointments.list(familyId)).some((x) => x.id === a.id)).toBe(false);
  });
});
