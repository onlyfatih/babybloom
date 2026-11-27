import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { colors, spacing } from '../tokens';
import { Button } from './Button';
import { Icon, IconName } from './Icon';
import { Text } from './Text';

export function EmptyState({ icon = 'leaf-outline', title, body, actionLabel, onAction }: { icon?: IconName; title: string; body?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.box}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={28} color="primary" />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text color="textSecondary" align="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} icon="add" /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSurface }]}>
        <Icon name="alert-circle-outline" size={28} color="danger" />
      </View>
      <Text align="center">{message ?? t('common.genericError')}</Text>
      {onRetry ? <Button label={t('common.retry')} onPress={onRetry} variant="secondary" icon="refresh" /> : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.box} accessibilityRole="progressbar" accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text color="textSecondary">{label ?? t('common.loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAccent, alignItems: 'center', justifyContent: 'center' },
});
