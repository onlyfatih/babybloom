# Milestone M3: Pregnancy Visuals and Growth References

> **2026-11-28: deferred to R7** of docs/functional-v1-roadmap.md by the owner
> (functional V1 first). Nothing below is being worked on until then.

_Opened 2026-11-27 at the owner's request. Status: **samples waiting for the
owner's final-quality approval; data preparation continuing.** Not complete:
artwork (3 of 37 weeks, temporary), data coverage (prototype WHO weight only),
numerical validation (not done on official machine-readable data) and native
verification are all unfinished._

Owner's instructions of 2026-11-27 23:01: continue data preparation; no paid
service and no illustrator yet; the other 34 weeks only after the three
samples' final quality is approved; percentiles stay off until numerical
validation is complete.

## Scope change (recorded)

V1 (product-v1.md) excluded growth percentiles. The owner has now explicitly
scoped them in, with conditions:

- Percentiles / z-scores only from official machine-readable data, only after
  numerical validation passes, only for a parent-selected reference sex,
  never as a health judgement.
- Pregnancy size comparisons and postnatal growth references stay separate
  domains (no shared chart, no shared data types).
- Developmental skills are never described as growth percentiles.

Everything else in "Out of scope" still holds. ADR-009 in decisions.md.

## Delivery order and state

| Step | What | State |
| --- | --- | --- |
| A | Inspect project, record scope changes, P2.1 backlog | Done (this file) |
| B | Source inventory + sourced weekly matrix | Done, see `docs/sources/` |
| C | Three visual samples + chart prototype | Done. Review page source in `preview/artifact/`; in-app route `/preview/visuals` (prototype tools only) |
| D | Owner's visual approval | Waiting (final quality of the three samples) |
| E | Validated data ingestion and LMS engine | Engine + tests done on prototype data. Raw download blocked here; see docs/handoff-growth-data.md. Percentiles off |
| F | Interactive charts | Prototype in app: tap a point for details, reference-sex choice, WHO toggle, advanced ±2 SD band. Weight only |
| G | Remaining weekly assets | Not started (blocked on D) |
| H | Checks and evidence report | Partial: docs/growth-references.md, data-pipeline/growth/reports/ |

## P2.1 reliability backlog

No separate P2.1 list was written in P0–P2; these items come from
status.md "Known limitations" and the journey-check findings. Items marked
**blocker** must land before M3 production-facing features.

| # | Item | Blocks M3? |
| --- | --- | --- |
| 1 | Demo storage has no schema version; M3 adds fields to measurements and children. Add a versioned migration step for persisted demo data. | **blocker** (step E) |
| 2 | Pending media rows from an abandoned memory save are never marked `orphaned` or cleaned up. | no |
| 3 | Offline reading only works while the app is open (query cache not persisted). | no |
| 4 | New invitation codes expire after 48 h, fixture after 36 h; docs said 36 h. Align and document. | no |
| 5 | Native verification never run (photo re-encode/EXIF strip, picker permission denial, keyboard, Dynamic Type). | **blocker** for marking M3 complete |
| 6 | `GrowthMeasurement` lacks method (recumbent length vs standing height), source (home/clinician/imported) and note. | **blocker** (step E) |
| 7 | Child lacks optional reference sex and gestational age at birth. | **blocker** (step E) |

### P2.1 items from the owner's review (2026-11-27), all fixed

| # | Item | Fix | Evidence |
| --- | --- | --- | --- |
| 8 | Mutations reported success before the persistent write finished | `persist()` is awaited everywhere in the demo provider; a failed write rolls the in-memory state back and rejects with `persist-failed`. Persisted data now carries `schemaVersion` with `migrate()` (also closes #1) | `__tests__/data/reliability-test.ts` (persistence, persisted schema) |
| 9 | Export screen had no loading or error state | Shows loading until all queries settle, an error banner with retry if any fail, and disables export meanwhile | Web journey 9; manual check in web preview |
| 10 | Share result ignored | `Share.share` result is read: shared, dismissed (`dismissedAction`) and failure each show their own message | Code review; native share sheet not verified (web preview only) |
| 11 | Home screen sections had no error states | `SectionQueryState` gives measurements, appointments and memories inline loading and error-with-retry; pull-to-refresh also refetches measurements | Web journey 12 (offline) |
| 12 | Draft lifecycle | Drafts stored as `{v, savedAt, value}`, expire after 14 days, cleared on save, on "Taslağı sil", on discard and when the form is emptied; a restored draft never overwrites what the user already typed | `reliability-test.ts` (drafts) |
| 13 | Unexpected page errors did not fail web tests | `scripts/web-journeys.mjs` fails a journey on any page error raised while it runs and exits 1 on any error outside journeys | 13/13 pass with the stricter rule |

## Architecture plan (boundaries)

| Concern | Location (planned) | Rule |
| --- | --- | --- |
| PregnancyContentProvider | `src/content/pregnancy/` (weekly facts, sources, versions) | Owns health facts; no art |
| PregnancyAssetRegistry | `src/content/illustrations/registry.ts` + `assets/pregnancy/` | Art only; never holds sizes or text facts |
| GrowthReferenceRepository | `src/domain/growth/reference-repository.ts` + `src/content/growth-references/<publisher>/<version>/` | Loads normalized, versioned datasets |
| GrowthCalculationEngine | `src/domain/growth/lms.ts`, `age.ts`, `eligibility.ts` | Pure TS, no React, no numeric tables inside |
| GrowthChartPresentation | `src/features/growth-chart/` | Draws what the engine returns; colours from tokens |
| PersonalMeasurementRepository | existing `MeasurementRepository` (`src/data/repositories/types.ts`) | Extended fields (method, source, note) |
| Raw data + pipeline | `data-pipeline/growth/raw/`, `data-pipeline/growth/transform.py`, `.../report.md` | Raw files + checksums kept; reproducible |

## Art direction (proposed, awaiting approval)

- Three samples: plum (12), banana (20), pumpkin (40). Code-authored SVG,
  light from upper left, soft contact shadow, transparent background,
  palette tuned to sit on the apricot hero card.
- Motion: ±1.2° sway and a slow light change, transform/opacity only;
  off under reduced motion; paused off-screen and when the app is backgrounded.
- Not to a shared physical scale; never labelled "actual size".
- Known gap: current @3x PNGs are 0.29–0.54 MB; ship WebP (≈ 15–19 KB at @2x)
  after the format decision. A 1x base PNG is now rendered too (Metro and Jest
  resolve `<id>.png`).
- Motion starts only once the system reduce-motion setting is known to be off.

### Production brief (if an illustrator is commissioned instead)
37 objects (matrix in docs/sources/nhs-weekly-matrix.md), one per week 4–40.
Refined botanical realism, single object, 3/4 view from slightly above,
light from upper left, soft contact shadow, transparent PNG 1536×1536,
object fills ~70% of the frame, no faces, no text, no props, colours natural
but harmonised with #FBEADD / #E8EFE8. Deliver layered source files and a
signed licence assigning rights for app and store use.
