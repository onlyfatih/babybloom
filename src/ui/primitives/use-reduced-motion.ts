import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** `true`/`false` once the system setting is known, `null` before that. */
export function useReducedMotionSetting(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduced(v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Treats "not yet known" as motion allowed. Prefer the setting variant for looping motion. */
export function useReducedMotion(): boolean {
  return useReducedMotionSetting() ?? false;
}
