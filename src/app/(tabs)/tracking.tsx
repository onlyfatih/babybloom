import { errorMessage } from '@/data/errors';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { t } from '@/content/localization';
import { formatLocalDate, formatMeasurement } from '@/content/localization/format';
import { deviceTimeZone } from '@/domain/dates/local-date';
import { splitAppointments } from '@/domain/appointments/schedule';
import { defaultUnit } from '@/domain/measurements/units';
import type { MeasurementKind } from '@/domain/model';
import { AppointmentRow, useAppointments } from '@/features/appointments';
import { KIND_LABEL, MeasurementChart, useMeasurements } from '@/features/measurements';
import { profileName, ProfileSwitcherButton, sameRef, useRequiredSession, useSelectedProfile, Profile } from '@/features/profiles';
import { OfflineBanner } from '@/features/shared/OfflineBanner';
import { useNow } from '@/features/shared/use-now';
import { Banner, Card, Chip, Divider, EmptyState, ErrorState, Fab, Icon, LoadingState, Screen, SectionHeader, SegmentedControl, Text } from '@/ui/primitives';
import { colors, layout, spacing } from '@/ui/tokens';

type Segment = 'measurements' | 'appointments';

export default function Tracking() {
  const params = useLocalSearchParams<{ segment?: Segment }>();
  const [segment, setSegment] = useState<Segment>(params.segment === 'appointments' ? 'appointments' : 'measurements');
  const { selected } = useSelectedProfile();

  return (
    <View style={styles.flex}>
      <Screen header={<OfflineBanner />} bottomInset={72}>
        <ProfileSwitcherButton name={profileName(selected, t('profile.unnamedPregnancy'))} subtitle={t('tracking.title')} />
        <SegmentedControl
          accessibilityLabel={t('tracking.title')}
          value={segment}
          onChange={setSegment}
          segments={[
            { value: 'measurements', label: t('tracking.measurements') },
            { value: 'appointments', label: t('tracking.appointments') },
          ]}
        />
        {segment === 'measurements' ? <Measurements profile={selected} /> : <Appointments profile={selected} />}
      </Screen>
      <Fab
        label={t('common.add')}
        accessibilityLabel={segment === 'measurements' ? t('measurement.newTitle') : t('appointment.newTitle')}
        onPress={() => router.push(segment === 'measurements' && selected?.kind === 'child' ? '/measurement/new' : '/appointment/new')}
      />
    </View>
  );
}

function Measurements({ profile }: { profile: Profile | null }) {
  const childId = profile?.kind === 'child' ? profile.child.id : undefined;
  const q = useMeasurements(childId);
  const [kind, setKind] = useState<MeasurementKind>('weight');
  const { width } = useWindowDimensions();
  if (profile?.kind !== 'child') return <EmptyState icon="resize-outline" title={t('tracking.measurements')} body={t('measurement.pregnancyEmpty')} />;
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const items = (q.data ?? []).filter((m) => m.kind === kind).sort((a, b) => b.measuredOn.localeCompare(a.measuredOn));
  const unit = defaultUnit(kind, 'metric');
  const chartWidth = Math.min(width, layout.contentMaxWidth) - layout.screenPadding * 2 - spacing.lg * 2;

  return (
    <>
      <View style={styles.kinds}>
        {(['weight', 'length', 'head-circumference'] as const).map((k) => (
          <Chip key={k} label={KIND_LABEL[k]()} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      {items.length === 0 ? (
        <EmptyState icon="analytics-outline" title={t('measurement.emptyTitle')} body={t('measurement.emptyBody')} actionLabel={t('measurement.newTitle')} onAction={() => router.push('/measurement/new')} />
      ) : (
        <>
          {items.length >= 2 ? (
            <Card>
              <Text variant="subheading">{t('measurement.chartTitle')}</Text>
              <MeasurementChart items={items} unit={unit} kindLabel={KIND_LABEL[kind]()} width={chartWidth} />
            </Card>
          ) : null}
          <Banner tone="info" message={t('measurement.chartNote')} />
          <SectionHeader title={t('measurement.history')} />
          <Card padded={false}>
            {items.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable onPress={() => router.push(`/measurement/${m.id}`)} style={styles.historyRow} accessibilityRole="button" accessibilityLabel={`${formatLocalDate(m.measuredOn)}, ${formatMeasurement(m.canonicalValue, unit)}${m.isBirthMeasurement ? `, ${t('measurement.birthBadge')}` : ''}`} testID={`measurement-row-${m.id}`}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{formatMeasurement(m.canonicalValue, unit)}</Text>
                    <Text variant="caption" color="textSecondary">
                      {formatLocalDate(m.measuredOn)}
                    </Text>
                  </View>
                  {m.isBirthMeasurement ? <Chip label={t('measurement.birthBadge')} icon="star-outline" /> : null}
                  <Icon name="chevron-forward" size={18} color="textSecondary" />
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

function Appointments({ profile }: { profile: Profile | null }) {
  const session = useRequiredSession();
  const q = useAppointments(session.family.id);
  const now = useNow();
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const relevant = (q.data ?? []).filter((a) => !a.subject || !profile || sameRef(a.subject, profile.ref));
  const { upcoming, past } = splitAppointments(relevant, now);
  const zone = deviceTimeZone();
  if (!relevant.length) return <EmptyState icon="calendar-outline" title={t('appointment.emptyTitle')} body={t('appointment.emptyBody')} actionLabel={t('appointment.newTitle')} onAction={() => router.push('/appointment/new')} />;
  return (
    <>
      <SectionHeader title={t('appointment.upcoming')} />
      {upcoming.length ? upcoming.map((a) => <AppointmentRow key={a.id} appointment={a} deviceTimeZone={zone} onPress={() => router.push(`/appointment/${a.id}`)} />) : <Text color="textSecondary">{t('today.noAppointment')}</Text>}
      {past.length ? (
        <>
          <SectionHeader title={t('appointment.past')} />
          {past.map((a) => (
            <AppointmentRow key={a.id} appointment={a} deviceTimeZone={zone} muted onPress={() => router.push(`/appointment/${a.id}`)} />
          ))}
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: layout.minTouchTarget },
});
