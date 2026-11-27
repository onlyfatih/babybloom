# Test strategy

## Layers

| Layer | Tool | Location | What it proves |
| --- | --- | --- | --- |
| Domain rules | Jest | `__tests__/domain` | dates, gestation, DST, units, memory save decision, lifecycle, permission mirror |
| Content | Jest | `__tests__/content` | bundled weekly content passes the schema and the gate; size comparisons cover weeks 4–40 with explicit length conventions |
| UI | Jest + RNTL 14 | `__tests__/ui` | colour contrast AA, Button/TextField/Chip a11y and behaviour, date input parsing |
| Data (demo) | Jest | `__tests__/data` | private memories hidden from owner, revoked member blocked, two-stage save, idempotency, delete cleans media, birth keeps memories, offline |
| Growth engine | Jest | `__tests__/domain/growth-lms-test.ts` | LMS both directions, L = 0, interpolation, no extrapolation, \|z\| > 3 refused, WHO printed values and independent rcpch fixtures |
| Features | Jest + RNTL | `__tests__/features` | chart model (gaps, ranges, reference sex, no percentiles), illustration motion rules and missing-art state |
| Web journeys | Playwright (Chromium) | `scripts/web-journeys.mjs` | 13 end-to-end flows in the **web preview**; any uncaught page error fails the journey |
| Screenshots | Playwright | `scripts/screenshots.mjs` | layout review at 320 and 393 px, normal and 1.35× text |
| Static | tsc strict, eslint | `npm run typecheck`, `npm run lint` | types, hooks rules, layer import rules |
| RLS policies (P3) | supabase CLI + pgTAP | `backend/supabase/tests` (not created) | server authorization |
| Native (P4) | manual on device / simulator, later Maestro | docs/manual-acceptance.md | real iOS/Android behaviour |

RNTL 14: `render` and `fireEvent` are async, always `await` them.

## Last run (2026-11-27, cloud Linux container, branch `minik-atlas-p0-p2`)

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | 0 problems |
| `npm test` | 11 suites, 93 tests, 93 passed, 0 failed, 0 skipped |
| Web journeys | 12 / 12 passed (see status.md for the run against the final build) |
| Screenshots | 21 screens × 2 widths, normal and large text, reviewed by eye |

## Last run on `visuals-growth-references` (2026-11-27)

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | 0 problems |
| `npm test` | 16 suites, 134 tests, 134 passed |
| Web journeys | 13 / 13 passed (strict on page errors) |
| Screenshots | 23 screens × 2 widths, normal and 1.35× text build |
| Data pipeline | table consistency PASS (internal only), rcpch cross-check PASS (250 cases, max \|Δz\| 0.00257) |

## Not run (and why)

- **iOS simulator / Android emulator / Expo Go on a phone**: no simulator in
  the container. Nothing native has been verified: gestures, keyboard
  avoidance, native date input, image picker permission dialogs, EXIF
  stripping on real photos, VoiceOver/TalkBack, Dynamic Type.
- **RLS / backend tests**: no backend exists yet.
- **Performance and memory** with many photos.
- **Push notifications**: not implemented.

Web preview results are evidence about logic and layout, not about native behaviour.
