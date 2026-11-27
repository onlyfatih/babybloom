import { Stack } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { t } from '@/content/localization';
import { formatLocalDate } from '@/content/localization/format';
import { errorMessage } from '@/data/errors';
import { deviceTimeZone, todayIn } from '@/domain/dates/local-date';
import type { FamilyInvitation } from '@/domain/model';
import { useCreateInvitation } from '@/features/family';
import { useRequiredSession } from '@/features/profiles';
import { Banner, Button, Card, Chip, Screen, Text, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

export default function Invite() {
  const session = useRequiredSession();
  const create = useCreateInvitation(session.family.id);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);

  async function submit() {
    if (!label.trim()) return setError(t('errors.required'));
    setError(null);
    try {
      setInvitation(await create.mutateAsync({ role: 'adult', relationshipLabel: label.trim() }));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (invitation) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ title: t('family.inviteTitle') }} />
        <Card tone="surfaceAccent" style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <Text variant="overline" color="textSecondary">
            {t('family.inviteReady')}
          </Text>
          <Text variant="display" selectable accessibilityLabel={invitation.code.split('').join(' ')}>
            {invitation.code}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('family.inviteExpires', { date: formatLocalDate(todayIn(deviceTimeZone(), new Date(invitation.expiresAt))) })}
          </Text>
        </Card>
        <Button label={t('family.share')} icon="share-outline" fullWidth onPress={() => Share.share({ message: t('family.inviteShareMessage', { code: invitation.code }) }).catch(() => undefined)} />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button label={t('family.createInvite')} onPress={submit} fullWidth loading={create.isPending} />}>
      <Stack.Screen options={{ title: t('family.inviteTitle') }} />
      <TextField label={t('family.relationshipLabel')} placeholder={t('family.relationshipPlaceholder')} value={label} onChangeText={setLabel} error={error} maxLength={40} />
      <View style={{ gap: spacing.sm }}>
        <Text variant="label">{t('family.roleLabel')}</Text>
        <View style={{ flexDirection: 'row' }}>
          <Chip label={t('family.adult')} selected />
        </View>
        <Text variant="caption" color="textSecondary">
          {t('family.roleAdultHint')}
        </Text>
      </View>
      <Banner tone="info" message={t('family.permissionsBody')} />
    </Screen>
  );
}
