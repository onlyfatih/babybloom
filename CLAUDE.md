# Working on Minik Atlas

Read `AGENTS.md` for Expo-specific rules (SDK 58; fetch versioned docs, never
trust memory of Expo APIs; use `npx expo install`).

## Non-negotiables

- UI copy is Turkish and lives only in `src/content/localization/tr.ts`. Code,
  identifiers, comments and docs are English.
- Fixtures are fictional. No real names, photos or health data, ever.
- Never add V1-excluded features (docs/product-v1.md § Out of scope): AI
  diagnosis, lab interpretation, medication advice, medical alerts, leap
  calendars, percentiles, voice transcription, gamification, payments, social
  feed, chat, CMS, full offline sync, microservices.
- Never claim E2E encryption, medical review, production readiness, native
  verification from web runs, or store approval.
- Client permission checks (`src/domain/permissions`) only decide what the UI
  offers. Real authorization is server RLS (`backend/supabase`). Feature flags
  never grant access.
- Dates: use `src/domain/dates`. Never `new Date('YYYY-MM-DD')`. See
  docs/date-rules.md.
- Do not publish, submit, or activate paid services without the owner's OK.

## Layers (enforced by eslint `no-restricted-imports`)

`app → features → (data, domain, ui, content, infrastructure)`.
`domain` imports nothing from React, ui, data or features. `ui` never imports
features or data. Screens never import provider internals.

## Before saying done

`npm run typecheck && npm run lint && npm test`. For UI changes also rebuild
the web preview and run `npm run journeys`, then look at screenshots at 320 px
and with `EXPO_PUBLIC_PREVIEW_FONT_SCALE=1.35`. Report what you ran, what
failed and what you did not run. Update `docs/status.md`.

Where to change what: docs/change-guide.md.
