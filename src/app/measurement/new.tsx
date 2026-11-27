import { Stack } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { compareLocalDates, LocalDate } from '@/domain/dates/local-date';
import { MeasurementUnit, normalizeMeasurement, UNITS_BY_KIND } from '@/domain/measurements/units';
import type { MeasurementKind } from '@/domain/model';
import { measurementErrorText } from '@/features/children';
import { KIND_LABEL, useCreateMeasurement } from '@/features/measurements';
import { useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { useToday } from '@/features/shared/use-today';
import { useUnsavedGuard } from '@/features/shared/use-unsaved-guard';
import { Banner, Button, Chip, ConfirmationSheet, DateField, EmptyState, Screen, Text, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

export default function NewMeasurement() {
  const session = useRequiredSession();
  const { selected } = useSelectedProfile();
  const today = useToday();
  const create = useCreateMeasurement();
  const [kind, setKind] = useState<MeasurementKind>('weight');
  const [unit, setUnit] = useState<MeasurementUnit>('kg');
  const [value, setValue] = useState('');
  const [date, setDate] = useState<LocalDate | null>(today);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guard = useUnsavedGuard(value.length > 0 && !create.isSuccess);

  if (selected?.kind !== 'child') return <Screen><EmptyState title={t('tracking.measurements')} body={t('measurement.pregnancyEmpty')} /></Screen>;
  const child = selected.child;

  const result = normalizeMeasurement(kind, value, unit);
  const valueError = show && !result.ok ? measurementErrorText[result.error] : null;
  const dateError = show ? (!date ? t('errors.required') : compareLocalDates(date, today) > 0 ? t('errors.eventInFuture') : compareLocalDates(date, child.birthDate) < 0 ? t('errors.invalidDate') : null) : null;

  async function submit() {
    setShow(true);
    if (!result.ok || !date || dateError) return;
    try {
      await create.mutateAsync({ familyId: session.family.id, childId: child.id, kind, canonicalValue: result.canonicalValue, enteredUnit: unit, measuredOn: date });
      goBack();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button label={create.isPending ? t('common.saving') : t('common.save')} onPress={submit} fullWidth loading={create.isPending} testID="save-measurement" />}>
      <Stack.Screen options={{ title: t('measurement.newTitle') }} />
      <View style={{ gap: spacing.sm }}>
        <Text variant="label">{t('measurement.kindLabel')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {(['weight', 'length', 'head-circumference'] as const).map((k) => (
            <Chip key={k} label={KIND_LABEL[k]()} selected={kind === k} onPress={() => { setKind(k); setUnit(UNITS_BY_KIND[k][0]!); }} />
          ))}
        </View>
      </View>
      <TextField label={t('measurement.valueLabel')} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={kind === 'weight' ? '8,4' : '72'} error={valueError} testID="measurement-value" />
      <View style={{ gap: spacing.sm }}>
        <Text variant="label">{t('measurement.unitLabel')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {UNITS_BY_KIND[kind].map((u) => (
            <Chip key={u} label={t(`measurement.units.${u}` as never)} selected={unit === u} onPress={() => setUnit(u)} />
          ))}
        </View>
      </View>
      <DateField label={t('measurement.dateLabel')} value={date} onChange={setDate} invalidMessage={t('errors.invalidDate')} error={dateError} shortcuts={[{ label: t('common.today'), value: today }]} />
      <Banner tone="info" message={t('measurement.chartNote')} />
      {error ? <Banner tone="danger" message={error} /> : null}
      <ConfirmationSheet visible={guard.visible} title={t('common.discardTitle')} message={t('common.discardMessage')} confirmLabel={t('common.discardConfirm')} cancelLabel={t('common.keepEditing')} destructive onConfirm={guard.confirm} onCancel={guard.cancel} />
    </Screen>
  );
}
