/**
 * GrowthChartPresentation model: turns personal measurements + a reference
 * dataset into drawable series. Pure; tested in __tests__/features/growth-chart-model-test.ts.
 * Holds no reference numbers: curves come from the dataset passed in.
 */
import { daysBetween, LocalDate } from '@/domain/dates/local-date';
import { curve, eligibility, GrowthReferenceDataset, percentileAvailable, ReferenceSex } from '@/domain/growth/reference';
import type { GrowthMeasurement } from '@/domain/model';

/** WHO: 1 month = 30.4375 days (WHO instructions for the growth tables). */
export const DAYS_PER_MONTH = 30.4375;
/** Two measurements further apart than this are not joined with a solid line. */
export const GAP_DAYS = 120;

export interface ChartPoint {
  id: string;
  date: LocalDate;
  ageDays: number;
  ageMonths: number;
  valueKg: number;
  /** Whether the point lies inside the loaded reference table. */
  inReferenceRange: boolean;
}

export interface ChartModel {
  points: ChartPoint[];
  segments: { from: ChartPoint; to: ChartPoint; gap: boolean }[];
  median: { x: number; y: number }[] | null;
  band: { lower: { x: number; y: number }[]; upper: { x: number; y: number }[] } | null;
  referenceMaxMonths: number | null;
  percentilesEnabled: boolean;
  referenceState: 'shown' | 'sex-unspecified' | 'source-off' | 'dataset-missing';
}

export function buildChartModel(input: {
  birthDate: LocalDate;
  measurements: GrowthMeasurement[];
  dataset: GrowthReferenceDataset | undefined;
  sex: ReferenceSex | null;
  sourceOn: boolean;
  advanced: boolean;
}): ChartModel {
  const points: ChartPoint[] = input.measurements
    .filter((m) => m.kind === 'weight' && m.canonicalValue > 0)
    .map((m) => {
      const ageDays = daysBetween(input.birthDate, m.measuredOn);
      const ageMonths = ageDays / DAYS_PER_MONTH;
      return {
        id: m.id,
        date: m.measuredOn,
        ageDays,
        ageMonths,
        valueKg: m.canonicalValue / 1000,
        inReferenceRange: !!input.dataset && eligibility(input.dataset, { sex: input.sex ?? 'female', ageInUnit: ageMonths }).ok,
      };
    })
    .filter((p) => p.ageDays >= 0)
    .sort((a, b) => a.ageDays - b.ageDays);

  const segments = points.slice(1).map((to, i) => ({ from: points[i]!, to, gap: to.ageDays - points[i]!.ageDays > GAP_DAYS }));

  let referenceState: ChartModel['referenceState'] = 'shown';
  if (!input.sex) referenceState = 'sex-unspecified';
  else if (!input.sourceOn) referenceState = 'source-off';
  else if (!input.dataset) referenceState = 'dataset-missing';

  const ds = referenceState === 'shown' ? input.dataset! : null;
  return {
    points,
    segments,
    median: ds ? curve(ds, 0, 0.25) : null,
    band: ds && input.advanced ? { lower: curve(ds, -2, 0.25), upper: curve(ds, 2, 0.25) } : null,
    referenceMaxMonths: ds ? ds.ageMax : null,
    percentilesEnabled: ds ? percentileAvailable(ds) : false,
    referenceState,
  };
}
