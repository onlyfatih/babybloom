# Architecture

Modular monolith in one Expo app. No microservices. One backend provider at a time.

## Stack

Expo SDK 58, React Native 0.88, React 19.3, strict TypeScript 6, expo-router
(file routes in `src/app`), TanStack Query v5 for server state, AsyncStorage
(demo persistence), expo-image-picker + expo-image-manipulator (photos),
react-native-svg (illustrations, chart), Fraunces + Inter fonts.

## Layers

```
src/app            routes: compose features, no business logic
src/features/*     hooks (React Query) + feature components
src/data           Backend interface, providers, query keys, error mapping
src/domain         pure TS rules (no React): dates, gestation, permissions, units, memories
src/ui             tokens + primitives (no data access)
src/content        tr.ts copy, weekly content schema/data, illustrations
src/infrastructure env, feature flags, storage, logging, simulation
```

Import direction is enforced by `eslint.config.js` (`no-restricted-imports`):
domain imports nothing above it; ui never imports data or features; app and
features never import provider internals.

## Data flow

Screen → feature hook (`useQuery`/`useMutation`) → `useBackend()` →
`Backend` (`src/data/repositories/types.ts`) → provider.

- **Demo provider** (`src/data/providers/demo/demo-backend.ts`): in-memory
  database seeded from `src/testing/fixtures/demo-family.ts`, persisted to
  AsyncStorage on every write. Each call passes through `request()`, which
  applies simulated latency, offline, session and membership checks, and
  the same permission rules the server will apply.
- **Supabase provider** (P3, not written): maps rows ↔ domain types in
  `src/data/mapping`, relies on RLS for authorization.

Errors are `DataError` with a code (`offline`, `forbidden`,
`membership-revoked`, `upload-failed`, …); `src/data/errors.ts` turns them
into Turkish messages.

## Navigation

`src/app/_layout.tsx` holds the providers and a `Stack` with two
`Stack.Protected` groups: no session (welcome, join) and session (tabs and
all detail/modal routes). The splash stays up until the first session read,
so deep links never render a protected screen without a session. Tabs use
`expo-router/js-tabs` (see decisions.md ADR-001).

## Photos (memory save)

1. `prepareUploads` creates pending media rows + upload targets.
2. Each photo is re-encoded to JPEG ≤ 2048 px (strips EXIF/GPS) and uploaded
   with progress. If re-encoding fails, the photo is rejected, never uploaded raw.
3. `decideSave` → finalize / ask the user / not saved.
4. `finalize` writes the memory, idempotent per `clientRequestId`.
   "Kaydedildi" appears only after finalize succeeds. Retries reuse slots.

## Backend recommendation: Supabase (not activated)

Managed Postgres with row-level security, Auth (email OTP / Apple / Google),
private Storage buckets with signed URLs, SQL migrations, and a local CLI
stack (`supabase start`) for policy tests without any hosted project.
Draft migration: `backend/supabase/migrations/`. Cost: free tier is enough for
development; a production project with backups and no pausing is the Pro plan
(paid, monthly). Nothing has been created or paid for. Alternatives
considered: Firebase (weaker relational modelling for visibility rules),
custom API (more to operate).

Secrets: only `EXPO_PUBLIC_*` values (URL, anon key) may reach the client.
The service-role key never ships in the app.

## Runs where

| Capability | Expo Go | Dev build | Needs credentials |
| --- | --- | --- | --- |
| Whole prototype (picker, manipulator, storage, localization) | Yes | Yes | No |
| Calendar export (`expo-calendar`, flag off) | No | Yes | No |
| Push notifications (P4) | Limited | Yes | APNs / FCM |
| Store builds, TestFlight | – | EAS Build | Apple Developer, Google Play, Expo account |
