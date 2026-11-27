# Manual acceptance

Run on a real iPhone (Expo Go) and an Android phone or emulator before calling
a phase done. Mark each line with date, device, OS version, result.
None of these have been executed on a native device yet.

## Setup
- [ ] `npm install && npx expo start`, open in Expo Go, app reaches the welcome screen.
- [ ] Settings → Prototip araçları → reset gives a clean welcome screen.

## Journeys
1. [ ] New pregnancy: wrong future LMP shows an error; valid LMP shows weeks + days and a due date.
2. [ ] Add a second profile (existing child) and switch profiles from the header.
3. [ ] Memory with 3 photos from the library: iOS/Android permission dialog is Turkish; progress shows; "Kaydedildi" appears only after the save.
4. [ ] Open a saved photo's file on device: no GPS location in its metadata.
5. [ ] Edit an old memory's date; it moves in the timeline.
6. [ ] Measurement: 300 kg is rejected as implausible; 11,8 kg saves; switch to lb in Settings and see the converted value.
7. [ ] Appointment with time and zone; it shows under "Yaklaşan" and moves to "Geçmiş" an hour after start.
8. [ ] Invite: code and expiry shown; join with MINIK-2026 on a second install.
9. [ ] Record birth from an active pregnancy: child profile created; pregnancy memories still visible.
10. [ ] Export: choose one profile, JSON contains only visible records of it.
11. [ ] Delete a memory with photos; photos are gone from the timeline.
12. [ ] Simulate upload failure: memory is not reported saved; retry saves it.
13. [ ] Simulate offline: banner shows; saving is refused with a clear message.
14. [ ] Private memory written by Can is not visible to Elif (demo family).

## Platform checks
- [ ] Largest Dynamic Type (iOS) / font size (Android): no clipped text, buttons reachable.
- [ ] VoiceOver and TalkBack read every control in Turkish, in a sensible order.
- [ ] Keyboard never covers the focused field; back gesture with unsaved changes asks first.
- [ ] Small screen (iPhone SE size) and a notch/home-indicator phone.
- [ ] Reduce Motion on: no motion beyond fades.
- [ ] App relaunch keeps data; airplane mode behaves like simulated offline.
