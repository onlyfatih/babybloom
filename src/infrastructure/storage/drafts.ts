/**
 * Local draft preservation for forms. Drafts never leave the device and are
 * cleared after a confirmed remote save.
 */
import { keyValueStore } from './key-value-store';

const prefix = 'minik-atlas/draft/';

export const drafts = {
  async load<T>(key: string): Promise<T | null> {
    try {
      const raw = await keyValueStore.get(prefix + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  save<T>(key: string, value: T) {
    return keyValueStore.set(prefix + key, JSON.stringify(value)).catch(() => undefined);
  },
  clear(key: string) {
    return keyValueStore.remove(prefix + key).catch(() => undefined);
  },
};
