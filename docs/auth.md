# Authentication (V1)

## Method: email one-time code

One method only: the user enters an email address, receives a 6-digit code
and types it into the app (`signInWithOtp` + `verifyOtp({ type: 'email' })`).
The first successful code creates the account.

Why this method:

- No password to forget, so no separate recovery flow: "recovery" is
  requesting a new code to the same address.
- No deep links or redirect URLs are needed on iOS/Android (the code is typed),
  so it works in Expo Go, development builds and the web preview alike.
- Social providers are not implemented (deliberately, per the brief).

Trade-off: sign-in depends on email delivery. Losing access to the mailbox
means losing access to the account; account recovery by support is not in V1.

## Session handling (client)

- Session stored with AsyncStorage on native (Supabase React Native
  quickstart), `persistSession: true`, `autoRefreshToken: true`,
  `detectSessionInUrl: false`. AsyncStorage is not encrypted; on a lost
  unlocked phone the refresh token is readable. Moving to an encrypted store
  is a later hardening item.
- Auto-refresh runs only in the foreground (`IdentityRepository.setForeground`,
  wired to AppState in R2).
- `SessionController` (src/data/session) owns the six app states:
  bootstrapping, signed-out, authenticated-without-family,
  authenticated-with-family-without-profile, ready, recoverable-error.
  It subscribes to auth changes and unsubscribes on stop; results that arrive
  after a newer resolution are discarded; on a user/family change it calls
  `onScopeChange` before publishing, where the app cancels queries and clears
  the previous scope's cache.
- Sign-out is `signOut({ scope: 'local' })`: this device only. It never
  deletes server data or other devices' sessions. Drafts are keyed by user,
  so another account on the same device never sees them.
- A session that disappears without an explicit sign-out (refresh token
  rejected) becomes `signed-out` with reason `session-expired`.
- Revoked membership: the next resolution finds no active membership and
  moves the user to `authenticated-without-family` with a notice.

## Local setup

`backend/supabase/config.toml`:

- Email OTP length 6, expiry 600 s, one request per address per second.
- `email_sent = 100` per hour **locally only** (tests send many codes).
- Templates `templates/sign-in-code.html` (Turkish) for both the magic-link
  and confirmation emails, so a code is sent in both the new-user and
  returning-user case.
- Mails are captured by Mailpit at http://127.0.0.1:54324 (no real email).

## Hosted setup (owner, before beta)

1. Create a Supabase project (free tier; do not enable paid add-ons without
   deciding to).
2. Authentication → Providers → Email: enabled; "Confirm email" may stay on.
3. Authentication → Email Templates: paste `backend/supabase/templates/sign-in-code.html`
   into **Magic Link** and **Confirm signup**. The template must contain
   `{{ .Token }}`, otherwise users get a link instead of a code.
4. Authentication → SMTP: configure a custom SMTP sender. The built-in
   sender is only for trials and has a very low hourly limit, which would
   block real sign-ins. (A transactional email provider may have its own cost;
   that decision is the owner's.)
5. Authentication → Rate limits: keep the defaults for code verification;
   raise "emails per hour" only together with custom SMTP.
6. Redirect URLs: not used by this method. Leave Site URL at its default.
7. Put the project URL and the **publishable** key into the build env
   (`.env.example`). Never the secret key.

## Rate limits that matter

- Per address: one code request per `max_frequency` (local 1 s; hosted
  default 60 s). The adapter maps 429 to `rate-limited`; the sign-in screen (R2) will ask the user to wait.
- Code verification attempts are limited per IP (`token_verifications`, 30 per 5 minutes locally).
- Invitation codes: 10 wrong guesses per user per 15 minutes
  (`accept_invitation`).
