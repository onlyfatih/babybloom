import { useEffect, useRef, useState } from 'react';
import { drafts } from '@/infrastructure/storage/drafts';

/**
 * Local draft for a form (R0-A).
 *
 * - Nothing is saved or cleared until the initial restore has finished
 *   (`hydrated`), so an empty first render can never wipe a stored draft.
 * - A restored draft is applied only if the user has not typed yet.
 * - After hydration the draft follows the form: saved while it has content,
 *   removed when it becomes empty.
 * - `key === null` disables drafts (e.g. no session yet, or editing).
 */
export function useFormDraft<T>({
  key,
  value,
  isEmpty,
  onRestore,
}: {
  key: string | null;
  value: T;
  isEmpty: (v: T) => boolean;
  onRestore: (v: T) => void;
}) {
  // Tracked per key, so switching profile or account re-hydrates instead of
  // writing the previous form into the new key.
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const hydrated = key !== null && hydratedKey === key;
  const restored = key !== null && restoredKey === key;
  const latest = useRef({ value, isEmpty, onRestore });
  useEffect(() => {
    latest.current = { value, isEmpty, onRestore };
  });

  useEffect(() => {
    let cancelled = false;
    if (key === null) return;
    drafts.load<T>(key).then((d) => {
      if (cancelled) return;
      const { value: now, isEmpty: empty, onRestore: apply } = latest.current;
      if (d !== null && !empty(d) && empty(now)) {
        apply(d);
        setRestoredKey(key);
      }
      setHydratedKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (key === null || !hydrated) return;
    if (isEmpty(value)) drafts.clear(key);
    else drafts.save(key, value);
    // isEmpty is expected to be stable in behaviour; value drives saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated, value]);

  return {
    hydrated,
    restored,
    /** Removes the stored draft. Resolves false if removal failed. */
    discard: async (): Promise<boolean> => {
      setRestoredKey(null);
      return key === null ? true : drafts.clear(key);
    },
  };
}
