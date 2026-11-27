/**
 * Weekly pregnancy content schema. See docs/content-model.md.
 *
 * Week indexing: `week` is the number of COMPLETED gestational weeks counted
 * from the first day of the LMP (or EDD - 280 days). Week 12 covers 12w0d–12w6d.
 */

export type EditorialStatus = 'draft' | 'reviewed' | 'published' | 'archived';

export interface ContentSource {
  title: string;
  publisher: string;
  url: string;
  accessedOn: string; // YYYY-MM-DD
}

/** How size data (if any) is defined. Lengths change convention around week 20. */
export type MeasurementConvention = 'none' | 'crown-rump-length' | 'crown-heel-length';

export interface SizeAnalogy {
  /** e.g. "bir erik" – always shown with the approximate-analogy disclaimer. */
  objectLabel: string;
  /** Optional numeric reference. Must declare its convention and source when present. */
  approximateValue?: { value: number; unit: 'mm' | 'cm' | 'g'; convention: Exclude<MeasurementConvention, 'none'>; sourceIndex: number };
}

export interface WeeklyContent {
  /** Stable across versions, e.g. "pregnancy-week-12". */
  id: string;
  locale: string;
  week: number;
  title: string;
  summary: string;
  babyDevelopment: string[];
  parentExperience: string[];
  sizeAnalogy: SizeAnalogy | null;
  illustrationId: string;
  measurementConvention: MeasurementConvention;
  sources: ContentSource[];
  editorialStatus: EditorialStatus;
  /** Semver of this article. Bump on any text change. */
  contentVersion: string;
  reviewedOn: string | null; // YYYY-MM-DD, set only by a real reviewer
  reviewedBy: string | null;
  /** True for prototype placeholder text. Never true in a production release. */
  isDemo: boolean;
}

export interface ContentRelease {
  version: string;
  locale: string;
  releasedOn: string;
  weeks: WeeklyContent[];
}

export type ContentGate = 'production' | 'prototype';

/**
 * Which entries may be shown as health information.
 * Production: only published, reviewed, sourced, non-demo entries.
 * Prototype: also clearly-labelled demo drafts.
 */
export function isDisplayable(entry: WeeklyContent, gate: ContentGate): boolean {
  if (entry.editorialStatus === 'archived') return false;
  if (gate === 'production') {
    return entry.editorialStatus === 'published' && !entry.isDemo && entry.reviewedOn !== null && entry.sources.length > 0;
  }
  return entry.editorialStatus === 'published' || entry.isDemo;
}

/** Structural validation run in tests for every bundled entry. */
export function validateWeeklyContent(entry: WeeklyContent): string[] {
  const problems: string[] = [];
  if (entry.id !== `pregnancy-week-${entry.week}`) problems.push('id must be pregnancy-week-<week>');
  if (!Number.isInteger(entry.week) || entry.week < 4 || entry.week > 42) problems.push('week out of range 4..42');
  if (!/^\d+\.\d+\.\d+$/.test(entry.contentVersion)) problems.push('contentVersion must be semver');
  if (entry.editorialStatus === 'published' && (!entry.reviewedOn || !entry.reviewedBy)) problems.push('published requires reviewedOn and reviewedBy');
  if (entry.editorialStatus === 'published' && entry.isDemo) problems.push('demo content cannot be published');
  if (entry.isDemo && entry.reviewedOn) problems.push('demo content must not claim a review');
  if (entry.sizeAnalogy?.approximateValue) {
    const v = entry.sizeAnalogy.approximateValue;
    if (v.convention !== entry.measurementConvention) problems.push('analogy convention must match measurementConvention');
    if (!entry.sources[v.sourceIndex]) problems.push('analogy value needs a source');
  }
  if (!entry.title.trim() || !entry.summary.trim()) problems.push('title and summary required');
  return problems;
}
