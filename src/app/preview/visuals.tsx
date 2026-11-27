/**
 * Prototype-only preview of M3 work: temporary week artwork with motion, and
 * the growth chart prototype. Reachable from Settings → Prototip araçları
 * when featureFlags.prototypeTools is on. Not a production screen.
 */
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { t } from '@/content/localization';
import { GrowthChartPrototype } from '@/features/growth-chart';
import { useMeasurements } from '@/features/measurements';
import { WeekComparisonCard } from '@/features/pregnancy/WeekComparisonCard';
import { useProfiles, useRequiredSession } from '@/features/profiles';
import { featureFlags } from '@/infrastructure/configuration/feature-flags';
import { Banner, Chip, LoadingState, Screen, SectionHeader, Text } from '@/ui/primitives';
import { layout, spacing } from '@/ui/tokens';

const SAMPLE_WEEKS = [
  { week: 12, days: 3 },
  { week: 20, days: 1 },
  { week: 40, days: 0 },
];

export default function VisualPreview() {
  const session = useRequiredSession();
  const { width } = useWindowDimensions();
  const [motion, setMotion] = useState(true);
  const profiles = useProfiles(session.family.id);
  const child = profiles.data?.children[0];
  const measurements = useMeasurements(child?.id);
  if (!featureFlags.prototypeTools) return <Redirect href="/settings" />;
  const artSize = Math.min(240, Math.max(160, width - layout.screenPadding * 2 - 64));

  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('preview.title') }} />
      <SectionHeader title={t('preview.weeksTitle')} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Chip label={t('preview.motionOn')} selected={motion} onPress={() => setMotion(true)} />
        <Chip label={t('preview.motionOff')} selected={!motion} onPress={() => setMotion(false)} />
      </View>
      <Text variant="caption" color="textSecondary">{t('preview.motionNote')}</Text>
      <Banner tone="warning" message={`${t('art.temporary')}. ${t('art.notToScale')}`} />
      {SAMPLE_WEEKS.map((w) => (
        <WeekComparisonCard key={w.week} week={w.week} days={w.days} artSize={artSize} animate={motion} />
      ))}

      <SectionHeader title={t('growth.title')} />
      <Text variant="caption" color="textSecondary">{t('preview.exampleChild')}</Text>
      {profiles.isPending || (child && measurements.isPending) ? (
        <LoadingState />
      ) : child ? (
        <GrowthChartPrototype birthDate={child.birthDate} measurements={measurements.data ?? []} />
      ) : (
        <Text color="textSecondary">{t('growth.noData')}</Text>
      )}
    </Screen>
  );
}
