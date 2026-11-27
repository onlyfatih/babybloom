/**
 * Wall-clock datetimes that belong to a place (appointments).
 *
 * We persist the intended local date, local time and IANA timezone exactly as
 * the parent entered them. The instant (UTC epoch ms) is *derived* for sorting
 * and notifications; it is never the source of truth. If timezone rules change
 * after entry, the wall-clock time the parent intended is preserved.
 * See docs/date-rules.md#appointments.
 */
import { LocalDate, parseLocalDate, toParts } from './local-date';

declare const localTimeBrand: unique symbol;
/** "HH:mm", 24-hour. */
export type LocalTime = string & { readonly [localTimeBrand]: true };

export function parseLocalTime(value: string): LocalTime | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return value as LocalTime;
}

export function localTime(value: string): LocalTime {
  const parsed = parseLocalTime(value);
  if (!parsed) throw new Error(`Invalid LocalTime: ${value}`);
  return parsed;
}

export interface ZonedDateTime {
  date: LocalDate;
  time: LocalTime;
  timeZone: string; // IANA, e.g. "Europe/Istanbul"
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `timeZone` from UTC at the given instant, in minutes. */
export function offsetMinutesAt(timeZone: string, epochMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(epochMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - epochMs) / 60000);
}

export type InstantResolution = 'exact' | 'gap-shifted' | 'overlap-earlier';

/**
 * Converts a wall-clock time to an instant.
 *
 * DST policy (same as Temporal's "compatible" disambiguation):
 * - Gap (time does not exist, clocks jump forward): shift forward by the gap length.
 * - Overlap (time occurs twice, clocks fall back): use the earlier instant.
 */
export function toInstant(value: ZonedDateTime): { epochMs: number; resolution: InstantResolution } {
  const { year, month, day } = toParts(value.date);
  const [hour, minute] = value.time.split(':').map(Number) as [number, number];
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);

  const offsetBefore = offsetMinutesAt(value.timeZone, wallAsUtc - 24 * 3600_000);
  const offsetAfter = offsetMinutesAt(value.timeZone, wallAsUtc + 24 * 3600_000);

  const candidates = Array.from(new Set([offsetBefore, offsetAfter]))
    .map((offset) => wallAsUtc - offset * 60000)
    .filter((epoch) => wallAsUtc - offsetMinutesAt(value.timeZone, epoch) * 60000 === epoch)
    .sort((a, b) => a - b);

  if (candidates.length >= 1) {
    return { epochMs: candidates[0]!, resolution: candidates.length > 1 ? 'overlap-earlier' : 'exact' };
  }
  // Gap: interpret with the pre-transition offset, which lands after the gap.
  return { epochMs: wallAsUtc - offsetBefore * 60000, resolution: 'gap-shifted' };
}

export function parseZonedDateTime(date: string, time: string, timeZone: string): ZonedDateTime | null {
  const d = parseLocalDate(date);
  const t = parseLocalTime(time);
  if (!d || !t || !isValidTimeZone(timeZone)) return null;
  return { date: d, time: t, timeZone };
}
