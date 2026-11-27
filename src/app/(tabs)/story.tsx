import { errorMessage } from '@/data/errors';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { formatMonthYear } from '@/content/localization/format';
import { activeEstimate, gestationalAge } from '@/domain/pregnancy/gestation';
import type { Memory } from '@/domain/model';
import { useAuthorNames } from '@/features/family';
import { MemoryCard, memoriesForProfile, useMemories } from '@/features/memories';
import { profileName, ProfileSwitcherButton, useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { OfflineBanner } from '@/features/shared/OfflineBanner';
import { Chip, EmptyState, ErrorState, Fab, LoadingState, Screen, Text } from '@/ui/primitives';
import { colors, spacing } from '@/ui/tokens';

type Filter = 'all' | 'photos' | 'mine';

export default function Story() {
  const session = useRequiredSession();
  const { selected, children, pregnancies } = useSelectedProfile();
  const memories = useMemories(session.family.id);
  const names = useAuthorNames(session.family.id);
  const [filter, setFilter] = useState<Filter>('all');

  const all = selected ? memoriesForProfile(memories.data ?? [], selected.ref, children) : [];
  const visible = all.filter((m) => (filter === 'photos' ? m.mediaIds.length > 0 : filter === 'mine' ? m.authorId === session.user.id : true));

  const chapter = (m: Memory): string | null => {
    if (m.subject.kind !== 'pregnancy' || selected?.kind !== 'child') return null;
    const pregnancyId = m.subject.pregnancyId;
    const p = pregnancies.find((x) => x.id === pregnancyId);
    const est = p ? activeEstimate(p) : null;
    if (!est) return t('story.pregnancyChapterNoWeek');
    const age = gestationalAge(est, m.eventDate);
    return age.totalDays >= 0 ? t('story.pregnancyChapter', { week: age.weeks }) : t('story.pregnancyChapterNoWeek');
  };

  const groups: { month: string; items: Memory[] }[] = [];
  for (const m of visible) {
    const month = formatMonthYear(m.eventDate);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(m);
    else groups.push({ month, items: [m] });
  }

  return (
    <View style={styles.flex}>
      <Screen header={<OfflineBanner />} bottomInset={72} onRefresh={() => memories.refetch()} refreshing={memories.isRefetching}>
        <ProfileSwitcherButton name={profileName(selected, t('profile.unnamedPregnancy'))} subtitle={t('story.title')} />
        <View style={styles.filters} accessibilityRole="radiogroup">
          <Chip label={t('story.filterAll')} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label={t('story.filterPhotos')} selected={filter === 'photos'} onPress={() => setFilter('photos')} />
          <Chip label={t('story.filterMine')} selected={filter === 'mine'} onPress={() => setFilter('mine')} />
        </View>
        {memories.isLoading ? (
          <LoadingState />
        ) : memories.error ? (
          <ErrorState message={errorMessage(memories.error)} onRetry={() => memories.refetch()} />
        ) : all.length === 0 ? (
          <EmptyState icon="book-outline" title={t('story.emptyTitle')} body={t('story.emptyBody')} actionLabel={t('add.memory')} onAction={() => router.push('/memory/new')} />
        ) : visible.length === 0 ? (
          <Text color="textSecondary" align="center">
            {t('story.emptyFiltered')}
          </Text>
        ) : (
          groups.map((g) => (
            <View key={g.month} style={styles.group}>
              <View style={styles.monthRow}>
                <View style={styles.dot} />
                <Text variant="overline" color="textSecondary" accessibilityRole="header">
                  {g.month}
                </Text>
              </View>
              {g.items.map((m) => (
                <MemoryCard key={m.id} memory={m} authorName={names[m.authorId] ?? ''} isOwn={m.authorId === session.user.id} chapterLabel={chapter(m)} onPress={() => router.push(`/memory/${m.id}`)} />
              ))}
            </View>
          ))
        )}
      </Screen>
      <Fab label={t('common.add')} accessibilityLabel={t('add.memory')} onPress={() => router.push('/memory/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentWarm },
});
