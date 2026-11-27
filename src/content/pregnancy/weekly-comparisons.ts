/**
 * PregnancyContentProvider — sourced weekly size comparisons (weeks 4–40).
 *
 * Facts only: object, comparison basis and approximate length exactly as the
 * NHS page states them (docs/sources/nhs-weekly-matrix.md, all pages read
 * 2026-11-27). No weights: no NHS week page gives one. Nothing interpolated.
 * Turkish object names are our translation and need editorial review.
 *
 * Artwork is referenced by id only; the artwork registry never holds facts.
 * Week indexing: completed gestational weeks from LMP day 0 (docs/date-rules.md).
 */
export const COMPARISON_SOURCE = {
  publisher: 'NHS',
  title: 'Best Start in Life: week-by-week guide to pregnancy',
  baseUrl: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/',
  accessedOn: '2026-11-27',
} as const;

export const COMPARISON_SCHEMA_VERSION = 1;
export const COMPARISON_CONTENT_VERSION = '0.1.0-draft';

/** size = "the size of"; length = "the length of"; size-and-weight = "the size and weight of". Never an individual measurement. */
export type ComparisonBasis = 'size' | 'length' | 'size-and-weight';
/** crown-rump = NHS "from head to bottom"; crown-heel = "head to heel/toe"; unstated = page gives no convention. */
export type LengthConvention = 'crown-rump' | 'crown-heel' | 'unstated';

export interface WeeklyComparison {
  week: number;
  weekIndexing: 'completed-weeks-from-lmp';
  locale: 'tr';
  objectEn: string;
  objectTr: string;
  basis: ComparisonBasis;
  /** Approximate, as published. Null when the source gives none. */
  length: { value: number; unit: 'mm' | 'cm'; convention: LengthConvention } | null;
  /** No NHS week page gives a baby weight; kept for schema completeness. */
  weight: null;
  illustrationId: string | null;
  animationId: 'gentle-sway' | null;
  sourcePath: string;
  editorialStatus: 'draft';
  version: string;
}

type Row = Omit<WeeklyComparison, 'weekIndexing' | 'locale' | 'weight' | 'animationId' | 'editorialStatus' | 'version'>;

const ROWS: Row[] = [
  { week: 4, objectEn: 'a poppy seed', objectTr: 'bir haşhaş tohumu', basis: 'size', length: { value: 2, unit: 'mm', convention: 'unstated' }, illustrationId: null, sourcePath: '1st-trimester/week-4/' },
  { week: 5, objectEn: 'a sesame seed', objectTr: 'bir susam tohumu', basis: 'size', length: { value: 2, unit: 'mm', convention: 'unstated' }, illustrationId: null, sourcePath: '1st-trimester/week-5/' },
  { week: 6, objectEn: 'a pea', objectTr: 'bir bezelye tanesi', basis: 'size', length: { value: 6, unit: 'mm', convention: 'unstated' }, illustrationId: null, sourcePath: '1st-trimester/week-6/' },
  { week: 7, objectEn: 'a grape', objectTr: 'bir üzüm tanesi', basis: 'size', length: { value: 10, unit: 'mm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '1st-trimester/week-7/' },
  { week: 8, objectEn: 'a raspberry', objectTr: 'bir ahududu', basis: 'size', length: { value: 16, unit: 'mm', convention: 'unstated' }, illustrationId: null, sourcePath: '1st-trimester/week-8/' },
  { week: 9, objectEn: 'a strawberry', objectTr: 'bir çilek', basis: 'size', length: { value: 22, unit: 'mm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '1st-trimester/week-9/' },
  { week: 10, objectEn: 'a small apricot', objectTr: 'küçük bir kayısı', basis: 'size', length: { value: 30, unit: 'mm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '1st-trimester/week-10/' },
  { week: 11, objectEn: 'a fig', objectTr: 'bir incir', basis: 'size', length: { value: 41, unit: 'mm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '1st-trimester/week-11/' },
  { week: 12, objectEn: 'a plum', objectTr: 'bir erik', basis: 'size', length: { value: 5.4, unit: 'cm', convention: 'crown-rump' }, illustrationId: 'plum', sourcePath: '1st-trimester/week-12/' },
  { week: 13, objectEn: 'a peach', objectTr: 'bir şeftali', basis: 'size', length: { value: 7.4, unit: 'cm', convention: 'unstated' }, illustrationId: null, sourcePath: '2nd-trimester/week-13/' },
  { week: 14, objectEn: 'a kiwi fruit', objectTr: 'bir kivi', basis: 'size', length: { value: 8.5, unit: 'cm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '2nd-trimester/week-14/' },
  { week: 15, objectEn: 'an apple', objectTr: 'bir elma', basis: 'size', length: { value: 10.1, unit: 'cm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '2nd-trimester/week-15/' },
  { week: 16, objectEn: 'an avocado', objectTr: 'bir avokado', basis: 'size', length: { value: 11.6, unit: 'cm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '2nd-trimester/week-16/' },
  { week: 17, objectEn: 'a pomegranate', objectTr: 'bir nar', basis: 'size', length: { value: 12, unit: 'cm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '2nd-trimester/week-17/' },
  { week: 18, objectEn: 'a bell pepper', objectTr: 'bir dolmalık biber', basis: 'size', length: { value: 14.2, unit: 'cm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '2nd-trimester/week-18/' },
  { week: 19, objectEn: 'a beef tomato', objectTr: 'iri bir domates', basis: 'size', length: { value: 15.3, unit: 'cm', convention: 'crown-rump' }, illustrationId: null, sourcePath: '2nd-trimester/week-19/' },
  { week: 20, objectEn: 'a banana', objectTr: 'bir muz', basis: 'size', length: { value: 25.6, unit: 'cm', convention: 'crown-heel' }, illustrationId: 'banana', sourcePath: '2nd-trimester/week-20/' },
  { week: 21, objectEn: 'a carrot', objectTr: 'bir havuç', basis: 'size', length: { value: 26.7, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '2nd-trimester/week-21/' },
  { week: 22, objectEn: 'a sweet potato', objectTr: 'bir tatlı patates', basis: 'size', length: { value: 27.8, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '2nd-trimester/week-22/' },
  { week: 23, objectEn: 'a large mango', objectTr: 'büyük bir mango', basis: 'size', length: { value: 28.9, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '2nd-trimester/week-23/' },
  { week: 24, objectEn: 'a corn on the cob', objectTr: 'bir mısır koçanı', basis: 'size', length: { value: 30, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '2nd-trimester/week-24/' },
  { week: 25, objectEn: 'a courgette', objectTr: 'bir sakız kabağı', basis: 'size', length: { value: 34.6, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '2nd-trimester/week-25/' },
  { week: 26, objectEn: 'a cucumber', objectTr: 'bir salatalık', basis: 'size', length: { value: 35.6, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '2nd-trimester/week-26/' },
  { week: 27, objectEn: 'a head of cauliflower', objectTr: 'bir karnabahar', basis: 'size', length: { value: 36.6, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '2nd-trimester/week-27/' },
  { week: 28, objectEn: 'an aubergine', objectTr: 'bir patlıcan', basis: 'size', length: { value: 37.6, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-28/' },
  { week: 29, objectEn: 'a butternut squash', objectTr: 'bir butternut kabağı', basis: 'size', length: { value: 38.6, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-29/' },
  { week: 30, objectEn: 'a cabbage', objectTr: 'bir lahana', basis: 'size', length: { value: 39.9, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-30/' },
  { week: 31, objectEn: 'a coconut', objectTr: 'bir hindistancevizi', basis: 'size-and-weight', length: { value: 41.1, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-31/' },
  { week: 32, objectEn: 'a bunch of celery', objectTr: 'bir demet sap kereviz', basis: 'length', length: { value: 42.4, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-32/' },
  { week: 33, objectEn: 'a pineapple', objectTr: 'bir ananas', basis: 'size', length: { value: 43.7, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-33/' },
  { week: 34, objectEn: 'a cantaloupe melon', objectTr: 'bir kantalup kavunu', basis: 'size', length: { value: 45, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-34/' },
  { week: 35, objectEn: 'a honeydew melon', objectTr: 'bir bal kavunu', basis: 'size', length: { value: 46.2, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-35/' },
  { week: 36, objectEn: 'a romaine lettuce', objectTr: 'bir marul', basis: 'size', length: { value: 47.4, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-36/' },
  { week: 37, objectEn: 'a leek', objectTr: 'bir pırasa', basis: 'length', length: { value: 48.6, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-37/' },
  { week: 38, objectEn: 'a stick of rhubarb', objectTr: 'bir ravent sapı', basis: 'length', length: { value: 49.8, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-38/' },
  { week: 39, objectEn: 'a watermelon', objectTr: 'bir karpuz', basis: 'size', length: { value: 50.7, unit: 'cm', convention: 'crown-heel' }, illustrationId: null, sourcePath: '3rd-trimester/week-39/' },
  { week: 40, objectEn: 'a pumpkin', objectTr: 'bir balkabağı', basis: 'size', length: { value: 51.2, unit: 'cm', convention: 'crown-heel' }, illustrationId: 'pumpkin', sourcePath: '3rd-trimester/week-40/' },
];

export const SUPPORTED_COMPARISON_WEEKS = { first: 4, last: 40 } as const;

const BY_WEEK = new Map<number, WeeklyComparison>(
  ROWS.map((r) => [r.week, { ...r, weekIndexing: 'completed-weeks-from-lmp', locale: 'tr', weight: null, animationId: r.illustrationId ? 'gentle-sway' : null, editorialStatus: 'draft', version: COMPARISON_CONTENT_VERSION }]),
);

/** Returns null outside weeks 4–40: no fabricated content before or after. */
export function comparisonForWeek(week: number): WeeklyComparison | null {
  return BY_WEEK.get(week) ?? null;
}

export function allComparisons(): WeeklyComparison[] {
  return [...BY_WEEK.values()];
}
