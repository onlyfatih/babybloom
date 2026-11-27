import type { Appointment } from '../model';
import { toInstant } from '../dates/zoned-date-time';

export function appointmentInstant(a: Pick<Appointment, 'start'>): number {
  return toInstant(a.start).epochMs;
}

/**
 * Splits into upcoming (ascending) and past (descending).
 * An appointment counts as upcoming until 1 hour after its start.
 */
export function splitAppointments<T extends Pick<Appointment, 'start'>>(
  items: T[],
  nowMs: number,
  graceMs = 3600_000,
): { upcoming: T[]; past: T[] } {
  const withInstant = items.map((item) => ({ item, at: appointmentInstant(item) }));
  const upcoming = withInstant.filter((x) => x.at + graceMs >= nowMs).sort((a, b) => a.at - b.at);
  const past = withInstant.filter((x) => x.at + graceMs < nowMs).sort((a, b) => b.at - a.at);
  return { upcoming: upcoming.map((x) => x.item), past: past.map((x) => x.item) };
}
