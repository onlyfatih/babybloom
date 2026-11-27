import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { t } from '@/content/localization';
import { formatLocalDate } from '@/content/localization/format';
import { useBackend } from '@/data/backend';
import { errorMessage } from '@/data/errors';
import { canOnRecord } from '@/domain/permissions/permissions';
import { useAuthorNames } from '@/features/family';
import { useDeleteMemory, useMemory } from '@/features/memories';
import { useRequiredSession } from '@/features/profiles';
import { Banner, Button, ConfirmationSheet, ErrorState, Icon, LoadingState, Screen, Text } from '@/ui/primitives';
import { colors, layout, radii, spacing } from '@/ui/tokens';

export default function MemoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useRequiredSession();
  const backend = useBackend();
  const memory = useMemory(id);
  const names = useAuthorNames(session.family.id);
  const del = useDeleteMemory(session.family.id);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const photoWidth = Math.min(width, layout.contentMaxWidth) - layout.screenPadding * 2;

  if (memory.isLoading) return <Screen edges={['left', 'right']}><LoadingState /></Screen>;
  if (!memory.data) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState message={memory.error ? errorMessage(memory.error) : t('memory.notFound')} onRetry={() => goBack()} />
      </Screen>
    );
  }
  const m = memory.data;
  const actor = { userId: session.user.id, membership: session.membership };
  const canEdit = canOnRecord(actor, 'edit', m);
  const canDelete = canOnRecord(actor, 'delete', m);
  const isOwn = m.authorId === session.user.id;

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        canEdit || canDelete ? (
          <View style={styles.actions}>
            {canEdit ? <Button label={t('common.edit')} icon="create-outline" variant="secondary" onPress={() => router.push(`/memory/edit/${m.id}`)} /> : null}
            {canDelete ? <Button label={t('common.delete')} icon="trash-outline" variant="danger" onPress={() => setConfirm(true)} testID="delete-memory" /> : null}
          </View>
        ) : undefined
      }
    >
      <Stack.Screen options={{ title: formatLocalDate(m.eventDate) }} />
      {m.mediaIds.map((mid, i) => {
        const src = backend.memories.mediaSource(mid);
        return src ? (
          <Image key={mid} source={src} style={[styles.photo, { width: photoWidth, height: photoWidth }]} contentFit="cover" accessible accessibilityLabel={t('memory.photoA11y', { title: m.title ?? formatLocalDate(m.eventDate), n: i + 1 })} />
        ) : null;
      })}
      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" color="textSecondary">
          {formatLocalDate(m.eventDate)}
        </Text>
        {m.title ? <Text variant="title">{m.title}</Text> : null}
        {m.body ? <Text variant={m.title ? 'body' : 'callout'}>{m.body}</Text> : null}
      </View>
      <View style={styles.metaRow}>
        <Icon name="person-circle-outline" size={18} color="textSecondary" />
        <Text variant="caption" color="textSecondary">
          {isOwn ? t('common.authorYou') : t('common.authorAdded', { name: names[m.authorId] ?? '' })}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Icon name={m.visibility === 'private' ? 'lock-closed-outline' : 'people-outline'} size={18} color="textSecondary" />
        <Text variant="caption" color="textSecondary">
          {m.visibility === 'private' ? t('memory.visibilityPrivateHint') : t('memory.visibilityFamilyHint')}
        </Text>
      </View>
      {error ? <Banner tone="danger" message={error} /> : null}
      <ConfirmationSheet
        visible={confirm}
        title={t('memory.deleteTitle')}
        message={m.mediaIds.length ? t('memory.deleteMessage', { count: m.mediaIds.length }) : t('memory.deleteMessageNoPhotos')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        busy={del.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del.mutateAsync(m.id);
            setConfirm(false);
            goBack();
          } catch (e) {
            setConfirm(false);
            setError(errorMessage(e));
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', flexWrap: 'wrap' },
});
