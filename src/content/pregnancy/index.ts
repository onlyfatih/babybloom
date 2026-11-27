/**
 * Content provider boundary. Bundled content today; a hosted source can be
 * added later by implementing WeeklyContentSource without touching screens.
 */
import { featureFlags } from '@/infrastructure/configuration/feature-flags';
import { ContentGate, isDisplayable, WeeklyContent } from '../schemas/weekly-content';
import { demoWeeks } from './tr/demo-weeks';

export const BUNDLED_CONTENT_VERSION = '0.1.0-demo';

export interface WeeklyContentSource {
  getWeek(locale: string, week: number): WeeklyContent | null;
  coverage(locale: string): number[];
  version: string;
}

function createBundledSource(entries: WeeklyContent[], gate: ContentGate): WeeklyContentSource {
  const visible = entries.filter((e) => isDisplayable(e, gate));
  return {
    version: BUNDLED_CONTENT_VERSION,
    getWeek: (locale, week) => visible.find((e) => e.locale === locale && e.week === week) ?? null,
    coverage: (locale) => visible.filter((e) => e.locale === locale).map((e) => e.week).sort((a, b) => a - b),
  };
}

export const allBundledEntries: WeeklyContent[] = [...demoWeeks];

export const weeklyContent: WeeklyContentSource = createBundledSource(
  allBundledEntries,
  featureFlags.showDemoContent ? 'prototype' : 'production',
);

export { createBundledSource };
