import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/content/localization';
import { formatLocalDate } from '@/content/localization/format';
import { errorMessage } from '@/data/errors';
import { todayIn, deviceTimeZone } from '@/domain/dates/local-date';
import { canOnFamily, canRemoveMember } from '@/domain/permissions/permissions';
import { MemberWithUser } from '@/data/repositories/types';
import { useInvitations, useMembers, useRevokeInvitation, useRevokeMember } from '@/features/family';
import { useRequiredSession } from '@/features/profiles';
import { OfflineBanner } from '@/features/shared/OfflineBanner';
import { Avatar, Banner, Button, Card, ConfirmationSheet, Divider, ErrorState, IconButton, ListRow, LoadingState, Screen, SectionHeader, Text } from '@/ui/primitives';

export default function Family() {
  const session = useRequiredSession();
  const members = useMembers(session.family.id);
  const invitations = useInvitations(session.family.id);
  const revokeMember = useRevokeMember(session.family.id);
  const revokeInvite = useRevokeInvitation(session.family.id);
  const [target, setTarget] = useState<MemberWithUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actor = { userId: session.user.id, membership: session.membership };
  const isOwner = canOnFamily(actor, 'invite-member', session.family.id);
  const active = (members.data ?? []).filter((m) => m.status === 'active');
  const pending = (invitations.data ?? []).filter((i) => i.status === 'pending');

  return (
    <Screen header={<OfflineBanner />} onRefresh={() => { members.refetch(); invitations.refetch(); }}>
      <View>
        <Text variant="overline" color="textSecondary">
          {t('family.title')}
        </Text>
        <Text variant="title">{session.family.name}</Text>
      </View>

      <SectionHeader title={t('family.members')} />
      {members.isLoading ? <LoadingState /> : members.error ? <ErrorState message={errorMessage(members.error)} onRetry={() => members.refetch()} /> : (
        <Card padded={false}>
          {active.map((m, i) => {
            const isMe = m.userId === session.user.id;
            const removable = isOwner && !isMe && canRemoveMember(members.data ?? [], m.userId) === 'ok';
            return (
              <View key={m.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  leading={<Avatar name={m.user.displayName} size={44} tone={m.role === 'owner' ? 'surfaceWarm' : 'surfaceCalm'} />}
                  title={`${m.user.displayName}${isMe ? ` ${t('family.you')}` : ''}`}
                  subtitle={`${m.relationshipLabel} · ${m.role === 'owner' ? t('family.owner') : t('family.adult')}`}
                  trailing={removable ? <IconButton icon="person-remove-outline" accessibilityLabel={`${t('family.revokeMember')}: ${m.user.displayName}`} onPress={() => setTarget(m)} color="danger" /> : null}
                />
              </View>
            );
          })}
        </Card>
      )}

      {isOwner ? (
        <>
          {pending.length ? <SectionHeader title={t('family.invitations')} /> : null}
          {pending.length ? (
            <Card padded={false}>
              {pending.map((inv, i) => (
                <View key={inv.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    icon="mail-outline"
                    title={inv.relationshipLabel}
                    subtitle={t('family.inviteExpires', { date: formatLocalDate(todayIn(deviceTimeZone(), new Date(inv.expiresAt))) })}
                    trailing={<IconButton icon="close-circle-outline" accessibilityLabel={`${t('family.revokeInvite')}: ${inv.relationshipLabel}`} onPress={() => revokeInvite.mutate(inv.id)} color="danger" />}
                  />
                </View>
              ))}
            </Card>
          ) : null}
          <Button label={t('family.invite')} icon="person-add-outline" onPress={() => router.push('/family/invite')} fullWidth />
        </>
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}

      <Card tone="surfaceCalm">
        <Text variant="subheading">{t('family.permissionsTitle')}</Text>
        <Text variant="caption">{t('family.permissionsBody')}</Text>
      </Card>

      <Card padded={false}>
        <ListRow icon="download-outline" title={t('family.export')} onPress={() => router.push('/export')} />
        <Divider />
        <ListRow icon="settings-outline" title={t('family.settings')} onPress={() => router.push('/settings')} />
      </Card>

      <ConfirmationSheet
        visible={!!target}
        title={t('family.revokeMemberTitle', { name: target?.user.displayName ?? '' })}
        message={t('family.revokeMemberMessage')}
        confirmLabel={t('family.revokeMember')}
        cancelLabel={t('common.cancel')}
        destructive
        busy={revokeMember.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={async () => {
          try {
            await revokeMember.mutateAsync(target!.id);
          } catch (e) {
            setError(errorMessage(e));
          }
          setTarget(null);
        }}
      />
    </Screen>
  );
}
