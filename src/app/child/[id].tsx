import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { compareLocalDates, LocalDate } from '@/domain/dates/local-date';
import { parseLocalTime } from '@/domain/dates/zoned-date-time';
import type { Child } from '@/domain/model';
import { canOnFamily } from '@/domain/permissions/permissions';
import { useSetChildArchived, useSetChildPhoto, useUpdateChild } from '@/features/children/hooks';
import { useMediaSource } from '@/features/media';
import { pickAvatar } from '@/features/memories/photo-picker';
import { useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { useToday } from '@/features/shared/use-today';
import { Avatar, Banner, Button, Card, ConfirmationSheet, DateField, EmptyState, ListRow, Screen, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

/** R4: edit a child's details, replace or remove the profile photo, archive (owner only). */
export default function EditChild() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children } = useSelectedProfile();
  const child = children.find((c) => c.id === id);
  if (!child) return <Screen><EmptyState title={t('child.editTitle')} /></Screen>;
  return <ChildEditor key={child.id} child={child} />;
}

function ChildEditor({ child }: { child: Child }) {
  const session = useRequiredSession();
  const today = useToday();
  const update = useUpdateChild();
  const archive = useSetChildArchived();
  const photo = useSetChildPhoto();
  const avatar = useMediaSource(child.avatarMediaId);
  const [name, setName] = useState(child.name);
  const [birthDate, setBirthDate] = useState<LocalDate | null>(child.birthDate);
  const [birthTime, setBirthTime] = useState<string>(child.birthTime ?? '');
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string; birthTime?: string }>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const actor = { userId: session.user.id, membership: session.membership };
  const canArchive = canOnFamily(actor, 'archive-profile', session.family.id);
  const archived = !!child.archivedAt;

  async function save() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('errors.required');
    if (!birthDate) next.birthDate = t('errors.required');
    else if (compareLocalDates(birthDate, today) > 0) next.birthDate = t('errors.birthInFuture');
    const time = birthTime.trim() ? parseLocalTime(birthTime.trim()) : null;
    if (birthTime.trim() && !time) next.birthTime = t('errors.invalidTime');
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await update.mutateAsync({ id: child.id, patch: { name: name.trim(), birthDate: birthDate!, birthTime: time } });
      setNotice({ tone: 'success', message: t('child.saved') });
    } catch (e) {
      setNotice({ tone: 'danger', message: errorMessage(e) });
    }
  }

  async function changePhoto(remove: boolean) {
    setNotice(null);
    let next = null;
    if (!remove) {
      const r = await pickAvatar();
      if (r.kind !== 'ok') return;
      next = r.photo;
    }
    try {
      await photo.mutateAsync({ id: child.id, photo: next });
      setNotice({ tone: 'success', message: t('child.photoSaved') });
    } catch (e) {
      setNotice({ tone: 'danger', message: errorMessage(e) });
    }
  }

  async function setArchived(value: boolean) {
    try {
      await archive.mutateAsync({ id: child.id, archived: value });
      setConfirmArchive(false);
    } catch (e) {
      setConfirmArchive(false);
      setNotice({ tone: 'danger', message: errorMessage(e) });
    }
  }

  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('child.editTitle') }} />
      {archived ? <Banner tone="info" message={t('child.archivedNotice')} /> : null}
      <Card>
        <View style={styles.photoRow}>
          <Avatar name={child.name} uri={avatar.source} size={72} onError={avatar.onLoadError} />
          <View style={styles.photoButtons}>
            <Button label={child.avatarMediaId ? t('onboarding.changePhoto') : t('onboarding.addPhoto')} variant="secondary" icon="camera-outline" onPress={() => changePhoto(false)} loading={photo.isPending} testID="child-photo" />
            {child.avatarMediaId ? <Button label={t('child.removePhoto')} variant="ghost" icon="trash-outline" onPress={() => changePhoto(true)} disabled={photo.isPending} testID="child-photo-remove" /> : null}
          </View>
        </View>
      </Card>
      <View style={styles.form}>
        <TextField label={t('onboarding.childNameLabel')} value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" maxLength={60} testID="child-name" />
        <DateField label={t('onboarding.birthDateLabel')} value={birthDate} onChange={setBirthDate} invalidMessage={t('errors.invalidDate')} error={errors.birthDate} testID="birth-date" />
        <TextField label={t('onboarding.birthTimeLabel')} optional placeholder="SS:DD" value={birthTime} onChangeText={(v) => setBirthTime(v.replace(/[^\d:]/g, '').slice(0, 5))} error={errors.birthTime} keyboardType="numbers-and-punctuation" maxLength={5} testID="birth-time" />
        <Button label={t('child.save')} onPress={save} loading={update.isPending} testID="save-child" />
      </View>
      {notice ? <Banner tone={notice.tone} message={notice.message} /> : null}
      <Card padded={false}>
        {canArchive ? (
          archived ? (
            <ListRow icon="arrow-undo-outline" title={t('child.unarchive')} onPress={() => setArchived(false)} testID="unarchive-child" />
          ) : (
            <ListRow icon="archive-outline" title={t('child.archive')} subtitle={t('child.archiveHint')} onPress={() => setConfirmArchive(true)} testID="archive-child" />
          )
        ) : (
          <ListRow icon="archive-outline" title={t('child.archive')} subtitle={t('child.onlyOwnerArchives')} showChevron={false} />
        )}
      </Card>
      <ConfirmationSheet
        visible={confirmArchive}
        title={t('child.archive')}
        message={t('child.archiveHint')}
        confirmLabel={t('child.archiveConfirm')}
        cancelLabel={t('common.cancel')}
        busy={archive.isPending}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => setArchived(true)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  photoButtons: { gap: spacing.sm, flex: 1, minWidth: 160 },
  form: { gap: spacing.lg },
});
