import { useRef, type ReactNode } from 'react';
import { useRise } from './useRise';

export type GlyphKind =
  'alive' | 'flagged' | 'dead' | 'removed' | 'completed' | 'planned' | 'funded';

/** Draws one tree glyph (K21) at a point of the parent SVG. The art component is passed in, not imported. */
export type RenderGlyph = (glyph: {
  kind: GlyphKind;
  x: number;
  y: number;
  s?: number;
}) => ReactNode;

/** Tree health, in the order `counts` comes in. Mockup donor.jsx:137. */
export const HEALTH: readonly (readonly [GlyphKind, string])[] = [
  ['alive', 'Alive'],
  ['flagged', 'Flagged'],
  ['dead', 'Dead'],
  ['removed', 'Removed'],
  ['completed', 'Completed'],
];

const SLOTS = 40;
const PER_ROW = 20;
const FIRST_X = 14;
const STEP_X = 20.6;
const ROW_TOP = 28;
const ROW_BOTTOM = 59;
const RULES = 'M4 29h412M4 60h412';

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** counts -> `slots` glyphs by largest remainder; any non-zero status keeps at least one glyph. */
function apportion(counts: readonly number[], slots: number): number[] {
  const total = sum(counts) || 1;
  const raw = counts.map((count) => (count / total) * slots);
  const out = raw.map((value, index) => Math.max(counts[index] ? 1 : 0, Math.floor(value)));
  const byRemainder = raw
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((first, second) => second.rest - first.rest);
  let left = slots - sum(out);

  for (const { index } of byRemainder) {
    if (left > 0) {
      out[index] = (out[index] ?? 0) + 1;
      left -= 1;
    }
  }

  while (left < 0) {
    const biggest = out.indexOf(Math.max(...out));

    out[biggest] = (out[biggest] ?? 0) - 1;
    left += 1;
  }

  return out;
}

type HealthForestProps = {
  /** Trees per status, in `HEALTH` order: alive, flagged, dead, removed, completed. */
  counts: readonly number[];
  glyph: RenderGlyph;
};

/** K25. Forty tree glyphs in two rows, shared out by status. Mockup donor.jsx:151. */
export function HealthForest({ counts, glyph }: HealthForestProps) {
  const root = useRef<SVGSVGElement>(null);
  const per = apportion(counts, SLOTS);
  const kinds = HEALTH.flatMap(([kind], index) =>
    Array.from({ length: per[index] ?? 0 }, () => kind),
  );
  const label = HEALTH.map(([, name], index) => `${counts[index] ?? 0} ${name.toLowerCase()}`).join(
    ', ',
  );

  useRise(root);

  return (
    <svg ref={root} className="pc-art pc-forest" viewBox="0 0 420 62" role="img" aria-label={label}>
      <path d={RULES} stroke="#dfe7d3" strokeWidth="1.2" />
      {kinds.map((kind, index) => (
        <g key={index} className="rise">
          {glyph({
            kind,
            x: FIRST_X + (index % PER_ROW) * STEP_X,
            y: index < PER_ROW ? ROW_TOP : ROW_BOTTOM,
          })}
        </g>
      ))}
    </svg>
  );
}
