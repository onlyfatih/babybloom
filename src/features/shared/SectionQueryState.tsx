import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { Icon, Text } from '@/ui/primitives';
import { colors, spacing, layout } from '@/ui/tokens';

interface QueryLike {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/**
 * Inline loading / error state for one section of a screen. Without it a
 * failed query looked like "no data" (e.g. "Yaklaşan randevu yok").
 */
export function SectionQueryState({ query, children }: { query: QueryLike; children: ReactNode }) {
  if (query.isError) {
    return (
      <View style={styles.row} accessibilityRole="alert">
        <Icon name="alert-circle-outline" size={18} color="danger" />
        <Text color="textSecondary" style={styles.flex}>{`${t('common.sectionError')} ${errorMessage(query.error)}`}</Text>
        <Pressable accessibilityRole="button" onPress={() => query.refetch()} style={styles.retry} hitSlop={8}>
          <Text variant="label" color="primary">{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }
  if (query.isPending) {
    return (
      <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
        <ActivityIndicator color={colors.primary} />
        <Text color="textSecondary">{t('common.loading')}</Text>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: layout.minTouchTarget },
  flex: { flex: 1 },
  retry: { minHeight: layout.minTouchTarget, justifyContent: 'center' },
});
