import { canTransition, sendsPregnancyReminders, showsPregnancyContent, validateBirth } from '@/domain/pregnancy/lifecycle';
import { buildPregnancy } from '@/testing/builders';
import { localDate } from '@/domain/dates/local-date';

describe('pregnancy lifecycle', () => {
  it('allows explicit transitions only', () => {
    expect(canTransition('active', 'born')).toBe(true);
    expect(canTransition('born', 'active')).toBe(false);
    expect(canTransition('ended', 'born')).toBe(false);
  });
  it('reminders can be paused without registering a birth', () => {
    const p = buildPregnancy({ remindersPaused: true });
    expect(p.status).toBe('active');
    expect(sendsPregnancyReminders(p)).toBe(false);
    expect(showsPregnancyContent(p)).toBe(true);
  });
  it('content can be stopped sensitively', () => {
    expect(showsPregnancyContent(buildPregnancy({ contentHidden: true }))).toBe(false);
    expect(showsPregnancyContent(buildPregnancy({ status: 'ended' }))).toBe(false);
  });
  it('birth validation supports more than one child', () => {
    const p = buildPregnancy();
    const kid = { name: 'Deniz', birthDate: localDate('2026-11-20') };
    expect(validateBirth(p, [kid, { ...kid, name: 'Ege' }])).toBeNull();
    expect(validateBirth(p, [])).toBe('no-children');
    expect(validateBirth(p, [{ ...kid, name: ' ' }])).toBe('child-name-required');
    expect(validateBirth(buildPregnancy({ status: 'born' }), [kid])).toBe('pregnancy-not-active');
  });
});
