# Date rules

Code: `src/domain/dates/*`, `src/domain/pregnancy/gestation.ts`,
`src/domain/appointments/schedule.ts`. Tests: `__tests__/domain/`.

## Types

| Type | Shape | Used for |
| --- | --- | --- |
| `LocalDate` | branded `"YYYY-MM-DD"`, years 1900–2200 | birth date, event date, measured on, LMP, EDD |
| `LocalTime` | `"HH:mm"` | birth time, appointment time |
| `ZonedDateTime` | `{ date, time, timeZone }` (IANA id) | appointments |
| `Instant` | ISO UTC string | created/updated stamps |

## Rules

1. Never `new Date('YYYY-MM-DD')` (parses as UTC midnight and shifts a day
   west of UTC). Arithmetic uses integer day numbers (Hinnant's
   days-from-civil algorithm): `addDays`, `daysBetween`.
2. "Today" is the calendar date in the device time zone: `todayIn(tz)` via
   `Intl.DateTimeFormat`. Screens use `useToday()`.
3. A birth date is the date where the child was born, stored as a date. It
   never moves when the family travels.
4. Child age: completed months via month anniversaries; an anniversary on a
   missing day (e.g. 31st) clamps to the month's last day. Display: days
   (< 1 month), months + days (< 2 years), years + months.
5. Appointments store wall time + IANA zone, not an instant. The instant is
   derived with Temporal-compatible rules: a time in a DST gap moves forward
   by the gap, an ambiguous time takes the earlier offset. An appointment
   stays "upcoming" until 1 hour after its start.
6. Formatting is built from parts (`src/content/localization/format.ts`),
   e.g. "27 Kasım 2026", "27.11.2026". Input mask is DD.MM.YYYY.

## Gestational age

Sources: ACOG Committee Opinion No. 700, "Methods for Estimating the Due Date"
(2017, reaffirmed); Naegele's rule (EDD = LMP + 280 days).

- Day 0 = first day of LMP. With a clinician due date, day 0 = EDD − 280 and
  the clinician date wins. Conception date is never inferred.
- Displayed as completed weeks + days: 171 days = "24 hafta 3 gün".
- Trimesters by completed weeks: 1st < 14, 2nd 14–27, 3rd ≥ 28.
- Phases: `before-start` (< 0 days, entry error), `before-content`
  (< 4 weeks), `in-range`, `past-due` (≥ 280 days, still counting),
  `beyond-display` (≥ 308 days = 44w0d, no running age shown).
- Validation catches typos only: LMP in the future, LMP ≥ 308 days ago,
  EDD more than 280 days ahead or more than 28 days past.
- The app never marks a birth by itself; past due it invites the family to
  record the birth when they are ready.

## Tested cases (in `__tests__/domain`)

Leap years and leap-day birthdays, month-end clamping, wide round trips,
"today" depending on zone while the stored birth date does not, 0w6d→1w0d,
4w0d content start, 40w0d due date, 44w0d display stop, due-date edits and
fallback to LMP, trimester boundaries, Istanbul fixed offset, Berlin DST gap
and overlap, a US DST gap, sorting across zones, the one-hour grace.
