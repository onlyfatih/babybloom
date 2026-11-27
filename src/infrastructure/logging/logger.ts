/**
 * Single logging seam. Never log personal content (memory text, names, photos).
 * A crash-reporting service can be plugged in here in P5.
 */
export const logger = {
  info: (message: string, meta?: unknown) => {
    if (__DEV__) console.log(`[minik] ${message}`, meta ?? '');
  },
  warn: (message: string, meta?: unknown) => {
    if (__DEV__) console.warn(`[minik] ${message}`, meta ?? '');
  },
};
