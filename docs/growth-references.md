# Growth references: engine rules, validation and status

_Updated 2026-11-27._ **Percentiles are off in the app.** Every bundled
dataset has `validation: 'unvalidated-prototype'`, and
`percentileAvailable()` (`src/domain/growth/reference.ts`) returns true only
for `'validated'`. Nothing in the UI shows a percentile or z-score for a
measurement.

## Policy

- Default reference: WHO Child Growth Standards (2006), 0–24 months
  (`DEFAULT_REFERENCE` in `src/content/growth-references/index.ts`).
- CDC: optional, off until its files are downloaded and validated.
- AAP: guidance text only. AAP publishes no dataset, so there is never an
  "AAP curve" (source: AAP Term Infant Growth Tools page, read 2026-11-27).
- A reference is drawn only after the parent picks a reference sex. With
  "Belirtilmedi" the chart shows only the child's own measurements.
- Corrected age for preterm birth: not implemented (no verified method).
- Parent-facing words are neutral. No "normal", "low", "risk", no colours that
  imply judgement.

## Calculation (`src/domain/growth/lms.ts`)

| Rule | Implementation |
| --- | --- |
| Value from z | X = M·(1 + L·S·z)^(1/L); if \|L\| < 1e-12: X = M·exp(S·z) |
| z from value | z = ((X/M)^L − 1)/(L·S); if \|L\| < 1e-12: z = ln(X/M)/S |
| Interpolation | Linear in L, M and S between the two neighbouring table rows (`interpolateLms`). Exact on rows. |
| Extrapolation | None. Outside the table → `null`; eligibility reports `age-out-of-range` |
| \|z\| > 3 | Returns `beyond-validated-range`. WHO uses a restricted LMS rule there; it is not implemented until verified from the WHO methods report |
| Invalid input | Non-positive or non-finite value/M/S → `invalid-input` |
| Age unit | WHO: 1 month = 30.4375 days. Prototype data is monthly; step E switches to WHO daily expanded tables (0–1856 days) |
| Length vs height | WHO tables change from length to height between day 730 and 731. Not modelled yet: measurement method is not recorded (P2.1 #6) |

## Validation: what has and has not been checked

There are two different checks. Only the second is independent.

1. **Table internal consistency** (`data-pipeline/growth/check_table_consistency.py`,
   report `data-pipeline/growth/reports/table-consistency.md`).
   For each of the 550 percentile values printed in the WHO weight-for-age
   PDFs (girls and boys, months 0–24, 11 percentiles), the value is recomputed
   from **the same row's** L, M, S, rounded half-up to the printed precision
   (0.1 kg) and compared for equality. All 550 matched **after rounding**;
   the largest raw difference before rounding was 0.0500 kg, which is the
   rounding itself. This shows the transcription is self-consistent. It does
   **not** validate the engine against an independent source.
2. **Independent cross-check** (`data-pipeline/growth/cross_check_rcpch.py`,
   report `data-pipeline/growth/reports/independent-cross-check.md`).
   250 cases (2 sexes × months 0–24 × weights at 0.8–1.25 × median,
   \|z\| ≤ 3). z from our LMS rows vs `rcpchgrowth` 4.6.5 (RCPCH, which uses the
   WHO daily table). Tolerance \|Δz\| ≤ 0.01. Max \|Δz\| = 0.00257, 0 over
   tolerance: PASS. rcpchgrowth is AGPL-3.0: used only as an external tool,
   never bundled. Its outputs are stored as test fixtures
   (`fixtures/rcpch-wfa-z-fixtures.json`) and asserted in
   `__tests__/domain/growth-lms-test.ts`.

**Still missing before percentiles can be switched on (step E):**

- Official machine-readable WHO expanded tables (daily L, M, S, and z-score
  columns) downloaded with checksums (`fetch_raw.py`, needs the `babybloom`
  environment). The PDF transcription is not a machine-readable source.
- Validation of the engine against WHO's own published z-score columns in
  those files, every indicator and both sexes, plus the rcpch cross-check
  repeated on the daily data.
- WHO restricted-LMS rule beyond ±3 SD verified from the methods report.
- Measurement method (length/height) and source on each measurement.

Only when all of these pass may a dataset be marked `'validated'`.

## Reproducing

```sh
python3 -I data-pipeline/growth/build_prototype_dataset.py   # CSV fixtures → prototype JSON
python3 -I data-pipeline/growth/check_table_consistency.py   # internal consistency report
python3 -m venv /tmp/rcvenv && /tmp/rcvenv/bin/pip install rcpchgrowth==4.6.5
/tmp/rcvenv/bin/python -I data-pipeline/growth/cross_check_rcpch.py   # independent cross-check
npx jest __tests__/domain/growth-lms-test.ts
```
