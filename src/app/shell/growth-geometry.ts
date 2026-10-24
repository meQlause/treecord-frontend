/* eslint-disable no-magic-numbers -- SVG coordinates of the sidebar art, ported from shell.jsx:88 and drawn for a 185-unit-wide viewBox */

// The sidebar art is drawn for the tall sidebar box: the viewBox follows the box's real height, so the ruler, the
// tree and the soil always fill it. One 36-month ruler; each tick sits where the tree's tip is at that month.
export const VIEW_WIDTH = 185;

export const MILESTONES = [
  { month: 0 },
  { month: 3 },
  { month: 6 },
  { month: 12 },
  { month: 24 },
  { month: 36 },
] as const;

type Point = { x: number; y: number };
type Fill = { left: string; right: string };

type Tier = { left: string; right: string; fill: Fill };

export type Geometry = {
  height: number;
  ground: number;
  top: number;
  span: number;
  trunkX: number;
  rulerX: number;
  satellite: Point;
  badge: Point;
  /** y of the tree's tip at each of MILESTONES. */
  tips: number[];
  tiers: Tier[];
};

const TIER_FILLS: Fill[] = [
  { left: '#4a8b4e', right: '#24623c' },
  { left: '#5ea158', right: '#2f7044' },
  { left: '#6aab60', right: '#367a48' },
  { left: '#7ab86e', right: '#3f844e' },
];
const GROUND_ROOM = 54;
const TOP = 106;
const TRUNK_X = 116;
const RULER_X = 22;
const TALL = 300;

/** How tall the tree is at `month`, as a share of the ruler. */
export const growth = (month: number): number => 0.08 + 0.92 * (month / 36) ** 0.7;

const tierOf = (index: number, count: number, geo: Pick<Geometry, 'ground' | 'span'>): Tier => {
  const { ground, span } = geo;
  const width = Math.min(112, span * 0.46);
  const base = 0.14 + (index * 0.5) / (count - 1);
  const apex = ground - Math.min(1, base + 0.44) * span;
  const baseY = ground - base * span;
  const half = (0.5 - (index * 0.22) / (count - 1)) * width;
  const crotch = baseY - 0.035 * span;
  const fill = TIER_FILLS[index + TIER_FILLS.length - count] ?? TIER_FILLS[0];

  return {
    left: `${TRUNK_X},${apex} ${TRUNK_X - half},${baseY} ${TRUNK_X},${crotch}`,
    right: `${TRUNK_X},${apex} ${TRUNK_X},${crotch} ${TRUNK_X + half},${baseY}`,
    fill: fill as Fill,
  };
};

export function growthGeometry(height: number): Geometry {
  const ground = height - GROUND_ROOM;
  const span = ground - TOP;
  const width = Math.min(112, span * 0.46);
  const count = span > TALL ? 4 : 3;

  return {
    height,
    ground,
    top: TOP,
    span,
    trunkX: TRUNK_X,
    rulerX: RULER_X,
    satellite: { x: 156, y: 30 },
    badge: { x: TRUNK_X + width * 0.24, y: ground - span * 0.7 },
    tips: MILESTONES.map(({ month }) => ground - growth(month) * span),
    tiers: Array.from({ length: count }, (_unused, index) =>
      tierOf(index, count, { ground, span }),
    ),
  };
}

/* eslint-enable no-magic-numbers */
