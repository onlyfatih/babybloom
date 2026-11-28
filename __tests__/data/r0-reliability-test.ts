/**
 * R0 regression checks: serialized local mutations, interleaved write
 * failures, draft scoping, and draft hydration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __demoInternals, demoBackend, demoControls } from '@/data/providers/demo/demo-backend';
import { DataError, type AppointmentInput } from '@/data/repositories/types';
import { localDate } from '@/domain/dates/local-date';
import { simulationStore } from '@/infrastructure/configuration/simulation';
import { clearDraftsForUser, draftKey, drafts } from '@/infrastructure/storage/drafts';
import { keyValueStore } from '@/infrastructure/storage/key-value-store';

const F = 'fam-yildiz';
const appt = (title: string): AppointmentInput => ({ familyId: F, subject: null, title, start: { date: localDate('2026-12-01'), time: '10:00' as never, timeZone: 'Europe/Istanbul' }, location: null, notes: null, visibility: 'family' });
const stored = async () => JSON.parse((await AsyncStorage.getItem('minik-atlas/demo-db/v1'))!) as { db: { appointments: { title: string }[] } };

beforeEach(async () => {
  simulationStore.set({ offline: false, slowNetwork: false, uploadFailure: false });
  await demoControls.loadDemoFamily();
  __demoInternals.setCurrentUser('u-elif');
});
afterEach(() => jest.restoreAllMocks());

describe('local provider: serialized mutations', () => {
  it('a failed write does not roll back a concurrent mutation that succeeded', async () => {
    const real = (k: string, v: string) => AsyncStorage.multiSet([[k, v]]);
    let call = 0;
    jest.spyOn(keyValueStore, 'set').mockImplementation(async (k, v) => {
      call += 1;
      if (call === 1) {
        await new Promise((r) => setTimeout(r, 50)); // slow but successful
        return real(k, v);
      }
      if (call === 2) throw new Error('disk full');
      return real(k, v);
    });
    const [a, b, c] = await Promise.allSettled([demoBackend.appointments.create(appt('A slow')), demoBackend.appointments.create(appt('B fails')), demoBackend.appointments.create(appt('C ok'))]);
    expect(a.status).toBe('fulfilled');
    expect(b.status).toBe('rejected');
    expect(b.status === 'rejected' && b.reason instanceof DataError && b.reason.code).toBe('unknown');
    expect(c.status).toBe('fulfilled');
    const titles = (await demoBackend.appointments.list(F)).map((x) => x.title);
    expect(titles).toEqual(expect.arrayContaining(['A slow', 'C ok']));
    expect(titles).not.toContain('B fails');
    const onDisk = (await stored()).db.appointments.map((x) => x.title);
    expect(onDisk).toEqual(expect.arrayContaining(['A slow', 'C ok']));
    expect(onDisk).not.toContain('B fails');
  });

  it('mutations apply in call order even when an earlier write is slower', async () => {
    const real = (k: string, v: string) => AsyncStorage.multiSet([[k, v]]);
    jest.spyOn(keyValueStore, 'set').mockImplementationOnce(async (k, v) => {
      await new Promise((r) => setTimeout(r, 80));
      return real(k, v);
    });
    const created = await demoBackend.appointments.create(appt('ilk'));
    const [, updated] = await Promise.all([demoBackend.appointments.update(created.id, appt('ikinci')), demoBackend.appointments.update(created.id, appt('üçüncü'))]);
    expect(updated.title).toBe('üçüncü');
    expect((await stored()).db.appointments.find((x) => x.title === 'üçüncü')).toBeTruthy();
  });

  it('sign-out keeps the stored data', async () => {
    const before = (await stored()).db.appointments.length;
    await demoBackend.auth.signOut();
    expect((await stored()).db.appointments.length).toBe(before);
    expect(await demoBackend.auth.getSession()).toBeNull();
  });
});

describe('drafts: scoping', () => {
  it('keys differ by user, family, profile and purpose', () => {
    const base = { userId: 'u1', familyId: 'f1', profile: 'child:c1', purpose: 'memory-new' };
    const keys = new Set([draftKey(base), draftKey({ ...base, userId: 'u2' }), draftKey({ ...base, familyId: 'f2' }), draftKey({ ...base, profile: 'child:c2' }), draftKey({ ...base, purpose: 'memory-edit:m1' })]);
    expect(keys.size).toBe(5);
  });
  it('clearing one user leaves another user’s drafts', async () => {
    const a = draftKey({ userId: 'ua', familyId: 'f', profile: 'p', purpose: 'x' });
    const b = draftKey({ userId: 'ub', familyId: 'f', profile: 'p', purpose: 'x' });
    await drafts.save(a, { t: 1 });
    await drafts.save(b, { t: 2 });
    await clearDraftsForUser('ua');
    expect(await drafts.load(a)).toBeNull();
    expect(await drafts.load(b)).toEqual({ t: 2 });
  });
  it('clear reports failure instead of throwing', async () => {
    jest.spyOn(keyValueStore, 'remove').mockRejectedValueOnce(new Error('locked'));
    expect(await drafts.clear('k')).toBe(false);
  });
});
