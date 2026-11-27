/**
 * Local draft preservation for forms. Drafts never leave the device.
 *
 * Lifecycle (docs/milestone-visuals-growth.md, P2.1):
 * - saved while the user types; removed as soon as the form becomes empty again
 * - restored once when the form opens, only if the user has not typed yet
 * - removed after a confirmed save, on "Taslağı sil", and on an explicit
 *   "discard changes"
 * - ignored and removed when older than DRAFT_MAX_AGE_DAYS or unreadable
 */
import { keyValueStore } from './key-value-store';

const prefix = 'minik-atlas/draft/';
export const DRAFT_MAX_AGE_DAYS = 14;

interface Envelope<T> {
  v: 1;
  savedAt: number;
  value: T;
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
  clear(key: string) {
    return keyValueStore.remove(prefix + key).catch(() => undefined);
  },
};
