# Minik Atlas

A private family journal for pregnancy and early childhood: weekly pregnancy
view, memories with photos, growth measurements, appointments and a small
family circle. UI is Turkish. Code and docs are English.

**Status: prototype (P0–P2).** Runs on fictional local demo data only. There is
no backend, no account system, no server authorization, no medical review of
any content. See [docs/status.md](docs/status.md).

## Run it

Requirements: Node 20+ (tested with Node 22), npm. On a Mac, for iOS: Xcode
simulator or the Expo Go app on a phone.

```bash
npm install
npx expo start          # press i (iOS simulator), a (Android), w (web), or scan the QR with Expo Go
```

The whole prototype runs in **Expo Go** (SDK 58). The only feature that would
need a development build, calendar export, is behind the `calendarExport`
flag and is off.

On the welcome screen choose **"Örnek aileyle göz at"** to load the fictional
Yıldız family, or create a new profile from scratch. Settings → "Prototip
araçları" can simulate offline, slow network and photo upload failures, and
reset all data.

## Checks

```bash
npm run typecheck       # tsc --noEmit, strict
npm run lint            # eslint (expo config + layer import rules)
npm test                # jest-expo unit/component tests
```

Web preview checks (Chromium via Playwright; layout and logic only, not native):

```bash
npm i --no-save playwright && npx playwright install chromium   # once
npm run export:web && npm run serve:web &                       # http://localhost:8081
npm run journeys                                                # 12 scripted journeys
SCALE=2 npm run screenshots -- http://localhost:8081 docs/screenshots
```

## Map

| Path | What lives there |
| --- | --- |
| `src/app` | expo-router routes only (thin screens) |
| `src/features` | feature hooks and components (memories, pregnancy, measurements, …) |
| `src/domain` | pure rules: dates, gestation, permissions, units, memory save logic |
| `src/data` | `Backend` interface, demo provider, query keys, error mapping |
| `src/ui` | design tokens and primitives |
| `src/content` | Turkish copy, weekly content schema + demo weeks, illustrations |
| `src/infrastructure` | env, feature flags, storage, logging, simulation |
| `backend/supabase` | draft SQL migration (not executed) |
| `docs` | product, architecture, rules, test strategy, change guide |

Start with [docs/architecture.md](docs/architecture.md) and
[docs/change-guide.md](docs/change-guide.md).
