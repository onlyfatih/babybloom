import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, spacing } from '../tokens';

export interface ScreenProps {
  children: ReactNode;
  /** Pinned below the scroll area (e.g. a Save button). Stays above the keyboard. */
  footer?: ReactNode;
  /** Pinned above the scroll area (e.g. offline banner). */
  header?: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Extra bottom space for a floating action button. */
  bottomInset?: number;
  testID?: string;
}

/**
 * Screen scaffold: safe areas, keyboard avoidance, readable max width on large
 * screens, consistent padding. Every route uses it.
 */
export function Screen({ children, footer, header, scroll = true, edges = ['top', 'left', 'right'], onRefresh, refreshing, bottomInset = 0, testID }: ScreenProps) {
  const body = (
    <View style={styles.column}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={edges} testID={testID}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + bottomInset }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content]}>{body}</View>
        )}
        {footer ? (
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <View style={styles.column}>{footer}</View>
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg },
  column: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', gap: spacing.lg },
  footer: { backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.md },
});
