import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../tokens';
import { Icon, IconName } from './Icon';
import { Text } from './Text';

type Tone = 'info' | 'warning' | 'danger' | 'success';
const toneStyles: Record<Tone, { bg: string; fg: 'text' | 'warning' | 'danger' | 'success'; icon: IconName }> = {
  info: { bg: colors.surfaceCalm, fg: 'text', icon: 'information-circle-outline' },
  warning: { bg: colors.warningSurface, fg: 'warning', icon: 'alert-circle-outline' },
  danger: { bg: colors.dangerSurface, fg: 'danger', icon: 'close-circle-outline' },
  success: { bg: colors.successSurface, fg: 'success', icon: 'checkmark-circle-outline' },
};

export function Banner({ tone = 'info', message, icon }: { tone?: Tone; message: string; icon?: IconName }) {
  const s = toneStyles[tone];
  return (
    <View style={[styles.box, { backgroundColor: s.bg }]} accessibilityRole={tone === 'danger' ? 'alert' : undefined} accessibilityLiveRegion="polite">
      <Icon name={icon ?? s.icon} size={20} color={s.fg} />
      <Text variant="caption" color={s.fg === 'text' ? 'text' : s.fg} style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
});
