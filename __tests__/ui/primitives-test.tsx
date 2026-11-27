import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { TextField } from '@/ui/primitives/TextField';
import { parseTurkishDate } from '@/ui/primitives/DateField';

describe('Button', () => {
  it('ignores presses while loading (duplicate-submission guard) and reports busy', async () => {
    const onPress = jest.fn();
    await render(<Button label="Kaydet" onPress={onPress} loading />);
    const btn = screen.getByRole('button', { name: 'Kaydet' });
    await fireEvent.press(btn);
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
    expect(btn.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });
});

describe('TextField', () => {
  it('associates the error with the field for screen readers and marks optional fields', async () => {
    await render(<TextField label="Başlık" optional error="Bu alan gerekli." value="" onChangeText={() => undefined} />);
    const input = screen.getByLabelText('Başlık, İsteğe bağlı');
    expect(input.props.accessibilityHint).toContain('Bu alan gerekli.');
    expect(input.props['aria-invalid']).toBe(true);
    expect(screen.getByText(/Bu alan gerekli/)).toBeTruthy();
  });
});

describe('Chip', () => {
  it('exposes selection state, not just color', async () => {
    await render(<Chip label="Kilo" selected onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Kilo' }).props.accessibilityState).toMatchObject({ selected: true });
  });
});

describe('Turkish date input parsing', () => {
  it('parses DD.MM.YYYY without timezone shifts and rejects impossible dates', () => {
    expect(parseTurkishDate('29.02.2024')).toBe('2024-02-29');
    expect(parseTurkishDate('29.02.2025')).toBeNull();
    expect(parseTurkishDate('01012026')).toBe('2026-01-01');
    expect(parseTurkishDate('1.1.2026')).toBeNull();
  });
});
