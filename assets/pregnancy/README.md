# Pregnancy week artwork

| ID | Files | Week | Creator / tool | Provenance | Rights | Version | Status | Alt text (tr) | Static fallback |
|---|---|---|---|---|---|---|---|---|---|
| plum | `plum@2x.png`, `plum@3x.png` | 12 | Hand-written SVG by Claude (code), rendered with Chromium via `scripts/art/render.mjs` | `art/pregnancy/src/plum.svg` | Original for this project | 0.1.0 | **Temporary sample** | Mor kabuklu, üzerinde hafif beyaz pus olan, sapı yukarıda bir erik | The PNG itself |
| banana | `banana@2x.png`, `banana@3x.png` | 20 | same | `art/pregnancy/src/banana.svg` | Original | 0.1.0 | **Temporary sample** | Sarı, hafif kavisli, birkaç küçük benekli bir muz | The PNG itself |
| pumpkin | `pumpkin@2x.png`, `pumpkin@3x.png` | 40 | same | `art/pregnancy/src/pumpkin.svg` | Original | 0.1.0 | **Temporary sample** | Turuncu, dilimli, kalın yeşil saplı bir bal kabağı | The PNG itself |

No image-generation model was used. No third-party or stock artwork.
Objects come from `docs/sources/nhs-weekly-matrix.md`; artwork never carries
sizes or text facts. Images share one 320×320 frame and are **not** to a
common physical scale.

Budget (proposed): ≤ 120 KB per shipped file at @3x after optimisation,
square 960 px max decode (≈ 3.7 MB RGBA per image in memory); only the current
and adjacent weeks are decoded.
