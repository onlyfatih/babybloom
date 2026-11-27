import { Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { t } from '@/content/localization';
import { appVersion } from '@/infrastructure/configuration/environment';
import { selectForExport } from '@/domain/permissions/export-selection';
import type { ProfileRef } from '@/domain/model';
import { useAppointments } from '@/features/appointments';
import { useMeasurements } from '@/features/measurements';
import { useMemories } from '@/features/memories';
import { Profile, profileName, sameRef, useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { Banner, Button, Chip, Screen, SectionHeader, Text, ToggleRow, Card, Divider } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

export default function ExportScreen() {
  const session = useRequiredSession();
  const { profiles, selected } = useSelectedProfile();
  const [chosenRef, setProfileRef] = useState<ProfileRef | null>(null);
  const profileRef = chosenRef ?? selected?.ref ?? null;
  const [include, setInclude] = useState({ memories: true, measurements: true, appointments: true });
  const [result, setResult] = useState<'done' | 'dismissed' | 'failed' | null>(null);
  const [running, setRunning] = useState(false);
  const profile = profiles.find((p) => sameRef(p.ref, profileRef)) ?? null;
  const memories = useMemories(session.family.id);
  const appointments = useAppointments(session.family.id);
  const measurements = useMeasurements(profile?.kind === 'child' ? profile.child.id : undefined);
  const actor = { userId: session.user.id, membership: session.membership };
  const all = { memories: memories.data ?? [], measurements: measurements.data ?? [], appointments: appointments.data ?? [] };
  const originPregnancyId = profile?.kind === 'child' ? profile.child.originPregnancyId : null;
  const counts = profileRef ? selectForExport(actor, all, { profile: profileRef, originPregnancyId, include: { memories: true, measurements: true, appointments: true } }) : { memories: [], measurements: [], appointments: [] };

  const queries = [memories, appointments, ...(profile?.kind === 'child' ? [measurements] : [])];
  const loading = queries.some((q) => q.isPending);
  const loadFailed = queries.some((q) => q.isError);

  /** Never export while data is loading or partly failed: that would silently write an incomplete file. */
  async function run() {
    if (!profileRef || loading || loadFailed || running) return;
    setRunning(true);
    setResult(null);
    try {
      const data = selectForExport(actor, all, { profile: profileRef, originPregnancyId, include });
      const payload = JSON.stringify({ format: 'minik-atlas-export', version: 1, appVersion, exportedAt: new Date().toISOString(), profile: profileRef, ...data }, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([payload], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'minik-atlas-export.json';
        a.click();
        setResult('done');
      } else {
        const shared = await Share.share({ message: payload, title: 'minik-atlas-export.json' });
        setResult(shared.action === Share.dismissedAction ? 'dismissed' : 'done');
      }
    } catch {
      setResult('failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button label={t('export.action')} icon="download-outline" onPress={run} fullWidth loading={running} disabled={!profileRef || loading || loadFailed} />}>
      <Stack.Screen options={{ title: t('export.title') }} />
      <Text color="textSecondary">{t('export.intro')}</Text>
      <SectionHeader title={t('export.profile')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {profiles.map((p: Profile) => (
          <Chip key={p.kind === 'child' ? p.child.id : p.pregnancy.id} label={profileName(p, t('profile.unnamedPregnancy'))} selected={sameRef(p.ref, profileRef)} onPress={() => setProfileRef(p.ref)} />
        ))}
      </View>
      <SectionHeader title={t('export.include')} />
      <Card padded={false}>
        <ToggleRow title={t('export.memories', { count: counts.memories.length })} value={include.memories} onValueChange={(v) => setInclude((i) => ({ ...i, memories: v }))} />
        <Divider />
        <ToggleRow title={t('export.measurements', { count: counts.measurements.length })} value={include.measurements} onValueChange={(v) => setInclude((i) => ({ ...i, measurements: v }))} disabled={profile?.kind !== 'child'} />
        <Divider />
        <ToggleRow title={t('export.appointments', { count: counts.appointments.length })} value={include.appointments} onValueChange={(v) => setInclude((i) => ({ ...i, appointments: v }))} />
      </Card>
      <Banner tone="info" message={t('export.photosNote')} />
      {loading ? <Banner tone="info" message={t('export.loading')} /> : null}
      {loadFailed ? (
        <View style={{ gap: spacing.sm }}>
          <Banner tone="danger" message={t('export.loadError')} />
          <Button label={t('common.retry')} variant="secondary" icon="refresh" onPress={() => queries.forEach((q) => q.refetch())} />
        </View>
      ) : null}
      {result === 'done' ? <Banner tone="success" message={`${t('export.done')} ${t('export.downloadNote')}`} /> : null}
      {result === 'dismissed' ? <Banner tone="info" message={t('export.dismissed')} /> : null}
      {result === 'failed' ? <Banner tone="danger" message={t('export.failed')} /> : null}
    </Screen>
  );
}
