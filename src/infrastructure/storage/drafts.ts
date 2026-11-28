/**
 * Local draft preservation for forms. Drafts never leave the device.
 *
 * Lifecycle (docs/milestone-visuals-growth.md, P2.1):
 * - saved while the user types; removed as soon as the form becomes empty again
 * - restored once when the form opens, only if the user has not typed yet
 * - removed after a confirmed save, on "Taslağı sil", and on an explicit
 *   "discard changes"
 * - ignored and removed when older than DRAFT_MAX_AGE_DAYS or unreadable
 * - keyed by user, family, profile and editor purpose (`draftKey`), so one
 *   account never sees another account's draft on a shared device
 * - text fields only: photos are not kept in drafts (local file URIs can
 *   disappear and must not outlive the editor)
 */
import { keyValueStore } from './key-value-store';

const prefix = 'minik-atlas/draft/';
export const DRAFT_MAX_AGE_DAYS = 14;

interface Envelope<T> {
  v: 1;
  savedAt: number;
  value: T;
}

export interface DraftScope {
  userId: string;
  familyId: string;
  /** e.g. 'child:<id>' or 'pregnancy:<id>' */
  profile: string;
  /** e.g. 'memory-new', 'memory-edit:<memoryId>' */
  purpose: string;
}

export function draftKey(scope: DraftScope): string {
  return [scope.userId, scope.familyId, scope.profile, scope.purpose].map(encodeURIComponent).join('/');
}

/** Removes every draft stored for one user (sign-out, account switch). */
export async function clearDraftsForUser(userId: string): Promise<void> {
  const keys = await keyValueStore.keys().catch(() => [] as readonly string[]);
  const mine = prefix + encodeURIComponent(userId) + '/';
  await Promise.all(keys.filter((k) => k.startsWith(mine)).map((k) => keyValueStore.remove(k).catch(() => undefined)));
}

export const drafts = {
  async load<T>(key: string, now: number = Date.now()): Promise<T | null> {
    try {
      const raw = await keyValueStore.get(prefix + key);
      if (!raw) return null;
      const env = JSON.parse(raw) as Partial<Envelope<T>>;
      if (env.v !== 1 || typeof env.savedAt !== 'number' || now - env.savedAt > DRAFT_MAX_AGE_DAYS * 86_400_000) {
        await keyValueStore.remove(prefix + key);
        return null;
      }
      return env.value ?? null;
    } catch {
      await keyValueStore.remove(prefix + key).catch(() => undefined);
      return null;
    }
  },
  save<T>(key: string, value: T, now: number = Date.now()) {
    const env: Envelope<T> = { v: 1, savedAt: now, value };
    return keyValueStore.set(prefix + key, JSON.stringify(env)).catch(() => undefined);
  },
  /** Resolves true when the draft is gone, false when removal failed (never rejects). */
  clear(key: string): Promise<boolean> {
    return keyValueStore.remove(prefix + key).then(
      () => true,
      () => false,
    );
  },
};
