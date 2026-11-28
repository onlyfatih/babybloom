# Running Minik Atlas on your iPhone from a Mac (development build)

**Status: not tried on a real Mac or iPhone.** These steps come from the Expo
SDK 58 documentation and from what could be checked in a Linux cloud
container (see "What was checked" below). Please report the first step that
does not behave as written.

## Why a development build and not Expo Go

The App Store version of Expo Go stops at SDK 54 ("Expo Go on the Apple App
Store stops at SDK 54, and SDK 55 and later are not available there",
docs.expo.dev/troubleshooting/expo-go-version-mismatch). This app uses SDK 58.
Expo Go for SDK 58 needs `eas go` plus TestFlight, which requires a paid Apple
Developer Program membership. A local build with Xcode needs no paid account
("this is the only way to install a development build on an iPhone without a
paid Apple Developer account", docs.expo.dev/develop/development-builds/introduction).

## What you need

- A Mac with **Xcode 26.4 or newer** (App Store). Open it once, accept the
  licence and let it install the iOS platform. Then `xcode-select --install`
  for the command line tools.
- **Node.js 22.13 or newer** (`node -v`).
- **Docker Desktop**, running (for the local Supabase backend).
- An **Apple ID** added in Xcode → Settings → Accounts. A free account gives
  you a "Personal Team".
- An iPhone with **iOS 16.4 or newer** (the generated project's deployment
  target) and a USB cable. Mac and iPhone on the **same Wi-Fi**.

## Steps

1. **Get the code**
   ```sh
   git clone https://github.com/onlyfatih/babybloom.git minik-atlas
   cd minik-atlas
   git checkout functional-v1
   npm ci
   ```

2. **Start the local backend** (Docker Desktop must be running)
   ```sh
   npx supabase start --workdir backend
   npx supabase status --workdir backend
   ```
   Note `API_URL` and the **publishable** key (`sb_publishable_…`). Never use
   the secret key in the app; it refuses to start with one.
   If image pulls fail, retry with
   `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` in front of the start command.

3. **Point the app at your Mac's network address.** The phone cannot reach
   `127.0.0.1` on the Mac.
   ```sh
   ipconfig getifaddr en0          # e.g. 192.168.1.23 (Wi-Fi)
   cp .env.example .env.local
   ```
   In `.env.local` set:
   ```
   EXPO_PUBLIC_APP_ENV=development
   EXPO_PUBLIC_BACKEND=supabase
   EXPO_PUBLIC_BUILD_VARIANT=development
   EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.23:54321
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Check from the iPhone's Safari that `http://192.168.1.23:54321/auth/v1/health`
   answers (any JSON reply is fine). If it does not, allow Docker in macOS
   System Settings → Network → Firewall.

4. **Turn on Developer Mode on the iPhone** (once). Connect it to the Mac by
   USB and open Xcode → Open Developer Tool → Device Hub so the phone shows
   the option. On the phone: Settings → Privacy & Security → Developer Mode →
   on → Restart → Turn On.

5. **Build and install.** Use a bundle identifier of your own; a personal
   team cannot sign the placeholder `com.example.minikatlas`.
   ```sh
   IOS_BUNDLE_ID=com.yourname.minikatlas npx expo run:ios --device
   ```
   Pick your iPhone from the list. The first build takes several minutes
   (it generates `ios/`, which is git-ignored, installs CocoaPods
   dependencies and compiles). If it reports that CocoaPods is missing:
   `brew install cocoapods`, then run the command again.

   If it fails with a signing error ("requires a development team"):
   open `ios/MinikAtlas.xcworkspace` in Xcode → target **MinikAtlas** →
   **Signing & Capabilities** → tick "Automatically manage signing" → Team:
   your Personal Team. Close Xcode and run the command again.

6. **Trust the developer on the phone** (first install with a free account):
   Settings → General → VPN & Device Management → your Apple ID → Trust.
   Then open Minik Atlas. When iOS asks to find devices on your local
   network, choose **Allow** (the dev build connects to your Mac).

7. **Sign in.** Enter any address (e.g. `ben@example.test`); the code does
   not go to a real mailbox. Open **http://127.0.0.1:54324** (Mailpit) in a
   browser on the Mac and copy the 6-digit code.

8. **Later sessions.** With the app installed, start only the dev server:
   `npx expo start` (it serves the development build; press `r` to reload).
   Rebuild with step 5 only after a native dependency or `app.json` changes.
   With a free account the app stops opening after about 7 days (Apple
   limit on free provisioning); run step 5 again.

## What to try on the phone

- Sign in with an email code; close the app fully and reopen: still signed in.
- Create a family, a pregnancy or a child; add a memory with a photo from
  your library (iOS asks for photo access).
- Record the birth; check that pregnancy memories are still in the story.
- Edit the child (name, date, time), replace and remove the profile photo,
  archive and restore it (owner).
- Add, correct and delete a measurement; see the chart with two values.
- Add, edit and delete an appointment; the time zone is shown.
- Sign out in Settings: records stay; signing in again shows them.
- A second person (another phone or the web build) can join with an
  invitation code and see family records but not private ones.

## Troubleshooting

| Symptom | Try |
| --- | --- |
| "Network request failed" at sign-in | Same Wi-Fi? Health URL from step 3 opens in Safari? If an IP address does not work, use the Mac's Bonjour name instead: `http://<Mac name>.local:54321` (System Settings → General → Sharing → Local hostname). |
| App opens to a red error about configuration | `.env.local` values; restart `npx expo start` after any change (values are read at bundle time). |
| "Could not connect to development server" | Run `npx expo start`; allow Local Network for Minik Atlas in iPhone Settings → Privacy & Security → Local Network. |
| Build fails in CocoaPods | `cd ios && pod install --repo-update`, then step 5 again. |

## What was checked (in a Linux container, not on Apple hardware)

- `npx expo export --platform ios` bundles the app for iOS (Hermes bytecode).
- `IOS_BUNDLE_ID=… npx expo prebuild --platform ios --no-install` generates
  the Xcode project with that bundle identifier, iOS deployment target 16.4,
  App Transport Security `NSAllowsLocalNetworking` (plain HTTP to the local
  network allowed), the Turkish photo-library permission text and the local
  network permission text.
- The local Supabase ports are published on all interfaces (`0.0.0.0`) in the
  container's Docker; Docker Desktop on a Mac is expected to do the same, not
  verified.
- Every library the app uses is listed as an Expo SDK 58 module.

Not checked: Xcode build, code signing, installation, launch, and any
behaviour on an iPhone.
