import { allPregnancyAssets, pregnancyAsset } from '@/content/illustrations/pregnancy-assets';
import { t } from '@/content/localization';
import { allComparisons, comparisonForWeek } from '@/content/pregnancy/weekly-comparisons';

describe('sourced weekly comparisons', () => {
  it('covers exactly weeks 4–40, one entry each', () => {
    const weeks = allComparisons().map((c) => c.week);
    expect(weeks).toEqual(Array.from({ length: 37 }, (_, i) => i + 4));
  });
  it('returns nothing before week 4 or after week 40 (no fabricated content)', () => {
    expect(comparisonForWeek(3)).toBeNull();
    expect(comparisonForWeek(41)).toBeNull();
    expect(comparisonForWeek(0)).toBeNull();
  });
  it('never mixes length conventions silently: crown-rump never after 19, crown-heel never before 20', () => {
    for (const c of allComparisons()) {
      if (c.length?.convention === 'crown-rump') expect(c.week).toBeLessThanOrEqual(19);
      if (c.length?.convention === 'crown-heel') expect(c.week).toBeGreaterThanOrEqual(20);
    }
    expect(comparisonForWeek(19)!.length).toEqual({ value: 15.3, unit: 'cm', convention: 'crown-rump' });
    expect(comparisonForWeek(20)!.length).toEqual({ value: 25.6, unit: 'cm', convention: 'crown-heel' });
  });
  it('carries no weights (the source gives none) and stays draft', () => {
    for (const c of allComparisons()) {
      expect(c.weight).toBeNull();
      expect(c.editorialStatus).toBe('draft');
    }
  });
  it('every referenced illustration exists and has Turkish alt text', () => {
    for (const c of allComparisons().filter((x) => x.illustrationId)) {
      const asset = pregnancyAsset(c.illustrationId);
      expect(asset).not.toBeNull();
      expect(t(asset!.altKey).length).toBeGreaterThan(10);
    }
  });
  it('all artwork is still marked as a temporary sample', () => {
    expect(allPregnancyAssets().map((a) => a.status)).toEqual(['temporary-sample', 'temporary-sample', 'temporary-sample']);
  });
});
