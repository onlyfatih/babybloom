import { View } from 'react-native';
import { t } from '@/content/localization';
import { LocalDate } from '@/domain/dates/local-date';
import { DatingValidationError } from '@/domain/pregnancy/gestation';
import { Banner, Chip, DateField, Text } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

export type DatingMode = 'due-date' | 'lmp';

export const datingErrorMessage: Record<DatingValidationError, string> = {
  missing: t('errors.required'),
  'lmp-in-future': t('errors.lmpInFuture'),
  'lmp-too-old': t('errors.lmpTooOld'),
  'due-date-too-far': t('errors.dueDateTooFar'),
  'due-date-too-old': t('errors.dueDateTooOld'),
};

export function PregnancyDatingForm({
  mode,
  onModeChange,
  dueDate,
  lmp,
  onDueDate,
  onLmp,
  error,
  note,
}: {
  mode: DatingMode;
  onModeChange: (m: DatingMode) => void;
  dueDate: LocalDate | null;
  lmp: LocalDate | null;
  onDueDate: (d: LocalDate | null) => void;
  onLmp: (d: LocalDate | null) => void;
  error: string | null;
  note: string;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="label">{t('onboarding.datingQuestion')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityRole="radiogroup">
        <Chip label={t('onboarding.datingDueDate')} selected={mode === 'due-date'} onPress={() => onModeChange('due-date')} />
        <Chip label={t('onboarding.datingLmp')} selected={mode === 'lmp'} onPress={() => onModeChange('lmp')} />
      </View>
      {mode === 'due-date' ? (
        <DateField key="due" testID="due-date" label={t('onboarding.dueDateLabel')} value={dueDate} onChange={onDueDate} invalidMessage={t('errors.invalidDate')} error={error} />
      ) : (
        <DateField key="lmp" testID="lmp" label={t('onboarding.lmpLabel')} value={lmp} onChange={onLmp} invalidMessage={t('errors.invalidDate')} error={error} />
      )}
      <Banner tone="info" message={note} />
    </View>
  );
}
