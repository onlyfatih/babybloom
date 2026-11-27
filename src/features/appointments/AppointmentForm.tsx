import { Stack } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/content/localization';
import { formatTimeZoneLabel } from '@/content/localization/format';
import { errorMessage } from '@/data/errors';
import { deviceTimeZone, LocalDate } from '@/domain/dates/local-date';
import { parseLocalTime, toInstant } from '@/domain/dates/zoned-date-time';
import type { Appointment, ProfileRef } from '@/domain/model';
import { canOnRecord } from '@/domain/permissions/permissions';
import { featureFlags } from '@/infrastructure/configuration/feature-flags';
import { useRequiredSession } from '@/features/profiles';
import { useToday } from '@/features/shared/use-today';
import { useUnsavedGuard } from '@/features/shared/use-unsaved-guard';
import { Banner, Button, ConfirmationSheet, DateField, Screen, Text, TextField } from '@/ui/primitives';
import { useDeleteAppointment, useSaveAppointment } from './hooks';

export function AppointmentForm({ subject, existing }: { subject: ProfileRef | null; existing?: Appointment }) {
  const session = useRequiredSession();
  const today = useToday();
  const save = useSaveAppointment(session.family.id);
  const del = useDeleteAppointment(session.family.id);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState<LocalDate | null>(existing?.start.date ?? null);
  const [time, setTime] = useState<string>(existing?.start.time ?? '');
  const timeZone = existing?.start.timeZone ?? deviceTimeZone();
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = !save.isSuccess && (title !== (existing?.title ?? '') || date !== (existing?.start.date ?? null) || time !== (existing?.start.time ?? '') || location !== (existing?.location ?? '') || notes !== (existing?.notes ?? ''));
  const guard = useUnsavedGuard(dirty && !save.isPending);
  const actor = { userId: session.user.id, membership: session.membership };
  const canEdit = !existing || canOnRecord(actor, 'edit', existing);
  const canDelete = !!existing && canOnRecord(actor, 'delete', existing);

  const parsedTime = parseLocalTime(time);
  const titleError = show && !title.trim() ? t('errors.required') : null;
  const dateError = show && !date ? t('errors.required') : null;
  const timeError = show && !parsedTime ? t('errors.invalidTime') : null;
  const dst = date && parsedTime ? toInstant({ date, time: parsedTime, timeZone }) : null;
  const dstNote = dst?.resolution === 'gap-shifted' ? t('appointment.dstNote', { time: new Intl.DateTimeFormat('tr-TR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(dst.epochMs)) }) : null;

  async function submit() {
    setShow(true);
    if (!title.trim() || !date || !parsedTime) return;
    try {
      await save.mutateAsync({
        id: existing?.id,
        input: { familyId: session.family.id, subject: existing?.subject ?? subject, title: title.trim(), start: { date, time: parsedTime, timeZone }, location: location.trim() || null, notes: notes.trim() || null, visibility: existing?.visibility ?? 'family' },
      });
      goBack();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        canEdit ? (
          <Button label={save.isPending ? t('common.saving') : t('common.save')} onPress={submit} fullWidth loading={save.isPending} testID="save-appointment" />
        ) : undefined
      }
    >
      <Stack.Screen options={{ title: existing ? t('appointment.editTitle') : t('appointment.newTitle') }} />
      <TextField label={t('appointment.titleLabel')} placeholder={t('appointment.titlePlaceholder')} value={title} onChangeText={setTitle} error={titleError} editable={canEdit} maxLength={80} />
      <DateField label={t('appointment.dateLabel')} value={date} onChange={setDate} invalidMessage={t('errors.invalidDate')} error={dateError} shortcuts={existing ? undefined : [{ label: t('common.today'), value: today }]} />
      <TextField label={t('appointment.timeLabel')} placeholder="SS:DD" value={time} onChangeText={(v) => setTime(v.replace(/[^\d:]/g, '').slice(0, 5))} keyboardType="numbers-and-punctuation" error={timeError} editable={canEdit} />
      <View style={{ gap: 2 }}>
        <Text variant="label">{t('appointment.timeZoneLabel')}</Text>
        <Text color="textSecondary">{timeZone === deviceTimeZone() ? t('appointment.timeZoneDevice', { zone: formatTimeZoneLabel(timeZone) }) : formatTimeZoneLabel(timeZone)}</Text>
      </View>
      {dstNote ? <Banner tone="warning" message={dstNote} /> : null}
      <TextField label={t('appointment.locationLabel')} optional placeholder={t('appointment.locationPlaceholder')} value={location} onChangeText={setLocation} editable={canEdit} />
      <TextField label={t('appointment.notesLabel')} optional placeholder={t('appointment.notesPlaceholder')} value={notes} onChangeText={setNotes} multiline editable={canEdit} />
      {!featureFlags.calendarExport ? <Banner tone="info" icon="calendar-outline" message={t('appointment.calendarUnavailable')} /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {canDelete ? <Button label={t('common.delete')} variant="danger" icon="trash-outline" onPress={() => setConfirmDelete(true)} /> : null}
      <ConfirmationSheet
        visible={confirmDelete}
        title={t('appointment.deleteTitle')}
        message={t('memory.deleteMessageNoPhotos')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        busy={del.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await del.mutateAsync(existing!.id).catch((e) => setError(errorMessage(e)));
          setConfirmDelete(false);
          goBack();
        }}
      />
      <ConfirmationSheet visible={guard.visible} title={t('common.discardTitle')} message={t('common.discardMessage')} confirmLabel={t('common.discardConfirm')} cancelLabel={t('common.keepEditing')} destructive onConfirm={guard.confirm} onCancel={guard.cancel} />
    </Screen>
  );
}
