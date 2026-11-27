# Content model

Weekly pregnancy content. Schema: `src/content/schemas/weekly-content.ts`.
Data: `src/content/pregnancy/tr/`. Source/gate: `src/content/pregnancy/index.ts`.

## Indexing

`week` = completed gestational weeks from LMP day 0 (or EDD − 280). Week N
covers gestational days `[7N, 7N+6]`, e.g. week 12 = 12w0d–12w6d. Content range is
weeks **4–42** (`CONTENT_FIRST_WEEK`, `CONTENT_LAST_WEEK`). Before week 4 the
home screen says content starts at week 4; after 42 no weekly article is shown.

## Coverage today

| Weeks | Entries | State |
| --- | --- | --- |
| 8, 12, 20, 24, 32, 38 | 6 | `isDemo: true`, `editorialStatus: 'draft'`, no sources, no numeric size values |
| 4–7, 9–11, 13–19, 21–23, 25–31, 33–37, 39–42 | 0 | Screen shows "Bu hafta için içerik hazırlanıyor" |

Demo text is written for the prototype, is not medically reviewed, and shows
a warning banner on every article. There is **no real health content** in the
repository.

## Entry fields

`id` (`pregnancy-week-<N>`), `locale`, `week`, `title`, `summary`,
`babyDevelopment[]`, `parentExperience[]`, `sizeAnalogy` (object label, an
optional numeric value that must name its convention and a source),
`illustrationId`, `measurementConvention` (`crown-rump-length` early,
`crown-heel-length` from ~20w), `sources[]`, `editorialStatus`,
`contentVersion` (semver), `reviewedOn`, `reviewedBy`, `isDemo`.

## Gate

`isDisplayable(entry, gate)`:
- `production`: `published` AND `!isDemo` AND `reviewedOn` set AND ≥ 1 source.
- `prototype`: published or demo.

The gate comes from `featureFlags.showDemoContent` (false in production).
`validateWeeklyContent` rejects: wrong id, week outside 4–42, published
without reviewer, published demo, demo claiming a review, numeric values
without a source. Tested in `__tests__/content/weekly-content-test.ts`.

## Illustrations

`src/content/illustrations/index.tsx`: original SVG motifs (no third-party
art), each with an accessibility label, license and provenance. Abstract
growth motifs, not anatomical drawings.

## Release blockers for real content

1. Content for all weeks 4–42 written in Turkish by a qualified author.
2. Review by a licensed clinician (obstetrics/midwifery), recorded in
   `reviewedBy`/`reviewedOn`; sources cited for every claim and number.
3. No diagnosis, medication or alert language (product-v1.md).
4. All demo entries removed or excluded from the production bundle.
5. A content version (`BUNDLED_CONTENT_VERSION`, now `0.1.0-demo`) bumped
   and recorded in decisions.md.
