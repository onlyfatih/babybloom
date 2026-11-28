# Functional V1 roadmap

_Single source of truth for the functional V1 contract (owner's brief of
2026-11-28). Updated 2026-11-28._

Baseline: `visuals-growth-references` @ `54e031e`. Work branch: `functional-v1`
(pushed to GitHub as a backup with the owner's OK; no pull request, nothing merged).

Owners: **Claude** = the single Claude Code session doing this work. No
parallel agents have been used so far; the four roles in the brief
(architect, mobile/auth, backend/media, QA) are all this one session. **Owner**
= fatih (accounts, hosted setup, approvals).

Commands used below:

```sh
npm run typecheck && npm run lint && npm test         # unit/component (Jest, jest-expo)
npx supabase start --workdir backend                   # local stack (Docker)
npx supabase db reset --workdir backend                # migrations from a clean DB
npm run test:db                                        # DB/RLS/Storage/Auth + app-provider integration
npx expo export --platform web --output-dir dist && npm run journeys   # demo web smoke (supplementary)
# real-backend web journey (supplementary): build with EXPO_PUBLIC_BACKEND=supabase into dist-real, serve it, then
node scripts/real-journey.mjs http://localhost:8082 http://127.0.0.1:54324
```

Status: ✅ done (evidence linked) · 🟡 partial · ⬜ not started · ⛔ blocked

## R0: Reconcile and stabilize (exit: focused regression checks pass) — ✅

| ID | Task | Owner | Dep | Acceptance | Verify | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R0.1 | Record baseline | Claude | – | 54e031e: typecheck, lint, 134 tests, 13 journeys pass | `npm test` | ✅ | status.md verification log |
| R0.2 | Draft hydration (A) | Claude | – | No save/clear before restore; never overwrites typing; keys scoped by user/family/profile/purpose; unreadable/stale dropped; photos not drafted (documented) | `npx jest __tests__/features/use-form-draft-test.tsx __tests__/data/r0-reliability-test.ts` | ✅ | `src/features/shared/use-form-draft.ts`, `drafts.ts` |
| R0.3 | Local provider isolation (B) | Claude | – | Mutations serialized on a copy; a failed write never rolls back another; delayed and interleaved failures tested | same | ✅ | `demo-backend.ts` `exclusive()` |
| R0.4 | Save then failed draft cleanup (E) | Claude | R0.2 | Saved memory never reported "not saved"; warning shown | code review + `drafts.clear` returns boolean (tested) | ✅ | `MemoryEditor.tsx` |
| R0.5 | Export accuracy (C) and query states (D) | Claude | R2 | Re-verify access at export time; initial/empty/stale/forbidden/failed distinguished; reconnect + foreground refresh; no blind write retries | – | 🟡 | Done in R2: foreground refresh of the session, no retries for writes or final errors (forbidden, not-found, revoked, expired, validation). Open (R5): export re-verification at export time, stale/forbidden states per section |

## R1: Real backend foundation (exit: migrations run from clean state; identity and negative access tests pass) — ✅

| ID | Task | Owner | Dep | Acceptance | Verify | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1.1 | Local Supabase | Claude | – | Stack starts from `backend/supabase/config.toml` | `npx supabase start --workdir backend` | ✅ | docs/backend.md |
| R1.2 | Reviewed migrations | Claude | R1.1 | Draft reviewed; composite same-family keys; immutable author/family; RPC-only lifecycle | `npx supabase db reset --workdir backend` | ✅ | `backend/supabase/migrations/2026112800*`; review in docs/backend.md |
| R1.3 | Transactional RPCs | Claude | R1.2 | create family, invitation create/accept/revoke, revoke/leave/transfer with last-owner, record birth, reserve media, finalize memory, avatar, archive | `npm run test:db` | ✅ | `backend/tests/access.test.ts`, `storage.test.ts` |
| R1.4 | Negative access tests | Claude | R1.3 | Unauthenticated, other family, owner vs private, forged ids, expired/reused/concurrent invitation, concurrent birth/finalize, expired token, revocation, storage paths | `npm run test:db` | ✅ | 40/40; two deliberate policy breakages were caught |
| R1.5 | Generated types | Claude | R1.2 | `database.types.ts` from the local DB | `npx supabase gen types typescript --local --workdir backend` | ✅ | `src/data/providers/supabase/database.types.ts` |
| R1.6 | Auth method | Claude | – | One method: email one-time code; setup, limits, recovery documented | `npm run test:db` (session.test.ts) | ✅ | docs/auth.md |
| R1.7 | Auth state model | Claude | R1.6 | Six explicit states; subscription + cleanup; stale results discarded; scope-change hook | `npx jest __tests__/session` | ✅ | `src/data/session/*` |
| R1.8 | Config and provider selection | Claude | – | Validated env; production never demo; privileged keys refused; `.env.example` | `npx jest __tests__/session` + production web build check | ✅ | `app-config.ts`, `ConfigurationGate.tsx` |
| R1.9 | Separate identity / membership / invitation / active family | Claude | R1.7 | Contracts split; screens use them | typecheck + R2 checks | ✅ | Screens go through `SessionProvider`; the demo `AuthRepository` survives only inside `demo-session-backend.ts` |

## R2: First real vertical slice (exit: account → family → child → text memory survives restart with real persistence) — ✅ (web + integration; native pending R6)

| ID | Task | Owner | Dep | Acceptance | Verify | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R2.1 | SessionProvider in the app root, route guards from SessionState | Claude | R1.7 | Each of the 6 states renders a defined screen; foreground refresh | `npx jest __tests__/session`; real journey | ✅ | `src/features/session/SessionProvider.tsx`, `src/app/_layout.tsx` (guards), `src/app/index.tsx` (hub); AppState → `setForeground` + refresh |
| R2.2 | Cache isolation on user/family change | Claude | R2.1 | Late response for user A never shown to user B | `npx jest __tests__/session/session-provider-test.tsx` | ✅ | One QueryClient per (user, family) scope, subtree keyed by it; in-flight queries cancelled before publish. Test fails when isolation is disabled (checked) |
| R2.3 | Sign-in screens (email, code), family create / join / choose | Claude | R2.1 | Turkish copy; rate-limit and wrong-code messages | `node scripts/real-journey.mjs` | ✅ | `src/app/sign-in/*`, `src/app/family/setup.tsx`, `SessionErrorScreen` |
| R2.4 | Supabase profile + memory (text) repositories, row mapping tests | Claude | R1.5 | Mapping unit tests; integration through the repository | `npx jest __tests__/data/supabase-mapping-test.ts`; `npm run test:db` | ✅ | `supabase-backend.ts`, `mapping.ts`, `backend/tests/vertical-slice.test.ts`; idempotent child (RPC) and pregnancy (request id = row id) creation; memory edit conflict by version |
| R2.5 | Demo provider behind the new contracts, labelled "Demo" | Claude | R2.1 | Demo never mixes with signed-in data | `npm run journeys` | ✅ | `demo-session-backend.ts`; demo badge on every screen; provider fixed per build, demo tools hidden in real builds |
| R2.6 | Relaunch evidence | Claude | R2.4 | Record survives restart | `npm run test:db` (vertical-slice), real journey step 6 | 🟡 | Web build: full reload restores session and memory; integration: new client on the same storage. **Native dev build not run** (R6) |

Not in R2 (deliberately): photos in real mode are hidden (`capabilities.photos = false`) until the signed-URL media service (R3); account and family deletion are not offered in real mode (R5).

## R3–R7

| Gate | Scope | Status | Blocking reason |
| --- | --- | --- | --- |
| R3 | Photos (async signed-URL media service, upload lifecycle, cleanup), invitation UI, shared timeline, private memories, revocation in UI | ⬜ | – (server side already tested in R1) |
| R4 | Pregnancy onboarding + birth UI, profile switch/edit/archive, measurement correction + chart, appointments | ⬜ | – |
| R5 | Export package (manifest, media), deletion flows, ownership transfer UI, storage deletion worker, backup/restore drill | ⬜ | Account deletion and authored-record retention rule needs an owner decision (proposal in docs/backend.md) |
| R6 | iOS/Android dev + release builds, real devices, accessibility, CI | ⬜ | Needs the owner's Apple/Google accounts and a device; EAS may need a plan decision |
| R7 | Final artwork, weekly content, animation, validated reference graphs | Deferred | Deferred by the owner until functional V1 acceptance |

## Hosted setup still needed (owner)

Nothing hosted is required for R0–R2 local work. Before a beta (R6): a
Supabase project (free tier is enough to start; no paid plan activated),
custom SMTP for sign-in codes, and the steps in docs/auth.md. Claude will ask
before any of these.
