/**
 * Measurement units and normalization. See docs/data-model.md#measurements.
 *
 * Canonical storage: integer grams (weight), integer millimetres (length, head).
 * - Input is converted to canonical and rounded half-up to the nearest integer.
 * - 1 lb = 453.59237 g (exact, international avoirdupois pound).
 * - 1 in = 25.4 mm (exact).
 * Display rounding: see DISPLAY_DECIMALS (kg/lb 2 decimals, g 0, cm/in 1).
 *
 * Plausibility ranges catch typos (e.g. "35" kg for a newborn meant 3.5).
 * They are NOT medical reference ranges and produce no interpretation.
 */
import type { MeasurementKind } from '../model';

export type WeightUnit = 'kg' | 'g' | 'lb';
export type LengthUnit = 'cm' | 'in';
export type MeasurementUnit = WeightUnit | LengthUnit;

export const UNITS_BY_KIND: Record<MeasurementKind, readonly MeasurementUnit[]> = {
  weight: ['kg', 'g', 'lb'],
  length: ['cm', 'in'],
  'head-circumference': ['cm', 'in'],
};

const TO_CANONICAL: Record<MeasurementUnit, number> = {
  kg: 1000,
  g: 1,
  lb: 453.59237,
  cm: 10,
  in: 25.4,
};

/** Plausible canonical ranges, inclusive (grams / millimetres). */
export const PLAUSIBLE_RANGE: Record<MeasurementKind, { min: number; max: number }> = {
  weight: { min: 300, max: 150_000 },
  length: { min: 200, max: 2_200 },
  'head-circumference': { min: 200, max: 650 },
};

export type MeasurementInputError = 'empty' | 'not-a-number' | 'not-positive' | 'implausible' | 'unit-mismatch';

/** Accepts Turkish decimal comma ("3,45") and dot ("3.45"). */
export function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) return null;
  return Number(trimmed.replace(',', '.'));
}

export function toCanonical(value: number, unit: MeasurementUnit): number {
  return Math.round(value * TO_CANONICAL[unit]);
}

export function fromCanonical(canonical: number, unit: MeasurementUnit): number {
  return canonical / TO_CANONICAL[unit];
}

export function normalizeMeasurement(
  kind: MeasurementKind,
  raw: string,
  unit: MeasurementUnit,
): { ok: true; canonicalValue: number } | { ok: false; error: MeasurementInputError } {
  if (!UNITS_BY_KIND[kind].includes(unit)) return { ok: false, error: 'unit-mismatch' };
  if (raw.trim() === '') return { ok: false, error: 'empty' };
  const value = parseDecimal(raw);
  if (value === null) return { ok: false, error: 'not-a-number' };
  if (value <= 0) return { ok: false, error: 'not-positive' };
  const canonicalValue = toCanonical(value, unit);
  const range = PLAUSIBLE_RANGE[kind];
  if (canonicalValue < range.min || canonicalValue > range.max) return { ok: false, error: 'implausible' };
  return { ok: true, canonicalValue };
}

/** Display precision per unit. */
export const DISPLAY_DECIMALS: Record<MeasurementUnit, number> = { kg: 2, g: 0, lb: 2, cm: 1, in: 1 };

export function displayValue(canonical: number, unit: MeasurementUnit): number {
  const decimals = DISPLAY_DECIMALS[unit];
  const factor = 10 ** decimals;
  return Math.round(fromCanonical(canonical, unit) * factor) / factor;
}

export function defaultUnit(kind: MeasurementKind, system: 'metric' | 'imperial'): MeasurementUnit {
  if (kind === 'weight') return system === 'metric' ? 'kg' : 'lb';
  return system === 'metric' ? 'cm' : 'in';
}
