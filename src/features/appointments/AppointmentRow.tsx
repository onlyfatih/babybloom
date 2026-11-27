import { Pressable, StyleSheet, View } from 'react-native';
import { formatTimeZoneLabel } from '@/content/localization/format';
import { toParts } from '@/domain/dates/local-date';
import type { Appointment } from '@/domain/model';
import { Icon, Text } from '@/ui/primitives';
import { colors, layout, radii, spacing } from '@/ui/tokens';

const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function AppointmentRow({ appointment, profileLabel, onPress, deviceTimeZone, muted }: { appointment: Appointment; profileLabel?: string | null; onPress?: () => void; deviceTimeZone: string; muted?: boolean }) {
  const { day, month } = toParts(appointment.start.date);
  const zoneNote = appointment.start.timeZone !== deviceTimeZone ? ` · ${formatTimeZoneLabel(appointment.start.timeZone)}` : '';
  const a11y = [appointment.title, `${day} ${MONTHS_SHORT[month - 1]} ${appointment.start.time}${zoneNote}`, appointment.location, profileLabel].filter(Boolean).join(', ');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }, muted && { opacity: 0.75 }]}>
      <View style={[styles.date, muted && { backgroundColor: colors.surfaceMuted }]}>
        <Text variant="heading" align="center" style={{ lineHeight: 24 }}>
          {day}
        </Text>
        <Text variant="caption" align="center">
          {MONTHS_SHORT[month - 1]}
        </Text>
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong">{appointment.title}</Text>
        <View style={styles.meta}>
          <Icon name="time-outline" size={14} color="textSecondary" />
          <Text variant="caption" color="textSecondary">
            {appointment.start.time}
            {zoneNote}
          </Text>
        </View>
        {appointment.location ? (
          <View style={styles.meta}>
            <Icon name="location-outline" size={14} color="textSecondary" />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {appointment.location}
            </Text>
          </View>
        ) : null}
        {profileLabel ? (
          <Text variant="caption" color="primary">
            {profileLabel}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron-forward" size={18} color="textSecondary" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouchTarget, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  date: { width: 56, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceWarm },
  text: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
