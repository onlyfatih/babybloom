import { displayValue, normalizeMeasurement, parseDecimal, toCanonical } from '@/domain/measurements/units';

describe('measurement normalization', () => {
  it('parses Turkish decimal comma and dot', () => {
    expect(parseDecimal('3,45')).toBe(3.45);
    expect(parseDecimal('3.45')).toBe(3.45);
    expect(parseDecimal('3,4,5')).toBeNull();
    expect(parseDecimal('-2')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });

  it('converts to canonical grams/millimetres with half-up rounding', () => {
    expect(toCanonical(3.45, 'kg')).toBe(3450);
    expect(toCanonical(7.5, 'lb')).toBe(3402); // 3401.94 g
    expect(toCanonical(50.5, 'cm')).toBe(505);
    expect(toCanonical(20, 'in')).toBe(508);
    expect(toCanonical(3450, 'g')).toBe(3450);
  });

  it('round-trips for display within the documented precision', () => {
    expect(displayValue(3402, 'lb')).toBe(7.5);
    expect(displayValue(3450, 'kg')).toBe(3.45);
    expect(displayValue(505, 'cm')).toBe(50.5);
    expect(displayValue(508, 'in')).toBe(20);
  });

  it('rejects impossible input without medical judgement', () => {
    expect(normalizeMeasurement('weight', '', 'kg')).toEqual({ ok: false, error: 'empty' });
    expect(normalizeMeasurement('weight', '0', 'kg')).toEqual({ ok: false, error: 'not-positive' });
    expect(normalizeMeasurement('weight', '3500', 'kg')).toEqual({ ok: false, error: 'implausible' });
    expect(normalizeMeasurement('weight', '3500', 'g')).toEqual({ ok: true, canonicalValue: 3500 });
    expect(normalizeMeasurement('length', '3', 'kg')).toEqual({ ok: false, error: 'unit-mismatch' });
    expect(normalizeMeasurement('head-circumference', '34,5', 'cm')).toEqual({ ok: true, canonicalValue: 345 });
  });
});
