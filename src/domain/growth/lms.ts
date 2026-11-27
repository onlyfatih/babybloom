/**
 * LMS method (Cole & Green). Pure functions; no reference numbers live here.
 *
 *   X = M (1 + L S Z)^(1/L)   for L ≠ 0
 *   X = M exp(S Z)            for L = 0
 *   Z = ((X/M)^L − 1) / (L S) for L ≠ 0
 *   Z = ln(X/M) / S           for L = 0
 * (formulas as published on https://www.cdc.gov/growthcharts/cdc-data-files.htm)
 *
 * NOT implemented yet (step E, needs the WHO methods report): WHO's restricted
 * application beyond |Z| > 3. Until then `zFromValue` reports such values as
 * `beyond-validated-range` instead of a number.
 */
export interface Lms {
  L: number;
  M: number;
  S: number;
}

const L_ZERO = 1e-12;

export function valueFromZ({ L, M, S }: Lms, z: number): number {
  if (Math.abs(L) < L_ZERO) return M * Math.exp(S * z);
  return M * Math.pow(1 + L * S * z, 1 / L);
}

export type ZResult = { kind: 'z'; z: number } | { kind: 'beyond-validated-range' } | { kind: 'invalid-input' };

export function zFromValue({ L, M, S }: Lms, x: number): ZResult {
  if (!(x > 0) || !(M > 0) || !(S > 0)) return { kind: 'invalid-input' };
  const z = Math.abs(L) < L_ZERO ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S);
  if (!Number.isFinite(z)) return { kind: 'invalid-input' };
  if (Math.abs(z) > 3) return { kind: 'beyond-validated-range' };
  return { kind: 'z', z };
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf; max abs error ~1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/**
 * Linear interpolation of L, M and S between two tabulated ages.
 * Only used for drawing curves between published points; documented in
 * docs/growth-references.md. Never extrapolates.
 */
export function interpolateLms(rows: readonly { x: number; lms: Lms }[], x: number): Lms | null {
  if (!rows.length || x < rows[0]!.x || x > rows[rows.length - 1]!.x) return null;
  let i = 0;
  while (i < rows.length - 2 && rows[i + 1]!.x < x) i++;
  const a = rows[i]!;
  const b = rows[Math.min(i + 1, rows.length - 1)]!;
  if (b.x === a.x || x === a.x) return a.lms;
  if (x === b.x) return b.lms;
  const f = (x - a.x) / (b.x - a.x);
  return { L: a.lms.L + (b.lms.L - a.lms.L) * f, M: a.lms.M + (b.lms.M - a.lms.M) * f, S: a.lms.S + (b.lms.S - a.lms.S) * f };
}
