import { useId } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { t } from '@/content/localization';
import { previewFontScale } from '@/infrastructure/configuration/environment';
import { borders, colors, layout, radii, spacing, typography } from '../tokens';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string | null;
  multiline?: boolean;
}

/**
 * Labelled input. The error is announced with the field (accessibilityHint +
 * live region) and visually linked below it; meaning never relies on color alone (icon + text).
 */
export function TextField({ label, optional, hint, error, multiline, ...inputProps }: TextFieldProps) {
  const id = useId();
  const described = [hint, error].filter(Boolean).join('. ');
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow} nativeID={`${id}-label`}>
        <Text variant="label">{label}</Text>
        {optional ? (
          <Text variant="caption" color="textSecondary">
            {t('common.optional')}
          </Text>
        ) : null}
      </View>
      {hint ? (
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={optional ? `${label}, ${t('common.optional')}` : label}
        accessibilityHint={described || undefined}
        aria-invalid={!!error}
        placeholderTextColor={colors.textSecondary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, previewFontScale !== 1 && { fontSize: 16 * previewFontScale, lineHeight: 24 * previewFontScale }, multiline && styles.multiline, error ? styles.inputError : null]}
        {...inputProps}
      />
      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorRow}>
          <Text variant="caption" color="danger">
            ⚠︎ {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 120, paddingTop: spacing.md },
  inputError: { borderColor: colors.danger, borderWidth: borders.thick },
  errorRow: { flexDirection: 'row', gap: spacing.xs },
});
