# Status

_Updated 2026-11-28._ Priority (owner, 2026-11-28): **functional V1 before final
artwork and editorial content.** Plan and evidence: docs/functional-v1-roadmap.md.
Branch `functional-v1` (local, not pushed). **R0 and R1 done; R2 next.**
M3 artwork/content work is deferred to R7.

What is real now (R1): a reviewed database schema, RLS, transactional RPCs and
a private storage bucket, tested against a **local** Supabase stack with real
user sessions (40 integration tests), plus the client-side session model,
email-code sign-in adapter and validated configuration. What is **not** real
yet: the app screens still run on the on-device demo provider; a `supabase`
build stops at a clear configuration screen until R2 connects the screens.

| Phase | Scope | State |
| --- | --- | --- |
| P0 | Architecture docs, data model, permission matrix, date and content rules | Done (this folder) |
| P1 | Working prototype on fictional local data | Done |
| P2 | Visual refinement via screenshots at 320/393 px and 1.35× text | Done, awaiting approval |
| P3 | Supabase backend, auth, RLS tests, private storage | Superseded by functional-v1-roadmap.md (R1 done locally, no hosted project) |
| P4 | Native verification, notifications, calendar export (dev build) | Not started |
| P5 | Content review, EAS builds, store prep | Not started |

## Works now (prototype, demo data on device)
Onboarding (new pregnancy, existing child, join with code, demo family),
profile switching, pregnancy home with weeks + days and weekly view, dating
edit, pause reminders / hide content / end / archive, record birth, memories
with photos (two-stage save, retry), timeline per profile, measurements with
chart and unit switch, appointments with time zone, family members and
invitations, JSON export, settings, prototype failure simulation.

## M3 state (prototype, not production)
- Three temporary artwork samples (weeks 12, 20, 40), code-authored SVG
  rendered to PNG, with gentle motion that stops under reduced motion, off
  screen and in the background. Other 34 weeks: not drawn (awaiting approval).
- Sourced NHS size comparisons for weeks 4–40 as draft content (no weights).
- Growth chart prototype: weight-for-age only, WHO monthly LMS transcribed from
  PDFs, reference drawn only after the parent picks a reference sex.
  **No percentiles or z-scores are shown.** Datasets are unvalidated.
- Both live only on the prototype route `/preview/visuals` (Ayarlar →
  Prototip araçları), not on the real home or tracking screens.
- Official WHO/CDC raw files are not downloaded (network policy); see
  docs/handoff-growth-data.md.

## Known limitations
- The app screens still use the demo provider: data lives in AsyncStorage on one device; "family" is simulated. The server side exists and is tested locally, but no screen calls it yet (R2).
- In the demo provider, permission checks run on the client only. The real server rules are enforced and tested only in the local Supabase stack so far.
- No encryption beyond what the OS provides. Not end-to-end encrypted.
- Weekly content: 6 demo weeks, not medically reviewed. Other weeks are empty.
- Notifications are preferences only; nothing is sent.
- Calendar export is off (needs a development build).
- Export has no photos. Offline shows cached data only while the app is open.
- Not verified on iOS or Android devices; only the web preview was tested.
- Bundle id is a placeholder (`com.example.minikatlas`).

## Verification log
- 2026-11-27: typecheck pass, lint 0 problems, Jest 93/93, web journeys
  12/12 against the final build, screenshots reviewed (docs/screenshots).
- 2026-11-27 (M3 branch): typecheck pass, lint 0 problems, Jest 134/134
  (16 suites), web journeys 13/13 with page errors counted as failures,
  screenshots at 320/393 px and at 1.35× text including the preview screen,
  review page `node preview/artifact/build.mjs --check` pass. Not run: any
  native device or simulator.
- 2026-11-28 (`functional-v1`): typecheck pass, lint 0 problems, Jest 162/162
  (18 suites), `npm run test:db` 40/40 against the local Supabase stack (run
  repeatedly; two deliberately weakened policies were caught), web journeys
  13/13 on the demo build, production web build with no backend config shows
  only the configuration screen on /, /onboarding, /preview/visuals,
  /settings. Not run: native builds, devices, hosted Supabase.
