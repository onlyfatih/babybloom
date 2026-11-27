# Status

_Updated 2026-11-27._ Phase: **P2 done, waiting for the owner's visual approval.** P3 not started.

| Phase | Scope | State |
| --- | --- | --- |
| P0 | Architecture docs, data model, permission matrix, date and content rules | Done (this folder) |
| P1 | Working prototype on fictional local data | Done |
| P2 | Visual refinement via screenshots at 320/393 px and 1.35× text | Done, awaiting approval |
| P3 | Supabase backend, auth, RLS tests, private storage | Not started; needs approval (account, possible cost) |
| P4 | Native verification, notifications, calendar export (dev build) | Not started |
| P5 | Content review, EAS builds, store prep | Not started |

## Works now (prototype, demo data on device)
Onboarding (new pregnancy, existing child, join with code, demo family),
profile switching, pregnancy home with weeks + days and weekly view, dating
edit, pause reminders / hide content / end / archive, record birth, memories
with photos (two-stage save, retry), timeline per profile, measurements with
chart and unit switch, appointments with time zone, family members and
invitations, JSON export, settings, prototype failure simulation.

## Known limitations
- No backend: data lives in AsyncStorage on one device; "family" is simulated.
- Permission checks run on the client only. Nothing is authorized by a server.
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
