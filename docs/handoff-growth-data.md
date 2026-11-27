# Handoff: download and validate official growth data (step E)

For a new Claude Code session on the **`babybloom`** cloud environment, which
allows cdn.who.int, www.who.int, www.cdc.gov, ftp.cdc.gov, www.nhs.uk and
www.aap.org. The default environment refuses these hosts (HTTP 403 from the
proxy), which is the only reason this is a separate session.

**Continue in the same repository and branch. Do not create a new project,
repository or Expo app.**

## Where things are

- Repository: `onlyfatih/babybloom`
- Branch: `visuals-growth-references` (the commit that adds this file, or
  later). Base: `minik-atlas-p0-p2` (PR #1, not merged yet).
- Read first: `CLAUDE.md`, `docs/milestone-visuals-growth.md`,
  `docs/growth-references.md`, `docs/sources/growth-source-inventory.md`.

## Owner's limits (2026-11-27)

- Data preparation: yes. Paid services or an illustrator: **not approved**.
- Percentiles stay **off** until numerical validation is complete.
- The remaining 34 weekly illustrations wait for the owner's approval of the
  three samples. Do not draw them in this session.
- Fixtures stay fictional. Do not publish or submit anything.

## What is missing

| File(s) | Listed in | State |
| --- | --- | --- |
| WHO expanded daily z-score tables (xlsx): wfa, lhfa, hcfa × girls, boys | `data-pipeline/growth/sources.json` | Not downloaded |
| WHO table instructions PDF, wfa percentile PDFs (for checksums) | `sources.json` | Not downloaded |
| CDC 2000 infant LMS (wtageinf, lenageinf, hcageinf .csv) | `sources.json` | Not downloaded |
| CDC WHO-based CSVs (all sexes × indicators) | `sources.json` → `manual` | Only one URL recorded; add the rest from the CDC page |
| WHO methods report PDF (restricted LMS beyond ±3 SD) | `sources.json` → `manual` | Take the PDF link from the catalogue page |

## Commands

```sh
git fetch origin visuals-growth-references
git checkout visuals-growth-references
npm ci
npm run typecheck && npm run lint && npm test          # expect all green before changes

# 1. Download, with sha256 + HTTP metadata into raw/MANIFEST.json
python3 -I data-pipeline/growth/fetch_raw.py
python3 -I data-pipeline/growth/fetch_raw.py --verify
git add data-pipeline/growth/raw && git commit -m "Add official WHO/CDC raw growth files with checksums"

# 2. Transform (to write): data-pipeline/growth/transform.py
#    raw xlsx/csv → src/content/growth-references/<publisher>/<version>/<indicator>-<sex>.json
#    rows {x: ageDays, lms:{L,M,S}}, ageUnit 'day', sourceSha256 = raw file hash,
#    validation 'unvalidated' until step 3 passes. Record every step in
#    data-pipeline/growth/reports/transform.md. Needs openpyxl (pip, dev only).

# 3. Validate (to write): data-pipeline/growth/validate_official.py
#    a) engine z vs WHO's own SD columns in the expanded tables (every row, both sexes,
#       all indicators): value at z = −3..3 recomputed, tolerance stated in the report
#    b) repeat cross_check_rcpch.py on daily data (rcpchgrowth==4.6.5 in a throwaway venv, AGPL: never bundle)
#    c) CDC: z vs CDC's published percentile columns
#    Only a dataset that passes a), b) (and c) for CDC) may be set to validation 'validated'.

npm run typecheck && npm run lint && npm test
git push -u origin visuals-growth-references
```

## Done means

- `raw/MANIFEST.json` lists every file with sha256; `--verify` is OK.
- Transform and validation reports are in `data-pipeline/growth/reports/`
  with tolerances and counts, and failures are reported, not hidden.
- `docs/growth-references.md` and `docs/status.md` describe the real state.
- Percentiles remain off in the UI until the owner confirms the validation
  report, even if datasets pass.
