import { StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { formatAge, formatLocalDate } from '@/content/localization/format';
import { useMediaSource } from '@/features/media';
import { childAge } from '@/domain/dates/age';
import { LocalDate } from '@/domain/dates/local-date';
import type { Child } from '@/domain/model';
import { Avatar, Card, Text } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';

export function ChildHeader({ child, today }: { child: Child; today: LocalDate }) {
  const age = childAge(child.birthDate, today);
  const avatar = useMediaSource(child.avatarMediaId);
  const ageText = age ? formatAge(age) : t('child.notBornYet');
  return (
    <Card tone="surfaceAccent" style={styles.card} accessibilityLabel={`${child.name}, ${ageText}`}>
      <View style={styles.row}>
        <Avatar name={child.name} uri={avatar.source} size={88} tone="surfaceWarm" onError={avatar.onLoadError} />
        <View style={styles.text}>
          <Text variant="title">{ageText}</Text>
          <Text variant="caption" color="textSecondary">
            {t('child.bornOn', { date: formatLocalDate(child.birthDate) })}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  text: { flex: 1, minWidth: 160, gap: 2 },
});
