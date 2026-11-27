import { router, Stack } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { useState } from 'react';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { canOnFamily } from '@/domain/permissions/permissions';
import { useUpdatePregnancy } from '@/features/pregnancy';
import { useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { Banner, Card, ConfirmationSheet, Divider, EmptyState, ListRow, Screen, ToggleRow } from '@/ui/primitives';

export default function ManagePregnancy() {
  const session = useRequiredSession();
  const { selected } = useSelectedProfile();
  const update = useUpdatePregnancy(session.family.id);
  const [confirm, setConfirm] = useState<null | 'stop' | 'archive'>(null);
  const [error, setError] = useState<string | null>(null);
  if (selected?.kind !== 'pregnancy') return <Screen><EmptyState title={t('pregnancy.manageTitle')} /></Screen>;
  const p = selected.pregnancy;
  const canArchive = canOnFamily({ userId: session.user.id, membership: session.membership }, 'archive-profile', session.family.id);
  const patch = (x: Parameters<typeof update.mutateAsync>[0]['patch']) => update.mutateAsync({ id: p.id, patch: x }).catch((e) => setError(errorMessage(e)));

  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('pregnancy.manageTitle') }} />
      {p.status === 'active' ? (
        <Card padded={false}>
          <ListRow icon="happy-outline" title={t('pregnancy.bornAction')} subtitle={t('pregnancy.bornHint')} onPress={() => router.push('/pregnancy/birth')} />
          <Divider />
          <ListRow icon="calendar-outline" title={t('pregnancy.editDating')} subtitle={t('pregnancy.datingEditNote')} onPress={() => router.push('/pregnancy/dating')} />
        </Card>
      ) : null}
      <Card padded={false}>
        <ToggleRow title={t('pregnancy.pauseReminders')} subtitle={t('pregnancy.pauseRemindersHint')} value={p.remindersPaused} onValueChange={(v) => patch({ remindersPaused: v })} />
        <Divider />
        <ToggleRow title={t('pregnancy.hideContent')} subtitle={t('pregnancy.hideContentHint')} value={p.contentHidden} onValueChange={(v) => patch({ contentHidden: v })} />
      </Card>
      <Card padded={false}>
        {canArchive && p.status !== 'archived' ? <ListRow icon="archive-outline" title={t('pregnancy.archive')} subtitle={t('pregnancy.archiveHint')} onPress={() => setConfirm('archive')} /> : null}
        {p.status === 'active' ? (
          <>
            <Divider />
            <ListRow icon="leaf-outline" title={t('pregnancy.stop')} subtitle={t('pregnancy.stopHint')} onPress={() => setConfirm('stop')} />
          </>
        ) : null}
      </Card>
      {error ? <Banner tone="danger" message={error} /> : null}
      <ConfirmationSheet
        visible={confirm !== null}
        title={confirm === 'stop' ? t('pregnancy.stopTitle') : t('pregnancy.archive')}
        message={confirm === 'stop' ? t('pregnancy.stopMessage') : t('pregnancy.archiveHint')}
        confirmLabel={confirm === 'stop' ? t('pregnancy.stopConfirm') : t('pregnancy.archive')}
        cancelLabel={t('common.cancel')}
        busy={update.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await patch(confirm === 'stop' ? { status: 'ended', remindersPaused: true, contentHidden: true } : { status: 'archived', remindersPaused: true });
          setConfirm(null);
          goBack();
        }}
      />
    </Screen>
  );
}
