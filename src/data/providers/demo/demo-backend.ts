/**
 * PROTOTYPE PROVIDER — local, in-memory, persisted to AsyncStorage on this device only.
 *
 * Implements the same Backend contract the real (Supabase) provider will.
 * It mirrors server rules using the domain permission functions so the UI
 * can be exercised, but it is NOT a security boundary: anyone with the device
 * can read AsyncStorage. Real authorization arrives in P3 (RLS policies).
 *
 * Simulation switches (Settings → Prototip araçları) let you exercise
 * offline, slow network and upload-failure paths.
 */
import { todayIn, deviceTimeZone } from '@/domain/dates/local-date';
import { mediaToDelete } from '@/domain/memories/memory-rules';
import type { Family, FamilyMembership, Id, MediaAsset, Memory, UserPreference } from '@/domain/model';
import { canOnFamily, canOnRecord, canRemoveMember, type Actor } from '@/domain/permissions/permissions';
import { simulationStore } from '@/infrastructure/configuration/simulation';
import { keyValueStore } from '@/infrastructure/storage/key-value-store';
import { logger } from '@/infrastructure/logging/logger';
import { buildDemoDatabase, DEMO_USER_ID, DemoDatabase, emptyDatabase, FIXTURE_IMAGES } from '@/testing/fixtures/demo-family';
import { Backend, DataError, SessionInfo } from '../../repositories/types';

const STORAGE_KEY = 'minik-atlas/demo-db/v1';

/**
 * Persisted shape version. Bump it and add a step to `migrate` whenever the
 * stored demo data changes shape (e.g. new measurement fields in M3).
 */
export const DEMO_SCHEMA_VERSION = 1;

interface DemoState {
  schemaVersion: number;
  db: DemoDatabase;
  currentUserId: Id | null;
}

/** Brings any stored state up to DEMO_SCHEMA_VERSION. Unversioned data is version 1. */
export function migrate(raw: unknown): DemoState {
  const s = raw as Partial<DemoState>;
  if (!s || typeof s !== 'object' || !s.db) return { schemaVersion: DEMO_SCHEMA_VERSION, db: emptyDatabase(), currentUserId: null };
  const version = s.schemaVersion ?? 1;
  if (version > DEMO_SCHEMA_VERSION) throw new Error(`demo-db: stored schema ${version} is newer than this app (${DEMO_SCHEMA_VERSION})`);
  return { schemaVersion: DEMO_SCHEMA_VERSION, db: s.db, currentUserId: s.currentUserId ?? null };
}

let state: DemoState = { schemaVersion: DEMO_SCHEMA_VERSION, db: emptyDatabase(), currentUserId: null };
let loaded = false;
const slotIndex = new Map<string, number>();
const failedOnce = new Set<string>();

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  await simulationStore.restore();
  const raw = await keyValueStore.get(STORAGE_KEY);
  if (raw) {
    try {
      state = migrate(JSON.parse(raw));
    } catch (e) {
      logger.warn('demo-db: could not parse stored state, starting empty', e);
    }
  }
}

/**
 * Writes immediately and is awaited by every mutation, so a call only resolves
 * after the data is on disk (a reload right after "Kaydedildi" never loses it).
 * If the write fails, the in-memory state is rolled back to the last stored
 * state and the call rejects, so the UI never reports an unsaved change as saved.
 */
async function persist(): Promise<void> {
  try {
    await keyValueStore.set(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    logger.warn('demo-db: persist failed, rolling back', e);
    const raw = await keyValueStore.get(STORAGE_KEY).catch(() => null);
    state = raw ? migrate(JSON.parse(raw)) : { schemaVersion: DEMO_SCHEMA_VERSION, db: emptyDatabase(), currentUserId: null };
    throw new DataError('unknown', 'persist-failed');
  }
}

/** Every call passes through here: latency, offline, session and membership checks. */
async function request(): Promise<{ actor: Actor; membership: FamilyMembership }> {
  await ensureLoaded();
  await sleep(simulationStore.get().slowNetwork ? 1800 : 180);
  if (simulationStore.get().offline) throw new DataError('offline');
  if (!state.currentUserId) throw new DataError('session-expired');
  const membership = state.db.memberships.find((m) => m.userId === state.currentUserId);
  if (!membership) throw new DataError('forbidden');
  if (membership.status === 'revoked') throw new DataError('membership-revoked');
  return { actor: { userId: state.currentUserId, membership }, membership };
}

function requireFamily(actor: Actor, familyId: Id, action: Parameters<typeof canOnFamily>[1] = 'create-record') {
  if (!canOnFamily(actor, action, familyId)) throw new DataError('forbidden');
}

function find<T extends { id: Id }>(list: T[], id: Id): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new DataError('not-found');
  return item;
}

function sessionFor(userId: Id): SessionInfo {
  const membership = state.db.memberships.find((m) => m.userId === userId)!;
  return {
    user: state.db.users.find((u) => u.id === userId)!,
    family: state.db.families.find((f) => f.id === membership.familyId)!,
    membership,
  };
}

export const demoControls = {
  async loadDemoFamily(): Promise<SessionInfo> {
    await ensureLoaded();
    state = { schemaVersion: DEMO_SCHEMA_VERSION, db: buildDemoDatabase(todayIn(deviceTimeZone()), nowIso()), currentUserId: DEMO_USER_ID };
    await persist();
    return sessionFor(DEMO_USER_ID);
  },
  async reset() {
    state = { schemaVersion: DEMO_SCHEMA_VERSION, db: emptyDatabase(), currentUserId: null };
    await keyValueStore.remove(STORAGE_KEY);
  },
};

export const demoBackend: Backend = {
  name: 'demo-local',

  auth: {
    async getSession() {
      await ensureLoaded();
      if (!state.currentUserId) return null;
      const m = state.db.memberships.find((x) => x.userId === state.currentUserId);
      if (!m) return null;
      return sessionFor(state.currentUserId);
    },
    async createFamily({ displayName, relationshipLabel }) {
      await ensureLoaded();
      await sleep(250);
      if (simulationStore.get().offline) throw new DataError('offline');
      const userId = newId('u');
      const family: Family = { id: newId('fam'), name: 'Ailemiz', createdBy: userId, createdAt: nowIso() };
      state = { schemaVersion: DEMO_SCHEMA_VERSION, db: emptyDatabase(), currentUserId: userId };
      state.db.users.push({ id: userId, displayName });
      state.db.families.push(family);
      state.db.memberships.push({ id: newId('m'), familyId: family.id, userId, role: 'owner', relationshipLabel, status: 'active', joinedAt: nowIso(), revokedAt: null });
      state.db.preferences.push({ userId, selectedProfile: null, locale: 'tr', measurementSystem: 'metric', notifications: { appointmentReminders: true, weeklyPregnancyUpdate: true } });
      await persist();
      return sessionFor(userId);
    },
    async acceptInvitation({ code, displayName }) {
      await ensureLoaded();
      await sleep(300);
      if (simulationStore.get().offline) throw new DataError('offline');
      const normalized = code.trim().toUpperCase();
      // Prototype: "MINIK-2026" joins the fictional demo family as a new adult member.
      if (normalized !== 'MINIK-2026') throw new DataError('invalid-invitation');
      state = { schemaVersion: DEMO_SCHEMA_VERSION, db: buildDemoDatabase(todayIn(deviceTimeZone()), nowIso()), currentUserId: null };
      const userId = newId('u');
      state.db.users.push({ id: userId, displayName });
      state.db.memberships.push({ id: newId('m'), familyId: state.db.families[0]!.id, userId, role: 'adult', relationshipLabel: 'Aile üyesi', status: 'active', joinedAt: nowIso(), revokedAt: null });
      state.db.preferences.push({ userId, selectedProfile: { kind: 'child', childId: 'child-deniz' }, locale: 'tr', measurementSystem: 'metric', notifications: { appointmentReminders: true, weeklyPregnancyUpdate: false } });
      state.currentUserId = userId;
      await persist();
      return sessionFor(userId);
    },
    async signOut() {
      await demoControls.reset();
    },
  },

  profiles: {
    async list(familyId) {
      const { actor } = await request();
      requireFamily(actor, familyId, 'export-own-view');
      return {
        pregnancies: state.db.pregnancies.filter((p) => p.familyId === familyId),
        children: state.db.children.filter((c) => c.familyId === familyId),
      };
    },
    async createPregnancy(input) {
      const { actor } = await request();
      requireFamily(actor, input.familyId);
      const p = { id: newId('preg'), ...input, status: 'active' as const, remindersPaused: false, contentHidden: false, createdBy: actor.userId, createdAt: nowIso(), updatedAt: nowIso() };
      state.db.pregnancies.push(p);
      await persist();
      return p;
    },
    async updatePregnancy(id, patch) {
      const { actor } = await request();
      const p = find(state.db.pregnancies, id);
      requireFamily(actor, p.familyId, patch.status === 'archived' ? 'archive-profile' : 'manage-profile');
      Object.assign(p, patch, { updatedAt: nowIso() });
      await persist();
      return p;
    },
    async createChild(input) {
      const { actor } = await request();
      requireFamily(actor, input.familyId);
      const child = insertChild(actor.userId, input);
      await persist();
      return child;
    },
    async recordBirth(pregnancyId, children) {
      const { actor } = await request();
      const p = find(state.db.pregnancies, pregnancyId);
      requireFamily(actor, p.familyId, 'manage-profile');
      if (p.status !== 'active') throw new DataError('validation');
      // Single transaction on the server (P3: SQL function record_birth).
      const created = children.map((c) => insertChild(actor.userId, { ...c, familyId: p.familyId, originPregnancyId: p.id }));
      p.status = 'born';
      p.updatedAt = nowIso();
      await persist();
      return created;
    },
  },

  memories: {
    async list(familyId) {
      const { actor } = await request();
      requireFamily(actor, familyId, 'export-own-view');
      return state.db.memories.filter((m) => m.familyId === familyId && canOnRecord(actor, 'view', m));
    },
    async get(id) {
      const { actor } = await request();
      const m = state.db.memories.find((x) => x.id === id);
      // Same response for "missing" and "not allowed", so private memories don't leak their existence.
      if (!m || !canOnRecord(actor, 'view', m)) throw new DataError('not-found');
      return m;
    },
    async prepareUploads(familyId, photos) {
      const { actor } = await request();
      requireFamily(actor, familyId);
      return photos.map((photo, index) => {
        const asset: MediaAsset = { id: newId('media'), familyId, storageKey: `local:${photo.uri}`, mimeType: photo.mimeType, width: photo.width, height: photo.height, byteSize: photo.byteSize, status: 'pending', uploadedBy: actor.userId, createdAt: nowIso() };
        state.db.media.push(asset);
        slotIndex.set(asset.id, index);
        return { localId: photo.localId, mediaId: asset.id, target: asset.storageKey };
      });
    },
    async uploadPhoto(slot, _photo, onProgress) {
      // Deterministic simulation: the first upload attempt of every other photo in a batch fails;
      // retrying the same slot succeeds. 1 photo -> nothing saved; 2 photos -> partial success.
      const failThisUpload = (slotIndex.get(slot.mediaId) ?? 1) % 2 === 0 && !failedOnce.has(slot.mediaId);
      if (failThisUpload && simulationStore.get().uploadFailure) failedOnce.add(slot.mediaId);
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        await sleep(simulationStore.get().slowNetwork ? 500 : 120);
        if (simulationStore.get().offline) throw new DataError('offline');
        if (simulationStore.get().uploadFailure && i === 3 && failThisUpload) throw new DataError('upload-failed');
        onProgress(i / steps);
      }
      const asset = find(state.db.media, slot.mediaId);
      asset.status = 'ready';
      await persist();
    },
    async finalize(input, { memoryId, clientRequestId }) {
      const { actor } = await request();
      requireFamily(actor, input.familyId);
      // Idempotency: a retried/double-tapped finalize returns the same memory.
      const existingForKey = state.db.requestKeys[clientRequestId];
      if (existingForKey) return find(state.db.memories, existingForKey);
      for (const id of input.mediaIds) {
        if (find(state.db.media, id).status !== 'ready') throw new DataError('validation', 'media not uploaded');
      }
      let memory: Memory;
      if (memoryId) {
        memory = find(state.db.memories, memoryId);
        if (!canOnRecord(actor, 'edit', memory)) throw new DataError('forbidden');
        const removed = mediaToDelete(memory.mediaIds, input.mediaIds);
        Object.assign(memory, input, { updatedAt: nowIso() });
        state.db.media = state.db.media.filter((m) => !removed.includes(m.id));
      } else {
        memory = { id: newId('mem'), ...input, authorId: actor.userId, createdAt: nowIso(), updatedAt: nowIso() };
        state.db.memories.push(memory);
      }
      state.db.requestKeys[clientRequestId] = memory.id;
      await persist();
      return memory;
    },
    async remove(id) {
      const { actor } = await request();
      const m = find(state.db.memories, id);
      if (!canOnRecord(actor, 'delete', m)) throw new DataError('forbidden');
      state.db.memories = state.db.memories.filter((x) => x.id !== id);
      const deletedMediaIds = [...m.mediaIds];
      state.db.media = state.db.media.filter((x) => !deletedMediaIds.includes(x.id));
      state.db.children.forEach((c) => {
        if (c.avatarMediaId && deletedMediaIds.includes(c.avatarMediaId)) c.avatarMediaId = null;
      });
      await persist();
      return { deletedMediaIds };
    },
    mediaSource(mediaId) {
      const asset = state.db.media.find((m) => m.id === mediaId);
      if (!asset) return null;
      if (asset.storageKey.startsWith('fixture:')) return FIXTURE_IMAGES[asset.storageKey.slice(8)] ?? null;
      if (asset.storageKey.startsWith('local:')) return asset.storageKey.slice(6);
      return null;
    },
  },

  measurements: {
    async listForChild(childId) {
      const { actor } = await request();
      const child = find(state.db.children, childId);
      requireFamily(actor, child.familyId, 'export-own-view');
      return state.db.measurements.filter((m) => m.childId === childId);
    },
    async create(input) {
      const { actor } = await request();
      requireFamily(actor, input.familyId);
      const m = { id: newId('ms'), ...input, isBirthMeasurement: false, authorId: actor.userId, createdAt: nowIso() };
      state.db.measurements.push(m);
      await persist();
      return m;
    },
    async remove(id) {
      const { actor } = await request();
      const m = find(state.db.measurements, id);
      if (!canOnRecord(actor, 'delete', { ...m, visibility: 'family' })) throw new DataError('forbidden');
      state.db.measurements = state.db.measurements.filter((x) => x.id !== id);
      await persist();
    },
  },

  appointments: {
    async list(familyId) {
      const { actor } = await request();
      requireFamily(actor, familyId, 'export-own-view');
      return state.db.appointments.filter((a) => a.familyId === familyId && canOnRecord(actor, 'view', a));
    },
    async create(input) {
      const { actor } = await request();
      requireFamily(actor, input.familyId);
      const a = { id: newId('ap'), ...input, authorId: actor.userId, createdAt: nowIso(), updatedAt: nowIso() };
      state.db.appointments.push(a);
      await persist();
      return a;
    },
    async update(id, input) {
      const { actor } = await request();
      const a = find(state.db.appointments, id);
      if (!canOnRecord(actor, 'edit', a)) throw new DataError('forbidden');
      Object.assign(a, input, { updatedAt: nowIso() });
      await persist();
      return a;
    },
    async remove(id) {
      const { actor } = await request();
      const a = find(state.db.appointments, id);
      if (!canOnRecord(actor, 'delete', a)) throw new DataError('forbidden');
      state.db.appointments = state.db.appointments.filter((x) => x.id !== id);
      await persist();
    },
  },

  family: {
    async members(familyId) {
      const { actor } = await request();
      requireFamily(actor, familyId, 'export-own-view');
      return state.db.memberships.filter((m) => m.familyId === familyId).map((m) => ({ ...m, user: state.db.users.find((u) => u.id === m.userId)! }));
    },
    async invitations(familyId) {
      const { actor } = await request();
      if (!canOnFamily(actor, 'invite-member', familyId)) return [];
      const now = Date.now();
      return state.db.invitations
        .filter((i) => i.familyId === familyId)
        .map((i) => (i.status === 'pending' && Date.parse(i.expiresAt) < now ? { ...i, status: 'expired' as const } : i));
    },
    async createInvitation({ familyId, role, relationshipLabel }) {
      const { actor } = await request();
      requireFamily(actor, familyId, 'invite-member');
      const code = `MINIK-${Math.floor(1000 + Math.random() * 9000)}`;
      const inv = { id: newId('inv'), familyId, invitedBy: actor.userId, role, relationshipLabel, code, expiresAt: new Date(Date.now() + 48 * 3600_000).toISOString(), status: 'pending' as const, createdAt: nowIso() };
      state.db.invitations.push(inv);
      await persist();
      return inv;
    },
    async revokeInvitation(id) {
      const { actor } = await request();
      const inv = find(state.db.invitations, id);
      requireFamily(actor, inv.familyId, 'invite-member');
      inv.status = 'revoked';
      await persist();
    },
    async revokeMember(membershipId) {
      const { actor } = await request();
      const target = find(state.db.memberships, membershipId);
      requireFamily(actor, target.familyId, 'revoke-member');
      const check = canRemoveMember(state.db.memberships.filter((m) => m.familyId === target.familyId), target.userId);
      if (check !== 'ok') throw new DataError('validation', check);
      target.status = 'revoked';
      target.revokedAt = nowIso();
      await persist();
    },
  },

  preferences: {
    async get(userId) {
      await request();
      const pref = state.db.preferences.find((p) => p.userId === userId);
      if (!pref) throw new DataError('not-found');
      return pref;
    },
    async update(userId, patch) {
      await request();
      const pref = state.db.preferences.find((p) => p.userId === userId);
      if (!pref) throw new DataError('not-found');
      Object.assign(pref, patch as Partial<UserPreference>);
      await persist();
      return pref;
    },
  },
};

function insertChild(userId: Id, input: Parameters<Backend['profiles']['createChild']>[0]) {
  let avatarMediaId: Id | null = null;
  if (input.avatarLocalUri) {
    const asset: MediaAsset = { id: newId('media'), familyId: input.familyId, storageKey: `local:${input.avatarLocalUri}`, mimeType: 'image/jpeg', width: 0, height: 0, byteSize: 0, status: 'ready', uploadedBy: userId, createdAt: nowIso() };
    state.db.media.push(asset);
    avatarMediaId = asset.id;
  }
  const child = { id: newId('child'), familyId: input.familyId, name: input.name.trim(), birthDate: input.birthDate, birthTime: input.birthTime, originPregnancyId: input.originPregnancyId, avatarMediaId, createdBy: userId, createdAt: nowIso(), updatedAt: nowIso() };
  state.db.children.push(child);
  for (const bm of input.birthMeasurements) {
    state.db.measurements.push({ id: newId('ms'), familyId: input.familyId, childId: child.id, kind: bm.kind, canonicalValue: bm.canonicalValue, enteredUnit: bm.enteredUnit, measuredOn: input.birthDate, isBirthMeasurement: true, authorId: userId, createdAt: nowIso() });
  }
  return child;
}

/** Test helper: inspect state without going through the API. */
export const __demoInternals = {
  get state() {
    return state;
  },
  setCurrentUser(id: Id | null) {
    state.currentUserId = id;
  },
};
