/**
 * LMS engine against numbers it did NOT produce:
 * 1. WHO's own printed percentiles (PDF, 1 decimal) — our valueFromZ must round to them.
 * 2. z-scores from rcpchgrowth, an independent implementation using WHO's daily table
 *    (data-pipeline/growth/fixtures/rcpch-wfa-z-fixtures.json). Tolerance 0.01 z.
 */
import { interpolateLms, normalCdf, valueFromZ, zFromValue } from '@/domain/growth/lms';
import { curve, eligibility, percentileAvailable } from '@/domain/growth/reference';
import { growthReferences } from '@/content/growth-references';

import printed from '../../data-pipeline/growth/fixtures/who-wfa-pdf-printed.json';
import rcpch from '../../data-pipeline/growth/fixtures/rcpch-wfa-z-fixtures.json';

const tables = printed as Record<'female' | 'male', Record<string, number>[]>;
const Z: Record<string, number> = { P3: -1.880793608, P15: -1.036433389, P50: 0, P85: 1.036433389, P97: 1.880793608 };
const round1 = (x: number) => Math.floor(x * 10 + 0.5) / 10;

describe('valueFromZ reproduces WHO printed percentiles', () => {
  it.each(['female', 'male'] as const)('%s', (sex) => {
    for (const r of tables[sex]) {
      for (const [col, z] of Object.entries(Z)) {
        expect(round1(valueFromZ({ L: r.L!, M: r.M!, S: r.S! }, z))).toBeCloseTo(r[col]!, 5);
      }
    }
  });
});

describe('zFromValue matches an independent implementation', () => {
  const data = rcpch as { cases: { sex: 'female' | 'male'; ageMonths: number; weightKg: number; zRcpch: number }[] };
  it(`${data.cases.length} cases within 0.01 z`, () => {
    expect(data.cases.length).toBeGreaterThan(200);
    for (const c of data.cases) {
      const ds = growthReferences.find('WHO', 'weight-for-age', c.sex)!;
      const r = zFromValue(ds.rows.find((row) => row.x === c.ageMonths)!.lms, c.weightKg);
      expect(r.kind).toBe('z');
      if (r.kind === 'z') expect(Math.abs(r.z - c.zRcpch)).toBeLessThanOrEqual(0.01);
    }
  });
});

describe('LMS edge cases', () => {
  it('L = 0 uses the log form in both directions', () => {
    const lms = { L: 0, M: 10, S: 0.1 };
    expect(valueFromZ(lms, 1)).toBeCloseTo(10 * Math.exp(0.1), 10);
    const z = zFromValue(lms, 10 * Math.exp(0.1));
    expect(z.kind === 'z' && z.z).toBeCloseTo(1, 10);
  });
  it('L near zero is continuous with L = 0', () => {
    expect(valueFromZ({ L: 1e-9, M: 10, S: 0.1 }, 2)).toBeCloseTo(valueFromZ({ L: 0, M: 10, S: 0.1 }, 2), 6);
  });
  it('|z| > 3 is reported as outside the validated range, not as a number', () => {
    expect(zFromValue({ L: 0.1, M: 10, S: 0.1 }, 20).kind).toBe('beyond-validated-range');
  });
  it('rejects zero, negative and non-numeric measurements', () => {
    expect(zFromValue({ L: 0.1, M: 10, S: 0.1 }, 0).kind).toBe('invalid-input');
    expect(zFromValue({ L: 0.1, M: 10, S: 0.1 }, -1).kind).toBe('invalid-input');
    expect(zFromValue({ L: 0.1, M: 10, S: 0.1 }, NaN).kind).toBe('invalid-input');
  });
  it('normalCdf matches known values', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.880793608)).toBeCloseTo(0.97, 5);
    expect(normalCdf(-2)).toBeCloseTo(0.0227501, 5);
  });
});

describe('interpolation boundaries', () => {
  const rows = [{ x: 0, lms: { L: 0, M: 1, S: 0.1 } }, { x: 1, lms: { L: 0.2, M: 3, S: 0.3 } }];
  it('returns table rows exactly at their ages and interpolates linearly between', () => {
    expect(interpolateLms(rows, 0)).toEqual(rows[0]!.lms);
    expect(interpolateLms(rows, 1)).toEqual(rows[1]!.lms);
    expect(interpolateLms(rows, 0.5)!.M).toBeCloseTo(2, 10);
  });
  it('never extrapolates', () => {
    expect(interpolateLms(rows, -0.01)).toBeNull();
    expect(interpolateLms(rows, 1.01)).toBeNull();
  });
});

describe('reference eligibility and gates', () => {
  const ds = growthReferences.find('WHO', 'weight-for-age', 'female');
  it('needs an explicit reference sex', () => {
    expect(eligibility(ds, { sex: null, ageInUnit: 3 })).toEqual({ ok: false, reason: 'sex-unspecified' });
  });
  it('selects separate female and male series', () => {
    expect(growthReferences.find('WHO', 'weight-for-age', 'female')!.rows[0]!.lms.M).toBe(3.2322);
    expect(growthReferences.find('WHO', 'weight-for-age', 'male')!.rows[0]!.lms.M).toBe(3.3464);
  });
  it('rejects ages outside the loaded table and missing indicators', () => {
    expect(eligibility(ds, { sex: 'female', ageInUnit: 24 }).ok).toBe(true);
    expect(eligibility(ds, { sex: 'female', ageInUnit: 24.1 })).toEqual({ ok: false, reason: 'age-out-of-range' });
    expect(eligibility(growthReferences.find('WHO', 'head-circumference-for-age', 'female'), { sex: 'female', ageInUnit: 3 })).toEqual({ ok: false, reason: 'dataset-missing' });
    expect(growthReferences.find('CDC', 'weight-for-age', 'female')).toBeUndefined();
  });
  it('keeps percentiles off for every bundled dataset until validation passes', () => {
    for (const d of growthReferences.all()) expect(percentileAvailable(d)).toBe(false);
  });
  it('draws a curve only inside the table', () => {
    const pts = curve(ds!, 0, 0.5);
    expect(pts[0]!.x).toBe(0);
    expect(pts[pts.length - 1]!.x).toBeCloseTo(24, 6);
  });
});
