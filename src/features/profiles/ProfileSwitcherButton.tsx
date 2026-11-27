import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/content/localization';
import { Icon, Text } from '@/ui/primitives';
import { colors, radii, spacing } from '@/ui/tokens';

export function ProfileSwitcherButton({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}. ${t('profile.switchHint')}`} onPress={() => router.push('/profiles')} style={styles.switcher} testID="profile-switcher">
      <View style={{ flexShrink: 1 }}>
        {subtitle ? (
          <Text variant="overline" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.switcherRow}>
          <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
          <View style={styles.chev}>
            <Icon name="chevron-down" size={16} color="primary" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  switcher: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', maxWidth: '100%' },
  switcherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chev: { width: 28, height: 28, borderRadius: radii.pill, backgroundColor: colors.surfaceAccent, alignItems: 'center', justifyContent: 'center' },
});
