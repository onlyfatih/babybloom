import {
  addDays,
  daysBetween,
  fromDayNumber,
  isLeapYear,
  localDate,
  parseLocalDate,
  toDayNumber,
  todayIn,
} from '@/domain/dates/local-date';
import { childAge, ageDisplay, monthAnniversary } from '@/domain/dates/age';

describe('LocalDate parsing', () => {
  it('accepts real calendar dates only', () => {
    expect(parseLocalDate('2024-02-29')).toBe('2024-02-29');
    expect(parseLocalDate('2023-02-29')).toBeNull();
    expect(parseLocalDate('2100-02-29')).toBeNull(); // century, not leap
    expect(parseLocalDate('2000-02-29')).toBe('2000-02-29'); // divisible by 400
    expect(parseLocalDate('2025-13-01')).toBeNull();
    expect(parseLocalDate('2025-04-31')).toBeNull();
    expect(parseLocalDate('25-04-01')).toBeNull();
    expect(parseLocalDate('2025-4-1')).toBeNull();
  });

  it('leap-year rule', () => {
    expect([1900, 2000, 2024, 2025, 2100].map(isLeapYear)).toEqual([false, true, true, false, false]);
  });
});

describe('day-number arithmetic', () => {
  it('round-trips across a wide range', () => {
    for (let n = -25000; n < 80000; n += 37) {
      expect(toDayNumber(fromDayNumber(n))).toBe(n);
    }
  });

  it('epoch anchor', () => {
    expect(toDayNumber(localDate('1970-01-01'))).toBe(0);
    expect(toDayNumber(localDate('2000-03-01'))).toBe(11017);
  });

  it('adds days across month, year and leap boundaries', () => {
    expect(addDays(localDate('2024-02-28'), 1)).toBe('2024-02-29');
    expect(addDays(localDate('2024-02-29'), 1)).toBe('2024-03-01');
    expect(addDays(localDate('2023-02-28'), 1)).toBe('2023-03-01');
    expect(addDays(localDate('2025-12-31'), 1)).toBe('2026-01-01');
    expect(addDays(localDate('2026-01-01'), -1)).toBe('2025-12-31');
    expect(daysBetween(localDate('2024-01-01'), localDate('2025-01-01'))).toBe(366);
  });
});

describe('birth dates across timezone boundaries', () => {
  // The same instant is a different calendar day in UTC+14 and UTC-11.
  const instant = new Date('2026-03-01T10:30:00Z');

  it('"today" depends on the zone, the stored birth date does not', () => {
    expect(todayIn('Pacific/Kiritimati', instant)).toBe('2026-03-02');
    expect(todayIn('Pacific/Pago_Pago', instant)).toBe('2026-02-28');
    expect(todayIn('Europe/Istanbul', instant)).toBe('2026-03-01');
  });

  it('a date-only birth date is never shifted by parsing', () => {
    const birth = localDate('2026-03-01');
    // Contrast with the unsafe pattern: new Date('2026-03-01') is UTC midnight,
    // which renders as Feb 28 in negative-offset zones.
    const unsafe = new Date('2026-03-01').toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    expect(unsafe).toBe('2026-02-28');
    expect(birth).toBe('2026-03-01');
  });

  it('age uses the device-zone calendar date', () => {
    const birth = localDate('2026-02-28');
    expect(childAge(birth, todayIn('Pacific/Pago_Pago', instant))?.totalDays).toBe(0);
    expect(childAge(birth, todayIn('Pacific/Kiritimati', instant))?.totalDays).toBe(2);
  });
});

describe('child age', () => {
  it('returns null for a future birth date', () => {
    expect(childAge(localDate('2026-12-01'), localDate('2026-11-27'))).toBeNull();
  });

  it('counts whole months with end-of-month clamping', () => {
    expect(monthAnniversary(localDate('2026-01-31'), 1)).toBe('2026-02-28');
    expect(monthAnniversary(localDate('2024-01-31'), 1)).toBe('2024-02-29');
    const age = childAge(localDate('2026-01-31'), localDate('2026-02-28'))!;
    expect(age.months).toBe(1);
    expect(age.daysAfterMonths).toBe(0);
  });

  it('leap-day birthdays have their anniversary on 28 Feb in common years', () => {
    const birth = localDate('2024-02-29');
    expect(childAge(birth, localDate('2025-02-27'))!.years).toBe(0);
    expect(childAge(birth, localDate('2025-02-28'))!.years).toBe(1);
    expect(childAge(birth, localDate('2028-02-29'))!.years).toBe(4);
  });

  it('display policy', () => {
    expect(ageDisplay(childAge(localDate('2026-11-01'), localDate('2026-11-27'))!)).toEqual({ kind: 'days', days: 26 });
    expect(ageDisplay(childAge(localDate('2026-05-10'), localDate('2026-11-27'))!)).toEqual({
      kind: 'months',
      months: 6,
      days: 17,
    });
    expect(ageDisplay(childAge(localDate('2023-09-15'), localDate('2026-11-27'))!)).toEqual({
      kind: 'years',
      years: 3,
      months: 2,
    });
  });
});
