import { View } from 'react-native';
import { t } from '@/content/localization';
import { useSimulation } from '@/infrastructure/configuration/simulation';
import { Banner } from '@/ui/primitives';
import { layout, spacing } from '@/ui/tokens';

/** Shown at the top of tab screens while offline. Prototype: driven by the simulation switch. */
export function OfflineBanner() {
  const { offline } = useSimulation();
  if (!offline) return null;
  return (
    <View style={{ paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm }}>
      <Banner tone="warning" icon="cloud-offline-outline" message={t('common.offline')} />
    </View>
  );
}
