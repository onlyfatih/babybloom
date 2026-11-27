import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { illustrationForWeek } from '@/content/illustrations';
import { demoControls } from '@/data/providers/demo/demo-backend';
import { resetCacheToSession } from '@/features/profiles';
import { featureFlags } from '@/infrastructure/configuration/feature-flags';
import { Banner, Button, Icon, IconName, Screen, Text } from '@/ui/primitives';
import { colors, elevation, layout, radii, spacing } from '@/ui/tokens';

function Choice({ icon, title, hint, onPress, tone }: { icon: IconName; title: string; hint: string; onPress: () => void; tone: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} accessibilityHint={hint} style={({ pressed }) => [styles.choice, elevation.card, pressed && { opacity: 0.9 }]}>
      <View style={[styles.choiceIcon, { backgroundColor: tone }]}>
        <Icon name={icon} size={26} color="primary" />
      </View>
      <View style={styles.choiceText}>
        <Text variant="subheading">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      </View>
      <Icon name="chevron-forward" size={20} color="textSecondary" />
    </Pressable>
  );
}

export default function Welcome() {
  const qc = useQueryClient();
  const [loadingDemo, setLoadingDemo] = useState(false);
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.hero}>
        <View accessible={false}>{illustrationForWeek(20).render(132)}</View>
        <Text variant="display" align="center">
          {t('common.appName')}
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          {t('onboarding.tagline')}
        </Text>
      </View>
      <Text variant="heading">{t('onboarding.question')}</Text>
      <View style={styles.choices}>
        <Choice icon="leaf-outline" tone={colors.surfaceWarm} title={t('onboarding.expecting')} hint={t('onboarding.expectingHint')} onPress={() => router.push('/onboarding/pregnancy')} />
        <Choice icon="happy-outline" tone={colors.surfaceAccent} title={t('onboarding.born')} hint={t('onboarding.bornHint')} onPress={() => router.push('/onboarding/child')} />
        <Choice icon="people-outline" tone={colors.surfaceCalm} title={t('onboarding.join')} hint={t('onboarding.joinHint')} onPress={() => router.push('/onboarding/join')} />
      </View>
      {featureFlags.prototypeTools ? (
        <>
          <Banner tone="info" message={t('onboarding.prototypeNotice')} />
          <Button
            label={t('onboarding.demo')}
            variant="secondary"
            icon="sparkles-outline"
            fullWidth
            loading={loadingDemo}
            testID="load-demo"
            onPress={async () => {
              setLoadingDemo(true);
              const session = await demoControls.loadDemoFamily();
              resetCacheToSession(qc, session);
              router.replace('/(tabs)');
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  choices: { gap: spacing.md },
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: layout.minTouchTarget + 24, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  choiceIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1, gap: 2 },
});
