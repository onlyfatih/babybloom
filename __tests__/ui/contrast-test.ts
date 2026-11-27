import { colors } from '@/ui/tokens';

function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('semantic color contrast (WCAG 2.2 AA)', () => {
  const text: [string, string, string][] = [
    ['text/background', colors.text, colors.background],
    ['text/surface', colors.text, colors.surface],
    ['textSecondary/background', colors.textSecondary, colors.background],
    ['textSecondary/surface', colors.textSecondary, colors.surface],
    ['primary/background', colors.primary, colors.background],
    ['textOnPrimary/primary', colors.textOnPrimary, colors.primary],
    ['text/surfaceAccent', colors.text, colors.surfaceAccent],
    ['text/surfaceWarm', colors.text, colors.surfaceWarm],
    ['text/surfaceCalm', colors.text, colors.surfaceCalm],
    ['primary/surfaceAccent', colors.primary, colors.surfaceAccent],
    ['danger/background', colors.danger, colors.background],
    ['danger/dangerSurface', colors.danger, colors.dangerSurface],
    ['warning/warningSurface', colors.warning, colors.warningSurface],
    ['accentCalm/surfaceCalm', colors.accentCalm, colors.surfaceCalm],
  ];
  it.each(text)('%s >= 4.5:1', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('form-control borders >= 3:1', () => {
    expect(contrast(colors.borderStrong, colors.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.borderStrong, colors.surface)).toBeGreaterThanOrEqual(3);
  });
});
