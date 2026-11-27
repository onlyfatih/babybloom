import { t } from '@/content/localization';
import { LocalDate } from '@/domain/dates/local-date';
import { activeEstimate, gestationalAge, GestationalAge } from '@/domain/pregnancy/gestation';
import type { Pregnancy } from '@/domain/model';

export interface PregnancyView {
  age: GestationalAge | null;
  source: 'clinician-due-date' | 'last-menstrual-period' | null;
  dueDate: LocalDate | null;
  primary: string;
  secondary: string | null;
  note: string | null;
}

export function pregnancyView(p: Pregnancy, today: LocalDate): PregnancyView {
  const estimate = activeEstimate(p);
  if (!estimate) return { age: null, source: null, dueDate: null, primary: '', secondary: null, note: null };
  const age = gestationalAge(estimate, today);
  const weekDay = t('pregnancy.weekDay', { weeks: age.weeks, days: age.days });
  switch (age.phase) {
    case 'before-start':
      return { age, source: estimate.source, dueDate: estimate.dueDate, primary: '—', secondary: null, note: t('pregnancy.beforeStart') };
    case 'beyond-display':
      return { age, source: estimate.source, dueDate: estimate.dueDate, primary: t('pregnancy.beyondDisplay'), secondary: null, note: t('pregnancy.beyondDisplayNote') };
    case 'past-due':
      return {
        age,
        source: estimate.source,
        dueDate: estimate.dueDate,
        primary: weekDay,
        secondary: age.daysUntilDue === 0 ? t('pregnancy.dueToday') : t('pregnancy.pastDue', { days: -age.daysUntilDue }),
        note: t('pregnancy.pastDueNote'),
      };
    case 'before-content':
      return { age, source: estimate.source, dueDate: estimate.dueDate, primary: weekDay, secondary: t('pregnancy.daysUntilDue', { days: age.daysUntilDue }), note: t('pregnancy.beforeContent') };
    case 'in-range':
      return { age, source: estimate.source, dueDate: estimate.dueDate, primary: weekDay, secondary: t('pregnancy.daysUntilDue', { days: age.daysUntilDue }), note: null };
  }
}
