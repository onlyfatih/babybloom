# Growth reference source inventory

Read 2026-11-27. "Read" means the page or file text was fetched and read; it
does not mean the numbers are ingested or validated.

| Publisher | Item | URL | State |
|---|---|---|---|
| WHO | Child Growth Standards: weight-for-age, length/height-for-age, head-circumference-for-age pages | https://www.who.int/tools/child-growth-standards/standards | Read |
| WHO | Instructions for the tables (age in days; 1 month = 30.4375 days; 24 months = 730.5 days; length→height discontinuity between day 730 and 731; expanded tables to 1856 days) | https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/instructions-en.pdf | Read |
| WHO | Expanded (daily) z-score tables, girls/boys: wfa, lhfa, hcfa (.xlsx) | linked from the indicator pages, under `.../indicators/<indicator>/expanded-tables/` | Located; **not downloaded** (container network blocks cdn.who.int) |
| WHO | Weight-for-age 0–5 y percentiles PDF, girls and boys, months 0–24 transcribed | `.../weight-for-age/wfa-girls-0-5-percentiles.pdf`, `wfa-boys-0-5-percentiles.pdf` | Read; fixtures in `data-pipeline/growth/fixtures/`. Internal consistency only: all 550 printed percentiles are reproduced from the same row's L, M, S after rounding half-up to the printed 0.1 kg (max raw difference 0.050 kg). This is **not** independent validation; see docs/growth-references.md |
| WHO | Methods and development report (0.7 cm length/height adjustment, restricted LMS beyond ±3 SD) | https://www.who.int/publications/i/item/924154693X | Catalogue read; **PDF fetch failed**. Rules not yet verified from primary source |
| WHO | Terms of use | https://www.who.int/about/policies/terms-of-use | Read: reproduction for non-commercial use with acknowledgement. Commercial use needs WHO permission. **Open question for release.** |
| CDC | 2000 CDC infant LMS files (wtageinf, lenageinf, hcageinf; half-month midpoints; sex 1=male 2=female; L, M, S columns) | https://www.cdc.gov/growthcharts/cdc-data-files.htm | Page read; files **not downloaded** |
| CDC | WHO-based data files for 0–24 months | https://www.cdc.gov/growthcharts/who-data-files.htm | Page read |
| CDC | Recommendation: WHO charts from birth to 2 years; CDC charts 2–19 | https://www.cdc.gov/growthcharts/who-growth-charts.htm | Read |
| CDC | LMS formula incl. L = 0 case: X = M exp(S·Z); Z = ln(X/M)/S | cdc-data-files page | Read |
| AAP | Term Infant Growth Tools (last updated 02/13/2026) | https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-nutrition-assessment-tools/term-infant-growth-tools/ | Read 2026-11-27. AAP and CDC recommend WHO charts 0–2 y and CDC charts 2–19 y; flags the 2.3rd/97.7th percentiles (labelled 2nd/98th, ±2 SD) for screening. AAP publishes **no dataset of its own**, so the app shows AAP only as guidance text, never a curve. The page notes support from Abbott |
| WHO/CDC | Corrected age for preterm infants | — | No WHO or CDC rule found on the pages read |
| AAP | Corrected age statement | AAP page above | "Use the corrected age of infants and children born preterm until they are 3 years old" (cites a JPEN article). Recorded as guidance only. **Not implemented**: the app needs a verified method (gestation threshold, rounding, cut-off behaviour) before any corrected-age plot |

## Independent reference implementation (validation only)

`rcpchgrowth` 4.6.5 (Royal College of Paediatrics and Child Health, PyPI,
AGPL-3.0). Used only outside the app to cross-check calculations. Its data
and code are **not** bundled (licence). Its daily WHO table agrees with the
WHO PDF L/M/S at whole months to within the expected day-rounding.

## Unblocking

The container's network policy refused cdn.who.int, www.who.int, www.cdc.gov,
ftp.cdc.gov and www.nhs.uk. A personal environment `babybloom` that allows
these hosts was created on 2026-11-27; a new session on it can download the
raw files with checksums (step E).
