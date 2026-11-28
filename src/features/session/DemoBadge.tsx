import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/content/localization';
import { Text } from '@/ui/primitives';
import { colors, radii, spacing } from '@/ui/tokens';

/** Always visible in demo mode, so demo data is never mistaken for a real account (R2.5). */
export function DemoBadge() {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 2 }]} accessibilityRole="text" accessibilityLabel={t('demo.badge')}>
      <View style={styles.pill}>
        <Text variant="caption" color="textSecondary">
          {t('demo.badge')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radii.pill, backgroundColor: colors.surfaceWarm, borderWidth: 1, borderColor: colors.border, opacity: 0.92 },
});
