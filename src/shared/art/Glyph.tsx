import type { ReactNode } from 'react';

// K21. Mockup donor.jsx:107-122. One small vocabulary of glyphs (a faceted tree and its states) reused across the
// funding row, the health forest and the legend, so the numbers read as trees. Palette: design-system §2.4.
export type GlyphKind =
  'alive' | 'completed' | 'flagged' | 'dead' | 'removed' | 'planned' | 'funded';

const GOLD = '#c49a3e';
const TRUNK = '#7a5a40';
const STUMP_DARK = '#5E4030';

type Pair = { top: string; bottom: string };

function GlyphTree({ top, bottom }: Pair) {
  return (
    <>
      <polygon points="0,-20 6,-11 -6,-11" fill={top} />
      <polygon points="0,-14 8,-3 -8,-3" fill={bottom} />
      <rect x="-1" y="-3" width="2" height="3" fill={TRUNK} />
    </>
  );
}

const LEAFY: Pair = { top: '#6aab60', bottom: '#3f844e' };
const CROWNED: Pair = { top: '#3f844e', bottom: '#24623c' };
const FUNDED: Pair = { top: '#9fc28f', bottom: '#86ad78' };

const SHAPES: Record<GlyphKind, ReactNode> = {
  alive: <GlyphTree {...LEAFY} />,
  completed: (
    <>
      <GlyphTree {...CROWNED} />
      <circle cx="6" cy="-18" r="2.6" fill={GOLD} />
    </>
  ),
  flagged: (
    <>
      <GlyphTree {...LEAFY} />
      <path d="M8 0v-16" stroke={STUMP_DARK} strokeWidth=".9" />
      <path d="M8 -16h6l-2 2.4 2 2.4H8Z" fill={GOLD} />
    </>
  ),
  dead: (
    <>
      <path d="M-4 0l1-7 3-2 2 2 2-1 0 8Z" fill="#8B5E3C" />
      <path d="M-4 0l1-7 3-2 1 9Z" fill={STUMP_DARK} />
    </>
  ),
  removed: <ellipse cy="-1" rx="6" ry="2.2" fill="none" stroke="#b8a47e" strokeDasharray="2 1.6" />,
  planned: (
    <g fill="none" stroke="#b9cba6" strokeDasharray="2 1.6">
      <polygon points="0,-20 8,-3 -8,-3" />
    </g>
  ),
  funded: (
    <g opacity=".45">
      <GlyphTree {...FUNDED} />
    </g>
  ),
};

type GlyphProps = {
  kind: GlyphKind;
  /** Where the foot of the glyph stands, in the parent SVG's units. */
  x: number;
  y: number;
  /** Scale; 1 is a tree about 20 units tall. */
  scale?: number;
};

/** K21. Decorative: it is drawn inside an SVG that is `aria-hidden` or carries its own label. */
export function Glyph({ kind, x, y, scale = 1 }: GlyphProps) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>{SHAPES[kind]}</g>;
}

type FacetTreeProps = {
  x: number;
  y: number;
  scale: number;
  /** Goes on the tree itself, inside the placing transform, so a CSS or GSAP loop can move it. */
  className?: string;
};

/** The big four-facet tree the planter and donor scenes plant: foot at (x, y), 34 units tall at scale 1. */
export function FacetTree({ x, y, scale, className }: FacetTreeProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={className}>
        <polygon points="0,-34 9,-18 -9,-18" fill="#6aab60" />
        <polygon points="0,-34 9,-18 0,-18" fill="#3f844e" />
        <polygon points="0,-24 13,-5 -13,-5" fill="#4a8b4e" />
        <polygon points="0,-24 13,-5 0,-5" fill="#24623c" />
        <rect x="-1.6" y="-5" width="3.2" height="7" fill={TRUNK} />
      </g>
    </g>
  );
}
