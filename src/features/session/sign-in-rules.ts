/** Client-side shape checks only; the server decides. */
export function isPlausibleEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const normalizeCode = (v: string) => v.replace(/\D/g, '').slice(0, 6);
export const isCodeShaped = (v: string) => /^\d{6}$/.test(v);
