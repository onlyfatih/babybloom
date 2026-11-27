# Design system

Calm, warm, paper-like. Cream backgrounds, deep forest text, soft sage and
apricot accents. No red badges or urgency.

## Tokens (`src/ui/tokens`)

| File | Contains |
| --- | --- |
| `palette.ts` | raw colours (cream, forest, sage, apricot, lavender, clay, honey). Screens never import it |
| `colors.ts` | semantic roles (`background`, `surface`, `textPrimary`, `accent`, `danger`, …). WCAG 2.2 AA contrast asserted in `__tests__/ui/contrast-test.ts` |
| `typography.ts` | Fraunces (display, title, heading, callout) + Inter (body, label, caption, overline); each variant caps `maxFontSizeMultiplier` |
| `index.ts` | spacing (4-pt: 2…48), radii (8/12/18/28/pill), borders, elevation (card, floating), motion (120/220/360 ms), layout (padding 20, max width 640, touch target 48, tab bar 72) |

## Primitives (`src/ui/primitives`)

Text, Icon (Ionicons), Button, IconButton, TextField, DateField, Chip,
SegmentedControl, Card, SectionHeader, States (Loading/Empty/Error), Banner,
Avatar, PhotoGrid, Screen, ConfirmationSheet, ListRow / ToggleRow / Divider,
Fab.

## Rules

- Every interactive element has an accessibility role and Turkish label;
  touch targets ≥ 48.
- Uppercase via `toLocaleUpperCase('tr-TR')` in `Text`, never CSS
  `textTransform` (it maps i → I instead of İ).
- Large text: layouts must survive 320 px width and 1.35× text. Preview on web
  with `EXPO_PUBLIC_PREVIEW_FONT_SCALE=1.35`. The FAB becomes icon-only below
  360 px or above 1.3× font scale.
- Animations check `useReducedMotion()`.
- Destructive actions go through `ConfirmationSheet`, in the body, not next
  to Save.
- Copy is warm and plain. No exclamation marks in errors, no medical claims.
- Screenshots: `docs/screenshots/` (web preview, 320 and 393 px, normal and large text).
