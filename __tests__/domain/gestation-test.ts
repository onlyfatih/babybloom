import { localDate } from '@/domain/dates/local-date';
import { activeEstimate, gestationalAge, trimester, validateDating } from '@/domain/pregnancy/gestation';

const lmp = localDate('2026-06-01');

describe('active estimate', () => {
  it('LMP + 280 days gives the due date', () => {
    const e = activeEstimate({ lastMenstrualPeriod: lmp })!;
    expect(e.source).toBe('last-menstrual-period');
    expect(e.dueDate).toBe('2027-03-08');
  });

  it('clinician due date takes precedence over LMP', () => {
    const e = activeEstimate({ lastMenstrualPeriod: lmp, clinicianDueDate: localDate('2027-03-15') })!;
    expect(e.source).toBe('clinician-due-date');
    expect(e.gestationStart).toBe('2026-06-08');
  });

  it('returns null with no dating input', () => {
    expect(activeEstimate({})).toBeNull();
  });
});

describe('week/day boundaries', () => {
  const e = activeEstimate({ lastMenstrualPeriod: lmp })!;
  const at = (iso: string) => gestationalAge(e, localDate(iso));

  it('day 0 is 0w0d', () => {
    expect(at('2026-06-01')).toMatchObject({ weeks: 0, days: 0, phase: 'before-content', contentWeek: null });
  });
  it('day 6 is 0w6d and day 7 is 1w0d', () => {
    expect(at('2026-06-07')).toMatchObject({ weeks: 0, days: 6 });
    expect(at('2026-06-08')).toMatchObject({ weeks: 1, days: 0 });
  });
  it('content starts at 4w0d', () => {
    expect(at('2026-06-28')).toMatchObject({ weeks: 3, days: 6, contentWeek: null, phase: 'before-content' });
    expect(at('2026-06-29')).toMatchObject({ weeks: 4, days: 0, contentWeek: 4, phase: 'in-range' });
  });
  it('39w6d is in range, 40w0d is past due and the due date', () => {
    expect(at('2027-03-07')).toMatchObject({ weeks: 39, days: 6, phase: 'in-range', daysUntilDue: 1 });
    expect(at('2027-03-08')).toMatchObject({ weeks: 40, days: 0, phase: 'past-due', daysUntilDue: 0 });
  });
  it('42w6d keeps content, 43w has none, 44w0d stops display', () => {
    expect(at('2027-03-28')).toMatchObject({ weeks: 42, days: 6, contentWeek: 42 });
    expect(at('2027-03-29')).toMatchObject({ weeks: 43, contentWeek: null, phase: 'past-due' });
    expect(at('2027-04-05')).toMatchObject({ weeks: 44, phase: 'beyond-display' });
  });
  it('a date before the start is flagged', () => {
    expect(at('2026-05-31').phase).toBe('before-start');
  });
});

describe('due-date edits', () => {
  it('editing the clinician due date moves the gestational age, never the stored LMP', () => {
    const today = localDate('2026-10-01');
    const input = { lastMenstrualPeriod: lmp, clinicianDueDate: localDate('2027-03-08') };
    const before = gestationalAge(activeEstimate(input)!, today);
    const after = gestationalAge(activeEstimate({ ...input, clinicianDueDate: localDate('2027-03-01') })!, today);
    expect(after.totalDays - before.totalDays).toBe(7);
    expect(input.lastMenstrualPeriod).toBe('2026-06-01');
  });

  it('removing the clinician due date falls back to LMP', () => {
    const e = activeEstimate({ lastMenstrualPeriod: lmp, clinicianDueDate: null })!;
    expect(e.source).toBe('last-menstrual-period');
  });
});

describe('validation', () => {
  const today = localDate('2026-11-27');
  it('rejects future LMP and implausible dates', () => {
    expect(validateDating({ lastMenstrualPeriod: localDate('2026-11-28') }, today)).toBe('lmp-in-future');
    expect(validateDating({ lastMenstrualPeriod: localDate('2025-11-01') }, today)).toBe('lmp-too-old');
    expect(validateDating({ clinicianDueDate: localDate('2027-12-01') }, today)).toBe('due-date-too-far');
    expect(validateDating({ clinicianDueDate: localDate('2026-09-01') }, today)).toBe('due-date-too-old');
    expect(validateDating({ clinicianDueDate: localDate('2027-05-01') }, today)).toBeNull();
    expect(validateDating({}, today)).toBe('missing');
  });
});

it('trimester boundaries', () => {
  expect([13, 14, 27, 28].map(trimester)).toEqual([1, 2, 2, 3]);
});
