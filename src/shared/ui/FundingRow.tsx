import { useRef } from 'react';
import type { GlyphKind, RenderGlyph } from './HealthForest';
import { useRise } from './useRise';

const COUNT = 14;
const WIDTH = 296;
const STEP = WIDTH / (COUNT - 1);
const FIRST_X = 12;
const BASE_Y = 25;
const SCALE = 0.95;
const TRACK_X = 4;
const TRACK_Y = 27;
const TRACK_WIDTH = 312;
const TRACK_HEIGHT = 5;

/** A tree already planted is alive, one only paid for is faded, the rest are outlines. */
function kindAt(index: number, funded: number, planted: number): GlyphKind {
  if (index / COUNT < planted) {
    return 'alive';
  }

  return index / COUNT < funded ? 'funded' : 'planned';
}

type FundingRowProps = {
  /** Share of the target raised, 0 to 1. */
  funded: number;
  /** Share of the trees planted, 0 to 1. */
  planted: number;
  glyph: RenderGlyph;
};

/** K24. A funding bar with a row of tree glyphs on it: planted, funded, still to come. Mockup donor.jsx:143. */
export function FundingRow({ funded, planted, glyph }: FundingRowProps) {
  const root = useRef<SVGSVGElement>(null);

  useRise(root);

  return (
    <svg ref={root} className="pc-art pc-fund-art" viewBox="0 0 320 34" aria-hidden="true">
      <rect
        x={TRACK_X}
        y={TRACK_Y}
        width={TRACK_WIDTH}
        height={TRACK_HEIGHT}
        rx="2.5"
        fill="#e3ebd7"
      />
      <rect
        className="grow"
        x={TRACK_X}
        y={TRACK_Y}
        width={TRACK_WIDTH * funded}
        height={TRACK_HEIGHT}
        rx="2.5"
        fill="#78975c"
      />
      {Array.from({ length: COUNT }, (_item, index) => (
        <g key={index} className="rise">
          {glyph({
            kind: kindAt(index, funded, planted),
            x: FIRST_X + index * STEP,
            y: BASE_Y,
            s: SCALE,
          })}
        </g>
      ))}
    </svg>
  );
}
