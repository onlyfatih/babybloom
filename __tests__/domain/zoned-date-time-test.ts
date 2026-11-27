import { localDate } from '@/domain/dates/local-date';
import { localTime, toInstant, parseZonedDateTime } from '@/domain/dates/zoned-date-time';
import { splitAppointments } from '@/domain/appointments/schedule';

const z = (date: string, time: string, timeZone: string) => ({ date: localDate(date), time: localTime(time), timeZone });

describe('appointment instants', () => {
  it('Istanbul has a fixed UTC+3 offset', () => {
    expect(new Date(toInstant(z('2026-12-10', '09:30', 'Europe/Istanbul')).epochMs).toISOString()).toBe(
      '2026-12-10T06:30:00.000Z',
    );
  });

  it('summer vs winter offsets in Berlin', () => {
    expect(new Date(toInstant(z('2026-07-01', '10:00', 'Europe/Berlin')).epochMs).toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(new Date(toInstant(z('2026-12-01', '10:00', 'Europe/Berlin')).epochMs).toISOString()).toBe('2026-12-01T09:00:00.000Z');
  });

  it('spring-forward gap shifts forward (02:30 does not exist on 2026-03-29 in Berlin)', () => {
    const r = toInstant(z('2026-03-29', '02:30', 'Europe/Berlin'));
    expect(r.resolution).toBe('gap-shifted');
    expect(new Date(r.epochMs).toISOString()).toBe('2026-03-29T01:30:00.000Z'); // 03:30 CEST
  });

  it('fall-back overlap picks the earlier instant (02:30 twice on 2026-10-25 in Berlin)', () => {
    const r = toInstant(z('2026-10-25', '02:30', 'Europe/Berlin'));
    expect(r.resolution).toBe('overlap-earlier');
    expect(new Date(r.epochMs).toISOString()).toBe('2026-10-25T00:30:00.000Z'); // 02:30 CEST
  });

  it('US DST gap', () => {
    const r = toInstant(z('2026-03-08', '02:15', 'America/New_York'));
    expect(r.resolution).toBe('gap-shifted');
    expect(new Date(r.epochMs).toISOString()).toBe('2026-03-08T07:15:00.000Z'); // 03:15 EDT
  });

  it('rejects invalid zones and times', () => {
    expect(parseZonedDateTime('2026-01-01', '25:00', 'Europe/Istanbul')).toBeNull();
    expect(parseZonedDateTime('2026-01-01', '10:00', 'Mars/Olympus')).toBeNull();
    expect(parseZonedDateTime('2026-01-01', '10:00', 'Europe/Istanbul')).not.toBeNull();
  });
});

describe('upcoming / past split', () => {
  it('sorts by instant across timezones, not by wall-clock text', () => {
    const items = [
      { id: 'ist-10', start: z('2026-12-01', '10:00', 'Europe/Istanbul') }, // 07:00Z
      { id: 'lon-08', start: z('2026-12-01', '08:00', 'Europe/London') }, // 08:00Z
      { id: 'past', start: z('2026-11-01', '08:00', 'Europe/Istanbul') },
    ];
    const now = Date.parse('2026-11-27T12:00:00Z');
    const { upcoming, past } = splitAppointments(items, now);
    expect(upcoming.map((i) => i.id)).toEqual(['ist-10', 'lon-08']);
    expect(past.map((i) => i.id)).toEqual(['past']);
  });

  it('keeps an appointment upcoming for one hour after it starts', () => {
    const items = [{ start: z('2026-11-27', '14:30', 'Europe/Istanbul') }]; // 11:30Z
    expect(splitAppointments(items, Date.parse('2026-11-27T12:29:00Z')).upcoming).toHaveLength(1);
    expect(splitAppointments(items, Date.parse('2026-11-27T12:31:00Z')).past).toHaveLength(1);
  });
});
