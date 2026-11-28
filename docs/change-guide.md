# Change guide

Where to make common changes. After any change: `npm run typecheck && npm run lint && npm test`; after backend changes also `npm run test:db` (local stack running).

| I want to… | Edit | Also |
| --- | --- | --- |
| Change any Turkish text | `src/content/localization/tr.ts` | Keys are typed; tsc fails on a missing key |
| Change date / number formatting | `src/content/localization/format.ts` | |
| Change colours | `src/ui/tokens/palette.ts` (values) or `src/ui/tokens/colors.ts` (roles) | Run `npm test` – `__tests__/ui/contrast-test.ts` checks AA |
| Change fonts / text sizes | `src/ui/tokens/typography.ts`; font loading in `src/app/_layout.tsx` | Check 320 px + 1.35× screenshots |
| Change spacing, radii, tab bar height | `src/ui/tokens/index.ts` | |
| Change a button, input, card… | `src/ui/primitives/<Name>.tsx` | `__tests__/ui/primitives-test.tsx` |
| Change a tab or its icon/label | `src/app/(tabs)/_layout.tsx` | |
| Change a screen layout | `src/app/<route>.tsx` (Bugün: `src/app/(tabs)/index.tsx`, Hikâyemiz: `story.tsx`, Takip: `tracking.tsx`, Aile: `family.tsx`) | |
| Add a screen | new file in `src/app/`; register it in the right `Stack.Protected` group in `src/app/_layout.tsx` | Add a screenshot step in `scripts/screenshots.mjs` |
| Change the pregnancy hero card | `src/features/pregnancy/PregnancyWeekHero.tsx`, labels in `gestation-labels.ts` | |
| Change gestation math or limits | `src/domain/pregnancy/gestation.ts` | `__tests__/domain/gestation-test.ts`, docs/date-rules.md |
| Change pregnancy statuses / birth rules | `src/domain/pregnancy/lifecycle.ts`; screens `src/app/pregnancy/{manage,birth}.tsx` | `lifecycle-test.ts` |
| Add or edit a weekly article | `src/content/pregnancy/tr/` (demo: `demo-weeks.ts`) | Must pass `validateWeeklyContent`; docs/content-model.md |
| Add an illustration (UI icons/spot art) | `src/content/illustrations/index.tsx` (add with a11y label, license, provenance) | |
| Replace or add a pregnancy week illustration | Source `art/pregnancy/src/<id>.svg` → `node scripts/art/render.mjs <id>` → register in `src/content/illustrations/pregnancy-assets.ts` (creator, provenance, rights, version, status) and alt text `art.<id>` in `tr.ts`; point the week's `illustrationId` in `weekly-comparisons.ts` to it | Update `assets/pregnancy/README.md`; `weekly-comparisons-test.ts` checks every reference |
| Correct a weekly size comparison | `src/content/pregnancy/weekly-comparisons.ts` (from the NHS page only; keep `basis` and length convention) | Update `docs/sources/nhs-weekly-matrix.md`; bump `COMPARISON_CONTENT_VERSION` |
| Change the week illustration motion | `src/features/pregnancy/WeekIllustration.tsx` (`PERIOD_MS`, sway range) | `week-illustration-test.tsx`; keep transform/opacity only |
| Add a growth reference dataset | Raw file + `sources.json` → `fetch_raw.py` → transform into `src/content/growth-references/<publisher>/<version>/` → register in `src/content/growth-references/index.ts` | docs/growth-references.md; stays `unvalidated` until validation passes |
| Change the default reference policy (WHO/CDC) | `DEFAULT_REFERENCE` in `src/content/growth-references/index.ts` | Copy in `growth.*` keys of `tr.ts` |
| Change growth chart colours | `src/ui/tokens/colors.ts` roles used by `src/features/growth-chart/GrowthChartPrototype.tsx` | Contrast test |
| Rebuild the review page | `preview/artifact/template.html`, `node preview/artifact/build.mjs --check` | preview/artifact/README.md |
| Add a language | new `src/content/localization/<locale>.ts` with the same typed tree, locale switch in `src/content/localization/index.ts`; weekly comparisons carry `locale` | ADR-003 |
| Change photo limits / resize | `src/domain/memories/memory-rules.ts`; picking and re-encode in `src/features/memories/photo-picker.ts` | `memory-rules-test.ts` |
| Change the memory editor | `src/features/memories/MemoryEditor.tsx`, save flow in `src/features/memories/hooks.ts` | |
| Change measurement units or plausibility ranges | `src/domain/measurements/units.ts` | `measurements-test.ts` |
| Change the measurement chart (Takip tab) | `src/features/measurements/MeasurementChart.tsx` | No percentiles |
| Change the growth chart prototype | `src/features/growth-chart/` (model in `chart-model.ts`) | Percentiles only after validation (ADR-009) |
| Change appointment fields or upcoming/past rule | `src/features/appointments/AppointmentForm.tsx`, `src/domain/appointments/schedule.ts` | `zoned-date-time-test.ts` |
| Change who can do what | `docs/permissions.md` first, then `src/domain/permissions/permissions.ts`, then RLS in `backend/supabase/migrations/` (new migration) | `permissions-test.ts`; later RLS tests |
| Change export contents | `src/domain/permissions/export-selection.ts`, screen `src/app/export.tsx` | |
| Add a field to an entity | `src/domain/model.ts`, `src/data/repositories/types.ts`, demo provider `src/data/providers/demo/demo-backend.ts`, fixture `src/testing/fixtures/demo-family.ts`, new SQL migration | docs/data-model.md |
| Change demo family data | `src/testing/fixtures/demo-family.ts` (fictional only); images in `assets/fixtures/` | |
| Change simulated latency / failures | `src/data/providers/demo/demo-backend.ts` (`request()`), toggles in `src/infrastructure/configuration/simulation.ts` | |
| Add a feature flag | `src/infrastructure/configuration/feature-flags.ts` (interface + all three environments) | Flags never grant access |
| Change error messages for data errors | `src/data/errors.ts` + `errors.*` keys in `tr.ts` | |
| Change app name, bundle id, permissions text | `app.json` | Permission strings are Turkish |
| Add a native library | `EXPO_OFFLINE=1 npx expo install <pkg>` if api.expo.dev is blocked; check it exists in Expo Go or note the dev-build need in architecture.md | |
| Change the database (table, column, constraint, policy, RPC) | new file `backend/supabase/migrations/<timestamp>_<name>.sql` (never edit an applied one) → `npx supabase db reset --workdir backend` → `npx supabase gen types typescript --local --workdir backend > src/data/providers/supabase/database.types.ts` | Add/adjust `backend/tests/*.test.ts`, run `npm run test:db`; docs/backend.md |
| Change who can read/write on the server | RLS policy or RPC check in a new migration; mirror in `src/domain/permissions/permissions.ts` and docs/permissions.md | Negative test in `backend/tests/access.test.ts` |
| Change sign-in / session behaviour | `src/data/providers/supabase/session-backend.ts` (Supabase calls), `src/data/session/session-controller.ts` (states), `src/features/session/SessionProvider.tsx` (React, cache per scope, foreground) | `__tests__/session/*`, `backend/tests/session.test.ts`, docs/auth.md |
| Change which screen a session state shows | guards in `src/app/_layout.tsx`, redirects in `src/app/index.tsx`; sign-in screens `src/app/sign-in/`, family choice `src/app/family/setup.tsx` | `scripts/real-journey.mjs`, docs/auth.md § Screens per state |
| Change sign-in email text | `backend/supabase/templates/sign-in-code.html` (keep `{{ .Token }}`); hosted: paste into Auth → Email Templates | docs/auth.md |
| Change environment / backend selection | `src/infrastructure/configuration/app-config.ts`, `.env.example`; provider wiring `createAppBackends` in `src/data/backend.tsx`; client `src/data/providers/supabase/client.ts` | Config tests in `__tests__/session/session-test.ts` |
| Change a real-backend repository | `src/data/providers/supabase/supabase-backend.ts`, row mapping in `mapping.ts` | `__tests__/data/supabase-mapping-test.ts`, `backend/tests/vertical-slice.test.ts` |
| Change how photos are shown (signed URLs, expiry, placeholders) | `resolveMedia` in each provider; hook `src/features/media/use-media-source.ts`; lifetime `SIGNED_URL_SECONDS` in `supabase-backend.ts` | `__tests__/features/media-source-test.ts`, `backend/tests/media-service.test.ts`; docs/backend.md § Media lifecycle |
| Change photo preparation (resize, format, limits) | `src/features/memories/photo-picker.ts`, limits in `src/domain/memories/memory-rules.ts` (server limit stays 5 MB in the storage migration) | |
| Turn on a feature a provider cannot do yet (e.g. photos in real mode) | `capabilities` in `src/data/repositories/types.ts` and each provider | UI hides what a provider cannot do |
| Change import boundaries | `eslint.config.js` | |
