import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, radii, spacing } from '../tokens';
import { Button } from './Button';
import { Text } from './Text';
import { useReducedMotion } from './use-reduced-motion';

export interface ConfirmationSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  busy?: boolean;
}

/** Bottom sheet for confirmations. Cancel is always available and listed first for screen readers. */
export function ConfirmationSheet({ visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, destructive, busy }: ConfirmationSheetProps) {
  const reduced = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} accessibilityRole="button" />
        <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.inner}>
            <View style={styles.grabber} />
            <Text variant="heading">{title}</Text>
            <Text color="textSecondary">{message}</Text>
            <View style={styles.actions}>
              <Button label={confirmLabel} onPress={onConfirm} variant={destructive ? 'danger' : 'primary'} fullWidth loading={busy} testID="confirm-sheet-confirm" />
              <Button label={cancelLabel} onPress={onCancel} variant="ghost" fullWidth disabled={busy} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  inner: { padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
