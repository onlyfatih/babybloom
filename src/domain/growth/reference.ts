/**
 * Growth reference datasets and the rules that decide whether one may be used
 * for a given child, indicator and age. Datasets are data (src/content/growth-references);
 * this file holds only types and rules.
 */
import { interpolateLms, Lms, valueFromZ } from './lms';

export type GrowthIndicator = 'weight-for-age' | 'length-height-for-age' | 'head-circumference-for-age';
export type ReferenceSex = 'female' | 'male';
export type ReferencePublisher = 'WHO' | 'CDC';

/** Validation status gates every numeric output beyond drawing a curve. */
export type DatasetValidation = 'unvalidated-prototype' | 'validated';

export interface GrowthReferenceDataset {
  id: string;
  publisher: ReferencePublisher;
  name: string;
  release: string;
  indicator: GrowthIndicator;
  sex: ReferenceSex;
  /** Age axis of the table. */
  ageUnit: 'month' | 'day';
  ageMin: number;
  ageMax: number;
  valueUnit: 'kg' | 'cm';
  measurementConvention: 'weight' | 'recumbent-length' | 'standing-height' | 'length-then-height' | 'head-circumference';
  sourceUrl: string;
  accessedOn: string;
  sha256: string | null;
  validation: DatasetValidation;
  rows: readonly { x: number; lms: Lms }[];
}

export type Eligibility =
  | { ok: true }
  | { ok: false; reason: 'sex-unspecified' | 'indicator-unsupported' | 'age-out-of-range' | 'dataset-missing' };

export function eligibility(ds: GrowthReferenceDataset | undefined, input: { sex: ReferenceSex | null; ageInUnit: number | null }): Eligibility {
  if (!input.sex) return { ok: false, reason: 'sex-unspecified' };
  if (!ds) return { ok: false, reason: 'dataset-missing' };
  if (input.ageInUnit == null || input.ageInUnit < ds.ageMin || input.ageInUnit > ds.ageMax) return { ok: false, reason: 'age-out-of-range' };
  return { ok: true };
}

/** Points of one reference curve (by z) for drawing. Interpolation between table rows only. */
export function curve(ds: GrowthReferenceDataset, z: number, step: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let x = ds.ageMin; x <= ds.ageMax + 1e-9; x += step) {
    const lms = interpolateLms(ds.rows, Math.min(x, ds.ageMax));
    if (lms) out.push({ x, y: valueFromZ(lms, z) });
  }
  return out;
}

/**
 * Percentile/z output is switched off until a dataset is validated against an
 * independent reference (docs/growth-references.md). This is the single gate.
 */
export function percentileAvailable(ds: GrowthReferenceDataset): boolean {
  return ds.validation === 'validated';
}
