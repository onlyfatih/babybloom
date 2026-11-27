# Product V1

## Who and why

Parents expecting a baby, or with a child under about 3, who want one calm,
private place for the family's story: how the pregnancy is going week by week,
memories with photos, growth numbers, appointments, and a small circle of
trusted adults (partner, grandparents, caregiver). Turkish first.

## V1 scope

| Area | In V1 | Prototype state |
| --- | --- | --- |
| Profiles | Pregnancy and child profiles in one family; switch between them | Done (demo data) |
| Pregnancy | Dating from LMP or clinician due date; weeks + days; weekly content view; manage status (born / archive / end); pause reminders; hide content | Done; content is labelled demo text |
| Birth | Record birth: pregnancy becomes `born`, 1–4 child profiles created and linked; pregnancy memories stay | Done |
| Memories | Text + up to 10 photos, event date, family or private visibility, edit, delete | Done; photos stored locally |
| Measurements | Weight, length, head circumference; kg/g/lb, cm/in; simple history chart | Done; no percentiles |
| Appointments | Title, date, time, IANA time zone, location, notes, visibility; upcoming / past | Done; no reminders yet |
| Family | Owner invites adults with a one-time code; revoke; private stays private | Done (demo, no server) |
| Export | User exports what they can see for chosen profiles as JSON | Done; photos not included |
| Settings | Units, notification preferences (stored only), prototype tools | Done |

## Out of scope for V1 (do not build)

AI diagnosis or symptom checking, tahlil/lab result interpretation, medication
or dosage advice, medical alerts, "leap"/wonder-week calendars, growth
percentiles or comparisons, voice transcription, gamification (streaks,
badges), payments, social feed or public sharing, chat, a CMS, full offline
sync, microservices.

## Principles

- Private by default. Private entries are visible only to their author, even
  to the family owner.
- Not a medical device. The app never interprets health data. Plausibility
  checks only catch typos.
- Calm: no red badges, no streaks, no countdown pressure. Loss is handled
  with a quiet "end pregnancy" path that asks no reason.
- A pregnancy is never auto-marked as born. The family records the birth.

## V1 success (for later measurement, not instrumented yet)

A family records a memory in under a minute; a second adult joins with a
code; no private entry is ever visible to another member.
