import { router } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { useSelectedProfile } from '@/features/profiles';
import { Icon, IconName, Screen, Text } from '@/ui/primitives';
import { colors, layout, radii, spacing } from '@/ui/tokens';

function Option({ icon, title, hint, onPress, tone }: { icon: IconName; title: string; hint: string; onPress: () => void; tone: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${hint}`} style={({ pressed }) => [styles.option, pressed && { opacity: 0.85 }]}>
      <View style={[styles.icon, { backgroundColor: tone }]}>
        <Icon name={icon} size={24} color="primary" />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subheading">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

/** Contextual "Ekle": measurement is offered only for a child profile. */
export default function AddSheet() {
  const { selected } = useSelectedProfile();
  const go = (path: '/memory/new' | '/measurement/new' | '/appointment/new') => {
    goBack();
    setTimeout(() => router.push(path), 10);
  };
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Text variant="title">{t('add.title')}</Text>
      <View style={styles.list}>
        <Option icon="images-outline" tone={colors.surfaceWarm} title={t('add.memory')} hint={t('add.memoryHint')} onPress={() => go('/memory/new')} />
        {selected?.kind === 'child' ? <Option icon="resize-outline" tone={colors.surfaceAccent} title={t('add.measurement')} hint={t('add.measurementHint')} onPress={() => go('/measurement/new')} /> : null}
        <Option icon="calendar-outline" tone={colors.surfaceCalm} title={t('add.appointment')} hint={t('add.appointmentHint')} onPress={() => go('/appointment/new')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: layout.minTouchTarget + 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
