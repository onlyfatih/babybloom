# Release checklist

Nothing here is done. A release needs the owner's explicit approval at each
step that publishes, submits, or costs money.

## Blockers before any external tester
- [ ] Real backend (P3): Supabase project, migrations applied, RLS policy tests passing.
- [ ] Auth with real accounts; session expiry and revoke tested.
- [ ] Photos in a private bucket with signed URLs; EXIF stripping verified on devices.
- [ ] Manual acceptance (manual-acceptance.md) passed on iOS and Android.
- [ ] Demo content disabled (`showDemoContent: false`), demo provider not bundled, prototype tools hidden.
- [ ] Privacy policy and terms (Turkish), KVKK and GDPR review by a qualified person.
- [ ] Account and data deletion flow that really deletes server data.

## Before store submission
- [ ] Weekly content reviewed by a licensed clinician (content-model.md § Release blockers).
- [ ] App Store privacy labels / Google Play Data safety filled from the real data flow.
- [ ] Real bundle id (replace `com.example.minikatlas`), icons, splash, store screenshots from devices.
- [ ] EAS project and build profiles; Apple Developer and Google Play accounts (owner's, paid).
- [ ] Crash reporting chosen and disclosed (none is installed).
- [ ] Version and build number bumped; changelog in status.md.

## Never claim without evidence
End-to-end encryption (not implemented), medical review, production
readiness, native verification from web runs, store approval.
