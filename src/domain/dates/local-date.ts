/**
 * Date-only values (birth dates, LMP dates, event dates).
 *
 * A LocalDate is an ISO calendar date string "YYYY-MM-DD" with no time and no
 * timezone. It is never parsed through `new Date("YYYY-MM-DD")`, because that
 * parses as UTC midnight and can shift the calendar day when rendered in a
 * negative-offset timezone. All arithmetic uses a proleptic Gregorian day
 * number computed with integer math. See docs/date-rules.md.
 */

declare const localDateBrand: unique symbol;
export type LocalDate = string & { readonly [localDateBrand]: true };

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CalendarParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1] ?? 0;
}

/** Returns a LocalDate or null when the string is not a real calendar date. */
export function parseLocalDate(value: string): LocalDate | null {
  const match = PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return value as LocalDate;
}

/** Throws on invalid input. Use for trusted fixtures and mapped records only. */
export function localDate(value: string): LocalDate {
  const parsed = parseLocalDate(value);
  if (!parsed) throw new Error(`Invalid LocalDate: ${value}`);
  return parsed;
}

export function fromParts({ year, month, day }: CalendarParts): LocalDate {
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return localDate(iso);
}

export function toParts(date: LocalDate): CalendarParts {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

/**
 * Days since 1970-01-01 (civil calendar), via Howard Hinnant's
 * days_from_civil algorithm. Pure integer math, no Date object.
 */
export function toDayNumber(date: LocalDate): number {
  const { year, month, day } = toParts(date);
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromDayNumber(dayNumber: number): LocalDate {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return fromParts({ year, month, day });
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The calendar date "now" in a given IANA timezone. Uses Intl, which Hermes
 * supports on iOS and Android; verify on device (see docs/test-strategy.md).
 */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return localDate(`${get('year')}-${get('month')}-${get('day')}`);
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
