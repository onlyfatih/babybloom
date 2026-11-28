import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { getLocale, t } from '@/content/localization';
import { weeklyContent } from '@/content/pregnancy';
import { demoControls } from '@/data/providers/demo/demo-backend';
import { appVersion } from '@/infrastructure/configuration/environment';
import { simulationStore, useSimulation } from '@/infrastructure/configuration/simulation';
import { profileName, useSelectedProfile } from '@/features/profiles';
import { useSessionApi } from '@/features/session';
import { Banner, Card, ConfirmationSheet, Divider, ListRow, Screen, SectionHeader, Text, ToggleRow } from '@/ui/primitives';

export default function Settings() {
  const session = useSessionApi();
  const demo = session.mode === 'demo';
  const email = session.state.kind === 'ready' ? session.state.identity.email : null;
  const sim = useSimulation();
  const { selected } = useSelectedProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Sign-out ends this device's session only; no record is deleted.
  const signOut = async () => {
    setSigningOut(true);
    try {
      await session.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  // Demo only: wipes the sample data stored on this device (it is not account deletion).
  const resetDemoDevice = async () => {
    setConfirmDelete(false);
    await demoControls.reset();
    await session.refresh();
  };

  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <SectionHeader title={t('settings.selectedProfile')} />
      <Card padded={false}>
        <ListRow icon="swap-horizontal-outline" title={profileName(selected, t('profile.unnamedPregnancy'))} subtitle={t('profile.switchHint')} onPress={() => router.push('/profiles')} />
      </Card>

      <SectionHeader title={t('settings.account')} />
      <Card padded={false}>
        <ListRow icon="log-out-outline" title={t('settings.signOutReal')} subtitle={email ? t('settings.signedInAs', { email }) : t('settings.signOutHint')} onPress={signingOut ? () => undefined : signOut} />
      </Card>
      <Text variant="caption" color="textSecondary">
        {t('settings.signOutHint')}
      </Text>

      <SectionHeader title={t('settings.notifications')} />
      <Text variant="caption" color="textSecondary">
        {t('settings.notificationsUnavailable')}
      </Text>

      <SectionHeader title={t('settings.privacy')} />
      <Card padded={false}>
        <ListRow icon="download-outline" title={t('settings.exportData')} onPress={() => router.push('/export')} />
        {demo ? (
          <>
            <Divider />
            <ListRow icon="trash-outline" title={t('settings.deleteAccount')} destructive onPress={() => setConfirmDelete(true)} />
          </>
        ) : null}
      </Card>
      {demo ? null : (
        <Text variant="caption" color="textSecondary">
          {t('settings.deletionLater')}
        </Text>
      )}
      <Banner tone="info" icon="shield-checkmark-outline" message={t('settings.privacyNote')} />

      <SectionHeader title={t('settings.about')} />
      <Card>
        <Text>{t('settings.version', { version: appVersion })}</Text>
        <Text variant="caption" color="textSecondary">
          {t('settings.contentRelease', { version: weeklyContent.version, weeks: weeklyContent.coverage(getLocale()).length })}
        </Text>
      </Card>

      {demo ? (
        <View>
          <SectionHeader title={t('settings.developer')} />
          <Card padded={false}>
            <ToggleRow title={t('settings.simulateOffline')} value={sim.offline} onValueChange={(offline) => simulationStore.set({ offline })} />
            <Divider />
            <ToggleRow title={t('settings.simulateSlowNetwork')} value={sim.slowNetwork} onValueChange={(slowNetwork) => simulationStore.set({ slowNetwork })} />
            <Divider />
            <ToggleRow title={t('settings.simulateUploadFailure')} value={sim.uploadFailure} onValueChange={(uploadFailure) => simulationStore.set({ uploadFailure })} />
            <Divider />
            <ListRow icon="images-outline" title={t('settings.visualPreview')} subtitle={t('settings.visualPreviewHint')} onPress={() => router.push('/preview/visuals')} />
            <Divider />
            <ListRow icon="refresh-outline" title={t('settings.resetDemo')} onPress={async () => { await demoControls.loadDemoFamily(); await session.refresh(); router.dismissAll(); router.replace('/'); }} />
          </Card>
        </View>
      ) : null}

      <ConfirmationSheet visible={confirmDelete} title={t('settings.deleteAccount')} message={t('settings.deleteAccountMessage')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} destructive onCancel={() => setConfirmDelete(false)} onConfirm={resetDemoDevice} />
    </Screen>
  );
}
