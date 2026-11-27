import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { getLocale, t } from '@/content/localization';
import { weeklyContent } from '@/content/pregnancy';
import { useBackend } from '@/data/backend';
import { demoControls } from '@/data/providers/demo/demo-backend';
import { queryKeys } from '@/data/query-keys';
import { appVersion } from '@/infrastructure/configuration/environment';
import { featureFlags } from '@/infrastructure/configuration/feature-flags';
import { simulationStore, useSimulation } from '@/infrastructure/configuration/simulation';
import { profileName, resetCacheToSession, usePreferences, useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { Banner, Card, ConfirmationSheet, Divider, ListRow, Screen, SectionHeader, Text, ToggleRow } from '@/ui/primitives';

export default function Settings() {
  const session = useRequiredSession();
  const backend = useBackend();
  const qc = useQueryClient();
  const prefs = usePreferences(session.user.id);
  const sim = useSimulation();
  const { selected } = useSelectedProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateNotif = async (patch: Partial<NonNullable<typeof prefs.data>['notifications']>) => {
    if (!prefs.data) return;
    const next = await backend.preferences.update(session.user.id, { notifications: { ...prefs.data.notifications, ...patch } });
    qc.setQueryData(queryKeys.preferences(session.user.id), { ...next });
  };

  const leave = async () => {
    await demoControls.reset();
    resetCacheToSession(qc, null);
    router.dismissAll();
    router.replace('/onboarding');
  };

  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <SectionHeader title={t('settings.selectedProfile')} />
      <Card padded={false}>
        <ListRow icon="swap-horizontal-outline" title={profileName(selected, t('profile.unnamedPregnancy'))} subtitle={t('profile.switchHint')} onPress={() => router.push('/profiles')} />
      </Card>

      <SectionHeader title={t('settings.notifications')} />
      <Card padded={false}>
        <ToggleRow title={t('settings.appointmentReminders')} value={!!prefs.data?.notifications.appointmentReminders} onValueChange={(v) => updateNotif({ appointmentReminders: v })} />
        <Divider />
        <ToggleRow title={t('settings.weeklyUpdate')} value={!!prefs.data?.notifications.weeklyPregnancyUpdate} onValueChange={(v) => updateNotif({ weeklyPregnancyUpdate: v })} />
      </Card>
      <Text variant="caption" color="textSecondary">
        {t('settings.notificationsNote')}
      </Text>

      <SectionHeader title={t('settings.privacy')} />
      <Card padded={false}>
        <ListRow icon="download-outline" title={t('settings.exportData')} onPress={() => router.push('/export')} />
        <Divider />
        <ListRow icon="trash-outline" title={t('settings.deleteAccount')} destructive onPress={() => setConfirmDelete(true)} />
      </Card>
      <Banner tone="info" icon="shield-checkmark-outline" message={t('settings.privacyNote')} />

      <SectionHeader title={t('settings.about')} />
      <Card>
        <Text>{t('settings.version', { version: appVersion })}</Text>
        <Text variant="caption" color="textSecondary">
          {t('settings.contentRelease', { version: weeklyContent.version, weeks: weeklyContent.coverage(getLocale()).length })}
        </Text>
      </Card>

      {featureFlags.prototypeTools ? (
        <View>
          <SectionHeader title={t('settings.developer')} />
          <Card padded={false}>
            <ToggleRow title={t('settings.simulateOffline')} value={sim.offline} onValueChange={(offline) => simulationStore.set({ offline })} />
            <Divider />
            <ToggleRow title={t('settings.simulateSlowNetwork')} value={sim.slowNetwork} onValueChange={(slowNetwork) => simulationStore.set({ slowNetwork })} />
            <Divider />
            <ToggleRow title={t('settings.simulateUploadFailure')} value={sim.uploadFailure} onValueChange={(uploadFailure) => simulationStore.set({ uploadFailure })} />
            <Divider />
            <ListRow icon="refresh-outline" title={t('settings.resetDemo')} onPress={async () => { const s = await demoControls.loadDemoFamily(); resetCacheToSession(qc, s); router.dismissAll(); router.replace('/(tabs)'); }} />
            <Divider />
            <ListRow icon="log-out-outline" title={t('settings.signOut')} onPress={leave} />
          </Card>
        </View>
      ) : null}

      <ConfirmationSheet visible={confirmDelete} title={t('settings.deleteAccount')} message={t('settings.deleteAccountMessage')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} destructive onCancel={() => setConfirmDelete(false)} onConfirm={leave} />
    </Screen>
  );
}
