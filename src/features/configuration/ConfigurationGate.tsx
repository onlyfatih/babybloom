import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { t } from '@/content/localization';
import { configResult } from '@/infrastructure/configuration/app-config';
import { Banner, Text } from '@/ui/primitives';
import { colors, spacing } from '@/ui/tokens';

/**
 * Blocks the app when the build configuration is invalid (R1). It never falls
 * back to the demo backend. Error details are shown only outside production.
 */
export function ConfigurationGate({ children }: { children: ReactNode }) {
  const allowed = configResult.ok;
  useEffect(() => {
    if (!allowed) SplashScreen.hideAsync().catch(() => undefined);
  }, [allowed]);
  if (allowed) return <>{children}</>;
  const details = configResult.ok ? [] : configResult.errors;
  const showDetails = !configResult.ok && process.env.EXPO_PUBLIC_APP_ENV !== 'production';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingTop: 96 }}>
      <Text variant="title">{t('config.title')}</Text>
      <Text color="textSecondary">{t('config.invalid')}</Text>
      {showDetails ? (
        <View style={{ gap: spacing.sm }}>
          {details.map((d) => (
            <Banner key={d} tone="danger" message={d} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
