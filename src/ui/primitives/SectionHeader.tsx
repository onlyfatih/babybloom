import { Pressable, StyleSheet, View } from 'react-native';
import { layout, spacing } from '../tokens';
import { Text } from './Text';

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.row}>
      <Text variant="heading" style={styles.title}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8} style={styles.action}>
          <Text variant="label" color="primary">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm },
  title: { flexShrink: 1 },
  action: { minHeight: layout.minTouchTarget, justifyContent: 'center' },
});
