import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/content/localization';
import { formatLocalDate, formatMeasurement } from '@/content/localization/format';
import { errorMessage } from '@/data/errors';
import { compareLocalDates, deviceTimeZone, LocalDate, todayIn } from '@/domain/dates/local-date';
import { displayValue, MeasurementUnit, normalizeMeasurement, UNITS_BY_KIND } from '@/domain/measurements/units';
import type { Child, GrowthMeasurement, MeasurementKind } from '@/domain/model';
import { canOnRecord } from '@/domain/permissions/permissions';
import { measurementErrorText } from '@/features/children/child-draft';
import { goBack } from '@/features/shared/navigation';
import { useToday } from '@/features/shared/use-today';
import { useUnsavedGuard } from '@/features/shared/use-unsaved-guard';
import { Banner, Button, Chip, ConfirmationSheet, DateField, Screen, Text, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';
import { useCreateMeasurement, useDeleteMeasurement, useUpdateMeasurement } from './hooks';
import { KIND_LABEL } from './MeasurementSummary';

const decimal = (n: number) => String(n).replace('.', ',');

/**
 * New measurement, or correction of an existing one (R4). Correcting keeps the
 * kind; value, unit and date change in place (no new row), so history and the
 * chart show the corrected value. Only the author may correct; the author or
 * an owner may delete (docs/permissions.md). The server enforces both.
 */
export function MeasurementForm({ child, familyId, actor, existing }: { child: Child; familyId: string; actor: Parameters<typeof canOnRecord>[0]; existing?: GrowthMeasurement }) {
  const today = useToday();
  const create = useCreateMeasurement();
  const update = useUpdateMeasurement();
  const del = useDeleteMeasurement(child.id);
  const [kind, setKind] = useState<MeasurementKind>(existing?.kind ?? 'weight');
  const [unit, setUnit] = useState<MeasurementUnit>((existing?.enteredUnit as MeasurementUnit | undefined) ?? 'kg');
  const [value, setValue] = useState(existing ? decimal(displayValue(existing.canonicalValue, existing.enteredUnit as MeasurementUnit)) : '');
  const [date, setDate] = useState<LocalDate | null>(existing?.measuredOn ?? today);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saving = create.isPending || update.isPending;
  const record = existing ? { ...existing, visibility: 'family' as const } : null;
  const canEdit = !record || canOnRecord(actor, 'edit', record);
  const canDelete = !!record && canOnRecord(actor, 'delete', record);
  const changed = existing ? value !== decimal(displayValue(existing.canonicalValue, existing.enteredUnit as MeasurementUnit)) || unit !== existing.enteredUnit || date !== existing.measuredOn : value.length > 0;
  const guard = useUnsavedGuard(changed && canEdit && !create.isSuccess && !update.isSuccess && !del.isSuccess);

  const result = normalizeMeasurement(kind, value, unit);
  const valueError = show && !result.ok ? measurementErrorText[result.error] : null;
  const dateError = show ? (!date ? t('errors.required') : compareLocalDates(date, today) > 0 ? t('errors.eventInFuture') : compareLocalDates(date, child.birthDate) < 0 ? t('errors.invalidDate') : null) : null;

  async function submit() {
    setShow(true);
    if (!result.ok || !date || dateError) return;
    setError(null);
    try {
      if (existing) await update.mutateAsync({ id: existing.id, correction: { canonicalValue: result.canonicalValue, enteredUnit: unit, measuredOn: date } });
      else await create.mutateAsync({ familyId, childId: child.id, kind, canonicalValue: result.canonicalValue, enteredUnit: unit, measuredOn: date });
      goBack();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function remove() {
    try {
      await del.mutateAsync(existing!.id);
      setConfirmDelete(false);
      goBack();
    } catch (e) {
      setConfirmDelete(false);
      setError(errorMessage(e));
    }
  }

  const footer = canEdit ? <Button label={saving ? t('common.saving') : existing ? t('measurement.saveCorrection') : t('common.save')} onPress={submit} fullWidth loading={saving} testID="save-measurement" /> : undefined;

  return (
    <Screen edges={['left', 'right']} footer={footer}>
      <Stack.Screen options={{ title: existing ? t('measurement.editTitle') : t('measurement.newTitle') }} />
      {existing ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label">{KIND_LABEL[kind]()}</Text>
          {existing.isBirthMeasurement ? <View style={{ alignSelf: 'flex-start' }}><Chip label={t('measurement.birthBadge')} icon="star-outline" /></View> : null}
          {existing.updatedAt && existing.updatedAt !== existing.createdAt ? (
            <Text variant="caption" color="textSecondary">
              {t('measurement.corrected', { date: formatLocalDate(todayIn(deviceTimeZone(), new Date(existing.updatedAt))) })}
            </Text>
          ) : null}
          {!canEdit ? (
            <Text>
              {formatMeasurement(existing.canonicalValue, existing.enteredUnit as MeasurementUnit)} · {formatLocalDate(existing.measuredOn)}
            </Text>
          ) : null}
          {!canEdit ? (
            <Text variant="caption" color="textSecondary">
              {t('measurement.onlyAuthorCorrects')}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label">{t('measurement.kindLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {(['weight', 'length', 'head-circumference'] as const).map((k) => (
              <Chip key={k} label={KIND_LABEL[k]()} selected={kind === k} onPress={() => { setKind(k); setUnit(UNITS_BY_KIND[k][0]!); }} />
            ))}
          </View>
        </View>
      )}
      {canEdit ? (
        <>
          <TextField label={t('measurement.valueLabel')} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={kind === 'weight' ? '8,4' : '72'} error={valueError} testID="measurement-value" />
          <View style={{ gap: spacing.sm }}>
            <Text variant="label">{t('measurement.unitLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {UNITS_BY_KIND[kind].map((u) => (
                <Chip key={u} label={t(`measurement.units.${u}` as never)} selected={unit === u} onPress={() => setUnit(u)} />
              ))}
            </View>
          </View>
          <DateField label={t('measurement.dateLabel')} value={date} onChange={setDate} invalidMessage={t('errors.invalidDate')} error={dateError} shortcuts={[{ label: t('common.today'), value: today }]} testID="measurement-date" />
        </>
      ) : null}
      <Banner tone="info" message={t('measurement.chartNote')} />
      {error ? <Banner tone="danger" message={error} /> : null}
      {canDelete ? <Button label={t('common.delete')} variant="danger" icon="trash-outline" onPress={() => setConfirmDelete(true)} testID="delete-measurement" /> : null}
      <ConfirmationSheet visible={confirmDelete} title={t('measurement.deleteTitle')} message={t('measurement.deleteMessage')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} destructive busy={del.isPending} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
      <ConfirmationSheet visible={guard.visible} title={t('common.discardTitle')} message={t('common.discardMessage')} confirmLabel={t('common.discardConfirm')} cancelLabel={t('common.keepEditing')} destructive onConfirm={guard.confirm} onCancel={guard.cancel} />
    </Screen>
  );
}
