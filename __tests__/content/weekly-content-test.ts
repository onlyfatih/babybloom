import { allBundledEntries, createBundledSource } from '@/content/pregnancy';
import { isDisplayable, validateWeeklyContent } from '@/content/schemas/weekly-content';
import { illustrationFor } from '@/content/illustrations';

describe('bundled weekly content', () => {
  it.each(allBundledEntries.map((e) => [e.id, e] as const))('%s is structurally valid', (_id, entry) => {
    expect(validateWeeklyContent(entry)).toEqual([]);
  });

  it('every entry has an illustration with an accessibility description and provenance', () => {
    for (const e of allBundledEntries) {
      const ill = illustrationFor(e.illustrationId);
      expect(ill.accessibilityLabel.length).toBeGreaterThan(10);
      expect(ill.license).toBeTruthy();
    }
  });

  it('the production gate shows no demo or unreviewed content', () => {
    const prod = createBundledSource(allBundledEntries, 'production');
    expect(prod.coverage('tr')).toEqual([]);
    expect(allBundledEntries.filter((e) => isDisplayable(e, 'production'))).toEqual([]);
  });

  it('the prototype gate shows the labelled demo weeks', () => {
    const proto = createBundledSource(allBundledEntries, 'prototype');
    expect(proto.coverage('tr')).toEqual([8, 12, 20, 24, 32, 38]);
    expect(proto.getWeek('tr', 13)).toBeNull();
  });
});
