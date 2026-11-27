# Review page (artifact preview)

A single self-contained HTML page used to review the three temporary artwork
samples (weeks 12, 20, 40) and the growth chart prototype outside the app.
The published copy is https://claude.ai/artifact/T3EJ5u11WgfNg9vrmemYK5
(private to the owner).

The same content also lives **inside the app** at the prototype route
`/preview/visuals` (Ayarlar → Prototip araçları → "Görsel ve grafik
önizlemesi"), built from the real components:
`src/features/pregnancy/WeekIllustration.tsx`,
`src/features/pregnancy/WeekComparisonCard.tsx` and
`src/features/growth-chart/GrowthChartPrototype.tsx`. The app screen is the
source of truth; this page is a convenience copy for quick review.

## Build and open

Requires the repo's dev dependencies (`npm install`) for Playwright's Chromium.

```sh
node scripts/art/render.mjs              # only if the SVG sources changed
node preview/artifact/build.mjs --check  # writes preview/artifact/out/minik-atlas-ornekler.html
open preview/artifact/out/minik-atlas-ornekler.html   # or xdg-open / double-click
```

`--check` loads the page in Chromium at 320 px and 1280 px and exits non-zero
on a page error or horizontal overflow.

## What the page is and is not

- Artwork: hand-written SVG rendered to PNG, re-encoded to WebP for the page.
  Status **temporary sample**, not approved. No image-generation tool was used.
- Chart: WHO weight-for-age monthly LMS rows transcribed from the WHO PDF
  tables (`data-pipeline/growth/fixtures/`). Status **unvalidated prototype**.
  The page shows the median and, in advanced mode, the ±2 SD band only. It
  never shows a percentile for a measurement.
- Measurements are fictional.

`out/` is git-ignored; rebuild instead of committing the output.
