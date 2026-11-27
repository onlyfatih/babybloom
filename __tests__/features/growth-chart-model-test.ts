import { growthReferences } from '@/content/growth-references';
import { addDays, localDate } from '@/domain/dates/local-date';
import type { GrowthMeasurement } from '@/domain/model';
import { buildChartModel, DAYS_PER_MONTH } from '@/features/growth-chart/chart-model';

const birth = localDate('2024-02-29'); // leap day birth
const m = (id: string, days: number, grams: number, kind: GrowthMeasurement['kind'] = 'weight'): GrowthMeasurement => ({
  id, familyId: 'f', childId: 'c', kind, canonicalValue: grams, enteredUnit: 'kg', measuredOn: addDays(birth, days), isBirthMeasurement: days === 0, authorId: 'u', createdAt: '',
});
const items = [m('a', 0, 3300), m('b', 40, 4600), m('c', 220, 7900), m('d', 760, 11800), m('e', 100, 450, 'length')];
const female = growthReferences.find('WHO', 'weight-for-age', 'female');

describe('growth chart model', () => {
  it('uses only weight entries, sorted, with WHO month = 30.4375 days', () => {
    const model = buildChartModel({ birthDate: birth, measurements: items, dataset: female, sex: 'female', sourceOn: true, advanced: false });
    expect(model.points.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(model.points[1]!.ageMonths).toBeCloseTo(40 / DAYS_PER_MONTH, 10);
    expect(model.points[1]!.valueKg).toBe(4.6);
  });
  it('dashes segments across gaps longer than 120 days', () => {
    const model = buildChartModel({ birthDate: birth, measurements: items, dataset: female, sex: 'female', sourceOn: true, advanced: false });
    expect(model.segments.map((s) => s.gap)).toEqual([false, true, true]);
  });
  it('marks points beyond the loaded table as out of range', () => {
    const model = buildChartModel({ birthDate: birth, measurements: items, dataset: female, sex: 'female', sourceOn: true, advanced: false });
    expect(model.points.map((p) => p.inReferenceRange)).toEqual([true, true, true, false]);
  });
  it('shows no reference curves when the reference sex is unspecified', () => {
    const model = buildChartModel({ birthDate: birth, measurements: items, dataset: female, sex: null, sourceOn: true, advanced: true });
    expect(model.referenceState).toBe('sex-unspecified');
    expect(model.median).toBeNull();
    expect(model.band).toBeNull();
    expect(model.points).toHaveLength(4);
  });
  it('hides curves when the source is switched off and when no dataset exists', () => {
    expect(buildChartModel({ birthDate: birth, measurements: items, dataset: female, sex: 'female', sourceOn: false, advanced: false }).referenceState).toBe('source-off');
    expect(buildChartModel({ birthDate: birth, measurements: items, dataset: undefined, sex: 'female', sourceOn: true, advanced: false }).referenceState).toBe('dataset-missing');
  });
  it('shows the extra curves only in advanced mode and never enables percentiles', () => {
    const simple = buildChartModel({ birthDate: birth, measurements: items, dataset: female, sex: 'female', sourceOn: true, advanced: false });
    const adv = buildChartModel({ birthDate: birth, measurements: items, dataset: female, sex: 'female', sourceOn: true, advanced: true });
    expect(simple.band).toBeNull();
    expect(adv.band!.lower.length).toBe(adv.median!.length);
    expect(adv.percentilesEnabled).toBe(false);
    expect(adv.median![0]!.y).toBeCloseTo(3.2322, 4);
  });
  it('ignores invalid (zero) and pre-birth measurements', () => {
    const model = buildChartModel({ birthDate: birth, measurements: [m('z', 10, 0), m('p', -5, 3000)], dataset: female, sex: 'female', sourceOn: true, advanced: false });
    expect(model.points).toHaveLength(0);
  });
});
