import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { formatLocalDate } from '@/content/localization/format';
import { useMediaSource } from '@/features/media';
import type { Memory } from '@/domain/model';
import { Card, Icon, Text } from '@/ui/primitives';
import { colors, radii, spacing } from '@/ui/tokens';

export interface MemoryCardProps {
  memory: Memory;
  authorName: string;
  isOwn: boolean;
  /** e.g. "Hamilelik · 20. hafta" for pregnancy memories shown on a child's timeline. */
  chapterLabel?: string | null;
  onPress: () => void;
  compact?: boolean;
}

export function MemoryCard({ memory, authorName, isOwn, chapterLabel, onPress, compact }: MemoryCardProps) {
  const media = useMediaSource(memory.mediaIds[0]);
  const cover = media.source;
  const title = memory.title ?? (memory.body ? memory.body.split('\n')[0]!.slice(0, 60) : '');
  const author = isOwn ? t('common.authorYou') : t('common.authorAdded', { name: authorName });
  const a11y = [title, formatLocalDate(memory.eventDate), author, memory.mediaIds.length ? t('memory.photoCount', { count: memory.mediaIds.length }) : null, memory.visibility === 'private' ? t('memory.privateBadge') : null]
    .filter(Boolean)
    .join(', ');

  return (
    <Card padded={false} onPress={onPress} accessibilityLabel={a11y}>
      {cover ? (
        <View style={[styles.cover, compact && styles.coverCompact]}>
          <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} transition={150} onError={media.onLoadError} />
          {memory.mediaIds.length > 1 ? (
            <View style={styles.countPill}>
              <Icon name="images-outline" size={14} color="textOnPrimary" />
              <Text variant="caption" color="textOnPrimary">
                {memory.mediaIds.length}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text variant="overline" color="textSecondary">
            {formatLocalDate(memory.eventDate)}
          </Text>
          {memory.visibility === 'private' ? (
            <View style={styles.privatePill}>
              <Icon name="lock-closed-outline" size={12} color="accentCalm" />
              <Text variant="caption" color="accentCalm">
                {t('memory.privateBadge')}
              </Text>
            </View>
          ) : null}
        </View>
        {chapterLabel ? (
          <Text variant="caption" color="primary">
            {chapterLabel}
          </Text>
        ) : null}
        {memory.title ? <Text variant="heading">{memory.title}</Text> : null}
        {memory.body ? (
          <Text color={memory.title ? 'textSecondary' : 'text'} variant={memory.title ? 'body' : 'callout'} numberOfLines={compact ? 2 : 4}>
            {memory.body}
          </Text>
        ) : null}
        <Text variant="caption" color="textSecondary">
          {author}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cover: { height: 200, backgroundColor: colors.surfaceMuted },
  coverCompact: { height: 150 },
  body: { padding: spacing.lg, gap: spacing.xs },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  countPill: { position: 'absolute', right: spacing.sm, bottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: colors.overlay },
  privatePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: colors.surfaceCalm },
});
