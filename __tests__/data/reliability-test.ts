/**
 * P2.1 reliability fixes: awaited persistence with rollback, persisted-schema
 * migration, and the draft lifecycle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __demoInternals, DEMO_SCHEMA_VERSION, demoBackend, demoControls, migrate } from '@/data/providers/demo/demo-backend';
import { DataError } from '@/data/repositories/types';
import { localDate } from '@/domain/dates/local-date';
import { simulationStore } from '@/infrastructure/configuration/simulation';
import { DRAFT_MAX_AGE_DAYS, drafts } from '@/infrastructure/storage/drafts';

const F = 'fam-yildiz';

beforeEach(async () => {
  simulationStore.set({ offline: false, slowNetwork: false, uploadFailure: false });
  await demoControls.loadDemoFamily();
  __demoInternals.setCurrentUser('u-elif');
});

afterEach(() => jest.restoreAllMocks());

describe('persistence', () => {
  it('a mutation resolves only after the data is written', async () => {
    const created = await demoBackend.appointments.create({ familyId: F, subject: null, title: 'Yazıldı mı', start: { date: localDate('2026-12-01'), time: '10:00' as never, timeZone: 'Europe/Istanbul' }, location: null, notes: null, visibility: 'family' });
    const stored = JSON.parse((await AsyncStorage.getItem('minik-atlas/demo-db/v1'))!);
    expect(stored.db.appointments.map((a: { id: string }) => a.id)).toContain(created.id);
  });

  it('a failed write rejects and rolls the in-memory state back', async () => {
    const before = (await demoBackend.appointments.list(F)).length;
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    const result = await demoBackend.appointments
      .create({ familyId: F, subject: null, title: 'Kaybolmalı', start: { date: localDate('2026-12-01'), time: '10:00' as never, timeZone: 'Europe/Istanbul' }, location: null, notes: null, visibility: 'family' })
      .then(() => 'saved', (e) => (e instanceof DataError ? e.code : 'other'));
    expect(result).toBe('unknown');
    expect((await demoBackend.appointments.list(F)).length).toBe(before);
  });
});

describe('persisted schema', () => {
  it('treats unversioned data as version 1', () => {
    const s = migrate({ db: { users: [] }, currentUserId: 'u-x' });
    expect(s.schemaVersion).toBe(DEMO_SCHEMA_VERSION);
    expect(s.currentUserId).toBe('u-x');
  });
  it('refuses data from a newer app version instead of guessing', () => {
    expect(() => migrate({ schemaVersion: DEMO_SCHEMA_VERSION + 1, db: {}, currentUserId: null })).toThrow();
  });
  it('returns an empty state for unreadable data', () => {
    expect(migrate(null).db.memories).toEqual([]);
  });
});

describe('drafts', () => {
  it('round-trips and clears', async () => {
    await drafts.save('k', { title: 'a' }, 1000);
    expect(await drafts.load('k', 2000)).toEqual({ title: 'a' });
    await drafts.clear('k');
    expect(await drafts.load('k', 2000)).toBeNull();
  });
  it(`drops drafts older than ${DRAFT_MAX_AGE_DAYS} days`, async () => {
    await drafts.save('old', { title: 'a' }, 0);
    expect(await drafts.load('old', DRAFT_MAX_AGE_DAYS * 86_400_000 + 1)).toBeNull();
    expect(await AsyncStorage.getItem('minik-atlas/draft/old')).toBeNull();
  });
  it('drops unreadable and old-format drafts', async () => {
    await AsyncStorage.setItem('minik-atlas/draft/legacy', JSON.stringify({ title: 'pre-envelope' }));
    expect(await drafts.load('legacy')).toBeNull();
    await AsyncStorage.setItem('minik-atlas/draft/bad', '{not json');
    expect(await drafts.load('bad')).toBeNull();
  });
});
