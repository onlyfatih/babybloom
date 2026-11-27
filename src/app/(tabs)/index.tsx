import { errorMessage } from '@/data/errors';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { getLocale, t } from '@/content/localization';
import { weeklyContent } from '@/content/pregnancy';
import { deviceTimeZone } from '@/domain/dates/local-date';
import { splitAppointments } from '@/domain/appointments/schedule';
import { showsPregnancyContent } from '@/domain/pregnancy/lifecycle';
import { AppointmentRow, useAppointments } from '@/features/appointments';
import { ChildHeader } from '@/features/children';
import { useAuthorNames } from '@/features/family';
import { MeasurementSummary, useMeasurements } from '@/features/measurements';
import { MemoryCard, memoriesForProfile, useMemories } from '@/features/memories';
import { PregnancyWeekHero, pregnancyView } from '@/features/pregnancy';
import { ProfileSwitcherButton, profileName, sameRef, useRequiredSession, useSelectedProfile } from '@/features/profiles';
import { SectionQueryState } from '@/features/shared/SectionQueryState';
import { OfflineBanner } from '@/features/shared/OfflineBanner';
import { useToday } from '@/features/shared/use-today';
import { useNow } from '@/features/shared/use-now';
import { Card, ErrorState, Fab, Icon, LoadingState, Screen, SectionHeader, Text } from '@/ui/primitives';
import { colors, spacing } from '@/ui/tokens';

export default function Today() {
  const session = useRequiredSession();
  const today = useToday();
  const now = useNow();
  const { selected, children, isLoading, error, refetch } = useSelectedProfile();
  const memories = useMemories(session.family.id);
  const appointments = useAppointments(session.family.id);
  const measurements = useMeasurements(selected?.kind === 'child' ? selected.child.id : undefined);
  const names = useAuthorNames(session.family.id);

  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (error) return <Screen header={<OfflineBanner />}><ErrorState message={errorMessage(error)} onRetry={refetch} /></Screen>;
  if (!selected) {
    return (
      <Screen>
        <ProfileSwitcherButton name={t('profile.addProfile')} subtitle="" />
      </Screen>
    );
  }

  const name = profileName(selected, t('profile.unnamedPregnancy'));
  const recentMemory = memoriesForProfile(memories.data ?? [], selected.ref, children)[0];
  const nextAppointment = splitAppointments((appointments.data ?? []).filter((a) => !a.subject || sameRef(a.subject, selected.ref)), now).upcoming[0];
  const pView = selected.kind === 'pregnancy' ? pregnancyView(selected.pregnancy, today) : null;
  const week = pView?.age?.contentWeek ?? null;
  const article = selected.kind === 'pregnancy' && week !== null && showsPregnancyContent(selected.pregnancy) ? weeklyContent.getWeek(getLocale(), week) : null;

  return (
    <View style={styles.flex}>
      <Screen header={<OfflineBanner />} bottomInset={72} onRefresh={() => { refetch(); memories.refetch(); appointments.refetch(); if (selected.kind === 'child') measurements.refetch(); }}>
        <ProfileSwitcherButton name={name} subtitle={selected.kind === 'pregnancy' ? t('profile.pregnancyLabel') : t('profile.childLabel')} />

        {selected.kind === 'pregnancy' && pView ? (
          <>
            <PregnancyWeekHero pregnancy={selected.pregnancy} view={pView} onPress={() => week !== null && router.push(`/week/${week}`)} />
            {selected.pregnancy.status !== 'active' || selected.pregnancy.contentHidden ? (
              <Card tone="surfaceCalm">
                <Text>{selected.pregnancy.status === 'ended' ? t('pregnancy.stoppedNote') : t('pregnancy.contentHidden')}</Text>
              </Card>
            ) : week !== null ? (
              <Card onPress={() => router.push(`/week/${week}`)} accessibilityLabel={`${t('today.weeklyPreview')}: ${article?.title ?? t('week.preparing')}`}>
                <Text variant="overline" color="primary">
                  {`${t('today.weeklyPreview')} · ${t('week.title', { week })}`}
                </Text>
                <Text variant="heading">{article?.title ?? t('week.preparing')}</Text>
                <Text color="textSecondary" numberOfLines={3}>
                  {article?.summary ?? t('week.preparingHint', { week })}
                </Text>
                {article?.isDemo ? (
                  <Text variant="caption" color="warning">
                    {t('week.demoNotice')}
                  </Text>
                ) : null}
                <View style={styles.linkRow}>
                  <Text variant="label" color="primary">
                    {t('pregnancy.readWeek')}
                  </Text>
                  <Icon name="arrow-forward" size={16} color="primary" />
                </View>
              </Card>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => router.push('/pregnancy/manage')} style={styles.manageLink}>
              <Icon name="options-outline" size={18} color="primary" />
              <Text variant="label" color="primary">
                {t('pregnancy.manage')}
              </Text>
            </Pressable>
          </>
        ) : null}

        {selected.kind === 'child' ? (
          <>
            <ChildHeader child={selected.child} today={today} />
            <SectionHeader title={t('today.latestMeasurement')} actionLabel={t('common.seeAll')} onAction={() => router.push('/(tabs)/tracking')} />
            <SectionQueryState query={measurements}>
              {measurements.data?.length ? (
                <MeasurementSummary items={measurements.data} onPress={() => router.push('/(tabs)/tracking')} />
              ) : (
                <Text color="textSecondary">{t('today.noMeasurement')}</Text>
              )}
            </SectionQueryState>
          </>
        ) : null}

        <SectionHeader title={t('today.upcomingAppointment')} actionLabel={t('common.seeAll')} onAction={() => router.push({ pathname: '/(tabs)/tracking', params: { segment: 'appointments' } })} />
        <SectionQueryState query={appointments}>
          {nextAppointment ? (
            <AppointmentRow appointment={nextAppointment} deviceTimeZone={deviceTimeZone()} onPress={() => router.push(`/appointment/${nextAppointment.id}`)} />
          ) : (
            <Text color="textSecondary">{t('today.noAppointment')}</Text>
          )}
        </SectionQueryState>

        <SectionHeader title={t('today.recentMemory')} actionLabel={t('common.seeAll')} onAction={() => router.push('/(tabs)/story')} />
        <SectionQueryState query={memories}>
          {recentMemory ? (
            <MemoryCard memory={recentMemory} authorName={names[recentMemory.authorId] ?? ''} isOwn={recentMemory.authorId === session.user.id} onPress={() => router.push(`/memory/${recentMemory.id}`)} compact />
          ) : (
            <Card tone="surfaceMuted" onPress={() => router.push('/memory/new')}>
              <Text color="textSecondary">{t('today.noMemory')}</Text>
            </Card>
          )}
        </SectionQueryState>
      </Screen>
      <Fab label={t('common.add')} accessibilityLabel={t('add.a11y')} onPress={() => router.push('/add')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', minHeight: 44 },
});
