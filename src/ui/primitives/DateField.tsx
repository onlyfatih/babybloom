import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatLocalDateNumeric } from '@/content/localization/format';
import { LocalDate, parseLocalDate } from '@/domain/dates/local-date';
import { spacing } from '../tokens';
import { TextField } from './TextField';
import { Chip } from './Chip';

/** Turns "27112026" / "27.11.2026" into a LocalDate without any Date parsing. */
export function parseTurkishDate(input: string): LocalDate | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return parseLocalDate(`${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`);
}

function mask(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

export interface DateFieldProps {
  label: string;
  value: LocalDate | null;
  onChange: (value: LocalDate | null) => void;
  optional?: boolean;
  hint?: string;
  error?: string | null;
  invalidMessage: string;
  /** Quick-pick chips, e.g. [{ label: 'Bugün', value: today }]. */
  shortcuts?: { label: string; value: LocalDate }[];
  testID?: string;
}

/**
 * Date-only input as DD.MM.YYYY text. Works identically on iOS, Android and web,
 * supports screen readers and the numeric keyboard. A native picker can be
 * added later behind this same interface.
 */
export function DateField({ label, value, onChange, optional, hint, error, invalidMessage, shortcuts, testID }: DateFieldProps) {
  const [text, setText] = useState(value ? formatLocalDateNumeric(value) : '');
  const [touched, setTouched] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Sync when the value changes from outside (e.g. draft restored), without an effect.
  if (value !== lastValue) {
    setLastValue(value);
    if (value && parseTurkishDate(text) !== value) setText(formatLocalDateNumeric(value));
  }

  const parsed = parseTurkishDate(text);
  const showInvalid = touched && text.length > 0 && !parsed;

  return (
    <View style={styles.wrapper}>
      <TextField
        testID={testID}
        label={label}
        optional={optional}
        hint={hint ?? 'GG.AA.YYYY'}
        value={text}
        placeholder="15.03.2027"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={10}
        error={showInvalid ? invalidMessage : error}
        onBlur={() => setTouched(true)}
        onChangeText={(raw) => {
          const next = mask(raw);
          setText(next);
          onChange(parseTurkishDate(next));
        }}
      />
      {shortcuts?.length ? (
        <View style={styles.shortcuts}>
          {shortcuts.map((s) => (
            <Chip
              key={s.label}
              label={s.label}
              selected={value === s.value}
              onPress={() => {
                setText(formatLocalDateNumeric(s.value));
                onChange(s.value);
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  shortcuts: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
