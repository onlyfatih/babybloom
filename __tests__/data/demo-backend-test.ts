/**
 * Exercises the prototype provider against the same rules the real server must enforce.
 * NOTE: this is NOT server authorization testing. Backend RLS tests arrive in P3.
 */
import { __demoInternals, demoBackend, demoControls } from '@/data/providers/demo/demo-backend';
import { DataError } from '@/data/repositories/types';
import { localDate } from '@/domain/dates/local-date';
import { simulationStore } from '@/infrastructure/configuration/simulation';

const F = 'fam-yildiz';

beforeEach(async () => {
  simulationStore.set({ offline: false, slowNetwork: false, uploadFailure: false });
  await demoControls.loadDemoFamily();
});

const as = (userId: string) => __demoInternals.setCurrentUser(userId);
const code = (p: Promise<unknown>) => p.then(() => 'ok', (e) => (e instanceof DataError ? e.code : 'unknown'));

describe('private memories', () => {
  it('owner cannot see another adult’s private memory, author can', async () => {
    as('u-elif');
    expect((await demoBackend.memories.list(F)).map((m) => m.id)).not.toContain('mem-7');
    expect(await code(demoBackend.memories.get('mem-7'))).toBe('not-found');
    as('u-can');
    expect((await demoBackend.memories.list(F)).map((m) => m.id)).toContain('mem-7');
    expect((await demoBackend.memories.list(F)).map((m) => m.id)).not.toContain('mem-6');
  });
});

describe('revoked membership', () => {
  it('loses access to every family read', async () => {
    as('u-elif');
    await demoBackend.family.revokeMember('m-nermin');
    as('u-nermin');
    expect(await code(demoBackend.memories.list(F))).toBe('membership-revoked');
    expect(await code(demoBackend.profiles.list(F))).toBe('membership-revoked');
  });

  it('non-owners cannot revoke and the last owner cannot be removed', async () => {
    as('u-can');
    expect(await code(demoBackend.family.revokeMember('m-nermin'))).toBe('forbidden');
    as('u-elif');
    expect(await code(demoBackend.family.revokeMember('m-elif'))).toBe('validation');
  });
});

describe('memory save', () => {
  const input = { familyId: F, subject: { kind: 'child' as const, childId: 'child-deniz' }, title: 'Test', body: null, eventDate: localDate('2026-11-01'), visibility: 'family' as const, mediaIds: [] };

  it('duplicate finalize with the same request id creates one memory', async () => {
    as('u-elif');
    const before = __demoInternals.state.db.memories.length;
    const [a, b] = await Promise.all([
      demoBackend.memories.finalize(input, { clientRequestId: 'req-1' }),
      demoBackend.memories.finalize(input, { clientRequestId: 'req-1' }),
    ]);
    expect(a.id).toBe(b.id);
    expect(__demoInternals.state.db.memories.length).toBe(before + 1);
  });

  it('interrupted upload: finalize refuses media that never finished uploading', async () => {
    as('u-elif');
    const photo = { localId: 'p1', uri: 'file:///x.jpg', width: 10, height: 10, byteSize: 1, mimeType: 'image/jpeg' as const };
    const [slot] = await demoBackend.memories.prepareUploads(F, [photo]);
    simulationStore.set({ uploadFailure: true });
    const uploadResult = await code(demoBackend.memories.uploadPhoto(slot!, photo, () => undefined));
    expect(uploadResult).toBe('upload-failed');
    expect(await code(demoBackend.memories.finalize({ ...input, mediaIds: [slot!.mediaId] }, { clientRequestId: 'req-2' }))).toBe('validation');
  });

  it('only the author can edit a shared memory', async () => {
    as('u-elif');
    expect(await code(demoBackend.memories.finalize({ ...input, title: 'x' }, { memoryId: 'mem-4', clientRequestId: 'req-3' }))).toBe('forbidden');
  });
});

describe('delete and media cleanup', () => {
  it('deleting a memory removes its media objects and clears avatar references', async () => {
    as('u-elif');
    const { deletedMediaIds } = await demoBackend.memories.remove('mem-3');
    expect(deletedMediaIds).toEqual(['media-window', 'media-blanket']);
    const media = __demoInternals.state.db.media.map((m) => m.id);
    expect(media).not.toContain('media-window');
    expect(__demoInternals.state.db.children[0]!.avatarMediaId).toBeNull();
    expect(demoBackend.memories.mediaSource('media-window')).toBeNull();
  });

  it('editing a memory to drop a photo deletes that photo', async () => {
    as('u-elif');
    const m = __demoInternals.state.db.memories.find((x) => x.id === 'mem-3')!;
    await demoBackend.memories.finalize({ familyId: F, subject: m.subject, title: m.title, body: m.body, eventDate: m.eventDate, visibility: m.visibility, mediaIds: ['media-window'] }, { memoryId: 'mem-3', clientRequestId: 'req-4' });
    expect(__demoInternals.state.db.media.map((x) => x.id)).not.toContain('media-blanket');
  });
});

describe('pregnancy to child transition', () => {
  it('creates linked children (twins) and preserves pregnancy memories', async () => {
    as('u-elif');
    const before = __demoInternals.state.db.memories.filter((m) => m.subject.kind === 'pregnancy' && m.subject.pregnancyId === 'preg-fistik').map((m) => m.id);
    const kids = await demoBackend.profiles.recordBirth('preg-fistik', [
      { name: 'Ada', birthDate: localDate('2026-11-27'), birthTime: null, avatarLocalUri: null, birthMeasurements: [{ kind: 'weight', canonicalValue: 2900, enteredUnit: 'kg' }] },
      { name: 'Ege', birthDate: localDate('2026-11-27'), birthTime: null, avatarLocalUri: null, birthMeasurements: [] },
    ]);
    expect(kids.map((k) => k.originPregnancyId)).toEqual(['preg-fistik', 'preg-fistik']);
    const after = __demoInternals.state.db.memories.filter((m) => m.subject.kind === 'pregnancy' && m.subject.pregnancyId === 'preg-fistik').map((m) => m.id);
    expect(after).toEqual(before);
    expect(__demoInternals.state.db.pregnancies.find((p) => p.id === 'preg-fistik')!.status).toBe('born');
    expect(await code(demoBackend.profiles.recordBirth('preg-fistik', []))).toBe('validation');
    const birthWeights = await demoBackend.measurements.listForChild(kids[0]!.id);
    expect(birthWeights).toHaveLength(1);
    expect(birthWeights[0]!.isBirthMeasurement).toBe(true);
  });
});

describe('offline', () => {
  it('reports offline instead of pretending to save', async () => {
    as('u-elif');
    simulationStore.set({ offline: true });
    expect(await code(demoBackend.appointments.list(F))).toBe('offline');
  });
});
