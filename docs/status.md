# Status

_Updated 2026-11-28._ Priority (owner, 2026-11-28): **functional V1 before final
artwork and editorial content.** Plan and evidence: docs/functional-v1-roadmap.md.
Branch `functional-v1` (pushed as a backup, no PR). **R0–R4 done on web and
local integration (native pending R6); R5 next.**
M3 artwork/content work is deferred to R7.

What is real now (R2): with `EXPO_PUBLIC_BACKEND=supabase` the app signs in
with an emailed code, creates or joins a family, creates a pregnancy or child
profile and saves text memories on a **local** Supabase stack; records survive
a reload and a sign-out / sign-in. Server rules are tested with real user
sessions (43 integration tests). Not real yet: photos in real mode (hidden
until R3), invitation UI against the server (R3), deletion flows (R5), any
hosted project or native build.

R3 adds: photo memories and child profile photos in real mode (private bucket,
server-verified uploads, signed URLs that expire after 10 minutes), the
invitation flow against the server, a shared timeline between two accounts,
private memories hidden from other members, and revocation that moves the
removed member out with a notice.

R4 adds, in real mode: pregnancy onboarding and birth (memories kept), child
profile edit (name, birth date and time), photo replacement and removal,
archive and restore by the owner, measurement correction and deletion with
the chart, appointments with an explicit time zone. Steps for running a
development build on an iPhone from a Mac: docs/iphone-setup.md (written from
the Expo docs; not tried on Apple hardware).

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
- Real mode: delete account / family is not offered until R5; replacing an existing child's photo is R4; measurements and appointments go through the server but have no end-to-end check yet (R4).
- A signed photo URL issued before a revocation or delete works until it expires (≤ 10 min).
- Demo mode (default build): data lives in AsyncStorage on one device; "family" is simulated and labelled "Demo".
- In the demo provider, permission checks run on the client only. The real server rules are enforced and tested only in the local Supabase stack so far.
- No encryption beyond what the OS provides. Not end-to-end encrypted.
- Weekly content: 6 demo weeks, not medically reviewed. Other weeks are empty.
- No notifications are sent, and Settings says so (no toggles).
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
- 2026-11-28 (`functional-v1`, R2): typecheck pass, lint 0 problems, Jest
  174/174 (21 suites), `npm run test:db` 43/43 (local stack, includes the
  vertical slice through the app's own provider), demo web journeys 13/13,
  real-backend web journey 7/7 (`scripts/real-journey.mjs`: email code,
  family, child, text memory, reload, sign-out / sign-in), new screens
  checked at 320 px with 1.35× text. The cache-isolation test was run with
  isolation disabled and failed as expected. Not run: native builds,
  devices, hosted Supabase.
- 2026-11-28 (`functional-v1`, R3): typecheck pass, lint 0 problems, Jest
  179/179 (22 suites), `npm run test:db` 48/48, demo web journeys 13/13,
  real-backend journey 7/7, two-account sharing journey 10/10
  (`scripts/sharing-journey.mjs`: profile photo, photo memory via signed URL,
  invitation, join, shared memory and photo, private memory hidden, B's memory
  visible to A, revocation in a running app and on a cold start). Not run:
  native builds, devices, hosted Supabase.
- 2026-11-28 (`functional-v1`, R3 review fixes): (1) a refresh racing a
  sign-out could publish the old session as ready again; SessionController
  now drops resolutions in flight during and after sign-out, joins refreshes
  to the pending sign-out and re-checks the generation after the cache clear
  (4 regression tests; 3 of them fail on the previous controller). (2) a
  photo that fails to load is refetched at most twice in 10 minutes, then
  stays a placeholder (hook test counts requests). (3) `updatePregnancy`
  that matches no row rejects with `DataError('forbidden')` before mapping
  (integration test). typecheck pass, lint 0 problems, Jest 186/186,
  `npm run test:db` 49/49. Web journeys were not re-run for this commit;
  they run again at the R4 gate.
- 2026-11-28 (`functional-v1`, R4): typecheck pass, lint 0 problems, Jest
  186/186 (22 suites), `npm run test:db` 55/55 (new `r4-profiles.test.ts`),
  R4 real-backend journey 11/11 (`scripts/r4-journey.mjs`), real journey 7/7,
  sharing journey 10/10, demo journeys 13/13. New screens checked at 320 px
  with normal and 1.35× text. `npx expo export --platform ios` and
  `expo prebuild --platform ios` succeed in Linux. Not run: Xcode build,
  any device, hosted Supabase.
