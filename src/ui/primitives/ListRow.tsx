import { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { colors, layout, spacing } from '../tokens';
import { Icon, IconName } from './Icon';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  accessibilityHint?: string;
}

export function ListRow({ title, subtitle, icon, leading, trailing, onPress, destructive, showChevron = !!onPress, accessibilityHint }: ListRowProps) {
  const content = (
    <>
      {leading ?? (icon ? <Icon name={icon} color={destructive ? 'danger' : 'primary'} /> : null)}
      <View style={styles.text}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? <Icon name="chevron-forward" size={18} color="textSecondary" /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint={accessibilityHint} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      {content}
    </Pressable>
  );
}

export function ToggleRow({ title, subtitle, value, onValueChange, disabled }: { title: string; subtitle?: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={colors.surface}
        {...({ activeThumbColor: colors.surface } as object)}
      />
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouchTarget + 8, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  text: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },
});
