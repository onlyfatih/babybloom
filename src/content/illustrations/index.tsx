/**
 * Weekly illustration registry. Articles reference illustrations by ID only,
 * so artwork can be replaced without touching text, navigation or screens.
 *
 * Current artwork: original vector motifs drawn in code for this project
 * (no third-party or proprietary pregnancy-app illustrations). To replace with
 * commissioned artwork, change `render` to return an <Image source={require(...)} />
 * and update `license`/`provenance`. See docs/change-guide.md.
 */
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { palette } from '@/ui/tokens/palette';

export interface IllustrationEntry {
  id: string;
  accessibilityLabel: string;
  license: string;
  provenance: string;
  render: (size: number) => React.ReactElement;
}

const ORIGINAL = {
  license: 'Proprietary – original work for Minik Atlas',
  provenance: 'Drawn in code (react-native-svg) by the Minik Atlas team, 2026-11-27',
};

const BACKDROPS = [palette.apricot100, palette.sage100, palette.lavender200] as const;

/** A single, consistent motif: a curled seedling inside a soft circle that grows leaf by leaf. */
function GrowthMotif({ size, stage, backdrop }: { size: number; stage: number; backdrop: string }) {
  const leaves = Math.min(stage, 5);
  const stemTop = 120 - stage * 9;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessible={false}>
      <Circle cx={100} cy={100} r={92} fill={backdrop} />
      <Circle cx={100} cy={100} r={70} fill={palette.cream50} opacity={0.65} />
      <Ellipse cx={100} cy={156} rx={46} ry={9} fill={palette.apricot300} opacity={0.55} />
      <Path d={`M100 156 C 98 140, 104 ${stemTop + 18}, 100 ${stemTop}`} stroke={palette.forest700} strokeWidth={4} strokeLinecap="round" fill="none" />
      <G>
        {Array.from({ length: leaves }).map((_, i) => {
          const y = 150 - i * 12 - 6;
          const left = i % 2 === 0;
          const len = 14 + i * 3;
          const d = left
            ? `M100 ${y} C ${100 - len} ${y - 4}, ${100 - len} ${y - 18}, 100 ${y - 10}`
            : `M100 ${y} C ${100 + len} ${y - 4}, ${100 + len} ${y - 18}, 100 ${y - 10}`;
          return <Path key={i} d={d} fill={i === leaves - 1 ? palette.forest600 : palette.forest700} opacity={0.9} />;
        })}
      </G>
      <Circle cx={100} cy={stemTop - 6} r={6 + stage * 1.4} fill={palette.apricot300} />
      <Circle cx={100} cy={stemTop - 6} r={2.5 + stage * 0.5} fill={palette.cream50} />
    </Svg>
  );
}

function entryFor(week: number, stage: number, backdrop: string): IllustrationEntry {
  return {
    id: `week-stage-${week}`,
    accessibilityLabel: `Hafta ${week} için sembolik çizim: yumuşak bir dairenin içinde ${stage} yapraklı küçük bir fidan.`,
    ...ORIGINAL,
    render: (size) => <GrowthMotif size={size} stage={stage} backdrop={backdrop} />,
  };
}

const registry: Record<string, IllustrationEntry> = Object.fromEntries(
  [
    entryFor(8, 1, BACKDROPS[0]),
    entryFor(12, 2, BACKDROPS[0]),
    entryFor(20, 3, BACKDROPS[1]),
    entryFor(24, 3, BACKDROPS[1]),
    entryFor(32, 4, BACKDROPS[2]),
    entryFor(38, 5, BACKDROPS[2]),
  ].map((e) => [e.id, e]),
);

export const placeholderIllustration: IllustrationEntry = {
  id: 'placeholder',
  accessibilityLabel: 'Henüz çizimi hazırlanmamış haftalar için sade bir daire ve tohum çizimi.',
  ...ORIGINAL,
  render: (size) => <GrowthMotif size={size} stage={0} backdrop={palette.cream200} />,
};

export function illustrationFor(id: string | null | undefined): IllustrationEntry {
  return (id && registry[id]) || placeholderIllustration;
}

/** Stage-based fallback so every week has a consistent image even without an article. */
export function illustrationForWeek(week: number): IllustrationEntry {
  const exact = registry[`week-stage-${week}`];
  if (exact) return exact;
  const stage = week < 10 ? 1 : week < 16 ? 2 : week < 28 ? 3 : week < 36 ? 4 : 5;
  const backdrop = week < 14 ? BACKDROPS[0] : week < 28 ? BACKDROPS[1] : BACKDROPS[2];
  return entryFor(week, stage, backdrop);
}
