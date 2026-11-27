import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export interface PhotoGridItem {
  key: string;
  source: string | number;
  accessibilityLabel: string;
  /** 0..1 while uploading; undefined when idle. */
  progress?: number;
  failed?: boolean;
}

export interface PhotoGridProps {
  items: PhotoGridItem[];
  onRemove?: (key: string) => void;
  removeLabel?: (index: number) => string;
  onAdd?: () => void;
  addLabel?: string;
  columns?: number;
}

/** Square grid of photos with optional remove buttons, per-photo progress and failure markers. */
export function PhotoGrid({ items, onRemove, removeLabel, onAdd, addLabel, columns = 3 }: PhotoGridProps) {
  const basis = `${100 / columns - 2}%` as const;
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View key={item.key} style={[styles.cell, { flexBasis: basis }]}>
          <Image source={item.source} style={StyleSheet.absoluteFill} contentFit="cover" accessible accessibilityLabel={item.accessibilityLabel} />
          {item.progress !== undefined && item.progress < 1 ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
            </View>
          ) : null}
          {item.failed ? (
            <View style={styles.failed}>
              <Icon name="alert-circle" size={22} color="danger" />
            </View>
          ) : null}
          {onRemove ? (
            <Pressable accessibilityRole="button" accessibilityLabel={removeLabel?.(index + 1)} onPress={() => onRemove(item.key)} style={styles.remove} hitSlop={8}>
              <Icon name="close" size={16} color="textOnPrimary" />
            </Pressable>
          ) : null}
        </View>
      ))}
      {onAdd ? (
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={addLabel} style={[styles.cell, styles.add, { flexBasis: basis }]}>
          <Icon name="images-outline" size={26} color="primary" />
          <Text variant="caption" color="primary" align="center">
            {addLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { aspectRatio: 1, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted, flexGrow: 0 },
  add: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surface, padding: spacing.xs },
  remove: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { position: 'absolute', left: 8, right: 8, bottom: 8, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  failed: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(247,227,220,0.75)', alignItems: 'center', justifyContent: 'center' },
});
