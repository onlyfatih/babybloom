/**
 * GrowthReferenceRepository (bundled). Datasets are generated files; never
 * edit them by hand. Regenerate with data-pipeline/growth/*.py.
 * Adding a dataset: put its JSON here, register it below, document it in
 * docs/growth-references.md.
 */
import type { GrowthIndicator, GrowthReferenceDataset, ReferencePublisher, ReferenceSex } from '@/domain/growth/reference';
import whoWfaFemale from './who/wfa-female-monthly-0-24.prototype.json';
import whoWfaMale from './who/wfa-male-monthly-0-24.prototype.json';

const DATASETS: readonly GrowthReferenceDataset[] = [whoWfaFemale as GrowthReferenceDataset, whoWfaMale as GrowthReferenceDataset];

export const growthReferences = {
  all: (): readonly GrowthReferenceDataset[] => DATASETS,
  find(publisher: ReferencePublisher, indicator: GrowthIndicator, sex: ReferenceSex): GrowthReferenceDataset | undefined {
    return DATASETS.find((d) => d.publisher === publisher && d.indicator === indicator && d.sex === sex);
  },
};

/**
 * Default reference policy: WHO from birth to 2 years, as recommended by CDC
 * and AAP (docs/sources/growth-source-inventory.md). Change here only.
 */
export const DEFAULT_REFERENCE: ReferencePublisher = 'WHO';
