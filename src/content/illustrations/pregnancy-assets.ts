/**
 * PregnancyAssetRegistry — artwork only. Never holds sizes or text facts;
 * weekly facts live in src/content/pregnancy/weekly-comparisons.ts and point
 * here by `illustrationId`. Provenance table: assets/pregnancy/README.md.
 *
 * Replace an illustration: drop new @2x/@3x PNGs into assets/pregnancy/ with
 * the same id (or a new id + entry here) and bump `version`.
 */
import type { MessageKey } from '@/content/localization';

export type AssetStatus = 'temporary-sample' | 'final';

export interface PregnancyAsset {
  id: string;
  /** Metro picks @2x / @3x automatically. */
  source: number;
  altKey: MessageKey;
  creator: string;
  provenance: string;
  rights: string;
  version: string;
  status: AssetStatus;
  /** Square, so every week keeps the same aspect ratio (no layout shift). */
  aspectRatio: 1;
}

const CODE_AUTHORED = {
  creator: 'Hand-written SVG by Claude (code), rendered with Chromium (scripts/art/render.mjs); no image-generation model',
  rights: 'Original work for Minik Atlas',
  status: 'temporary-sample' as const,
  aspectRatio: 1 as const,
};

const ASSETS: Record<string, PregnancyAsset> = {
  plum: { id: 'plum', source: require('../../../assets/pregnancy/plum.png'), altKey: 'art.plum', provenance: 'art/pregnancy/src/plum.svg', version: '0.1.0', ...CODE_AUTHORED },
  banana: { id: 'banana', source: require('../../../assets/pregnancy/banana.png'), altKey: 'art.banana', provenance: 'art/pregnancy/src/banana.svg', version: '0.1.0', ...CODE_AUTHORED },
  pumpkin: { id: 'pumpkin', source: require('../../../assets/pregnancy/pumpkin.png'), altKey: 'art.pumpkin', provenance: 'art/pregnancy/src/pumpkin.svg', version: '0.1.0', ...CODE_AUTHORED },
};

export function pregnancyAsset(id: string | null | undefined): PregnancyAsset | null {
  return id ? (ASSETS[id] ?? null) : null;
}

export function allPregnancyAssets(): PregnancyAsset[] {
  return Object.values(ASSETS);
}
