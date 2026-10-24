import { useEffect, useRef, type CSSProperties } from 'react';
import { watchOffscreen } from '../motion/offscreen';

// K3. Mockup art.jsx:77-141. Decorative scene behind a card or a hero; the CSS loops (sun, wind, tree sway, drifting
// leaves, the hero's gust) pause with the motion gate and while off screen (design-system §2.10). Palette: §2.4.
export type LandscapeKind = 'coast' | 'grove' | 'forest' | 'orchard' | 'avocado' | 'lagoon';

const BACKGROUND: Record<LandscapeKind, string> = {
  coast: '#dce7d8',
  grove: '#e6ead5',
  forest: '#dce4d3',
  orchard: '#ede8d7',
  avocado: '#dee7d4',
  lagoon: '#d7e6df',
};
const WATER_KINDS: LandscapeKind[] = ['coast', 'lagoon'];
const FRUIT_KINDS = ['orchard', 'avocado'] as const;

type Fruit = (typeof FRUIT_KINDS)[number];

const FRUIT_FILL: Record<Fruit, string> = { orchard: '#d4b86f', avocado: '#244a30' };
const LIGHT = ['#80a875', '#aec493', '#547c58', '#c7d6a3'];
const DARK = ['#3d694a', '#6e9567', '#294f3b', '#83a77b'];
const TRUNK = '#7f8060';
const LEAF_GREEN = '#557f54';
const SWAY_STEP = -1.3;
const SWAY_SPREAD = 90;
const CANOPY_LAG = 0.35;

type TreeProps = {
  x: number;
  y: number;
  scale: number;
  variant: number;
  fruit: Fruit | null;
  mangrove: boolean;
};

/** One tree. The whole tree bends from its base; the canopy follows a beat later (secondary motion). */
function Tree({ x, y, scale, variant, fruit, mangrove }: TreeProps) {
  const light = LIGHT[variant % LIGHT.length];
  const dark = DARK[variant % DARK.length];
  const delay = variant * SWAY_STEP - x / SWAY_SPREAD;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse
        className="tree-shadow"
        cy="3"
        rx="28"
        ry="7"
        fill="#153e2c"
        opacity=".12"
        style={{ '--delay': `${delay}s` } as CSSProperties}
      />
      <g className="tree-sway" style={{ '--delay': `${delay}s` } as CSSProperties}>
        <path d="M-3 0 0-70 5-70 3 0Z" fill={TRUNK} />
        <path d="M1-23-20-44M2-38 24-59" stroke={TRUNK} strokeWidth="3" fill="none" />
        {mangrove && (
          <path
            d="M0-22-18 3M2-19 20 3M0-12-8 7M2-12 10 6"
            fill="none"
            stroke={TRUNK}
            strokeWidth="2.5"
          />
        )}
        <g className="tree-canopy" style={{ '--delay': `${delay - CANOPY_LAG}s` } as CSSProperties}>
          <path
            d="M0-30C-18-29-38-38-38-57c0-12 7-18 16-22-1-17 9-31 24-31 16 0 23 11 24 24 13 2 22 15 19 27-3 18-20 29-45 29Z"
            fill={dark}
          />
          <path
            d="M2-110C-13-110-23-97-22-79c-9 4-16 10-16 22 0 19 20 28 38 27-10-17-6-38 2-80Z"
            fill={light}
          />
          <path
            d="M2-103 3-34M3-57-17-72M3-76 20-87"
            stroke="#eaf0cf"
            strokeOpacity=".27"
            strokeWidth="1"
            fill="none"
          />
          {fruit !== null && (
            <g fill={FRUIT_FILL[fruit]}>
              <ellipse cx="-18" cy="-60" rx="4" ry="5" />
              <ellipse cx="17" cy="-57" rx="4" ry="5" />
              <ellipse cx="8" cy="-87" rx="4" ry="5" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}

const TREES = [
  { x: 94, y: 181, scale: 0.72, variant: 1, forestVariant: 1, mangrove: true, fruit: false },
  { x: 357, y: 165, scale: 0.82, variant: 2, forestVariant: 2, mangrove: false, fruit: true },
  { x: 295, y: 197, scale: 1.05, variant: 1, forestVariant: 1, mangrove: true, fruit: true },
  { x: 187, y: 206, scale: 1.35, variant: 0, forestVariant: 2, mangrove: true, fruit: true },
  { x: 405, y: 211, scale: 0.55, variant: 0, forestVariant: 0, mangrove: true, fruit: false },
];

/** The five trees; coast and lagoon scenes stand them on mangrove roots, orchard and avocado scenes hang fruit. */
function Trees({ kind }: { kind: LandscapeKind }) {
  const water = WATER_KINDS.includes(kind);
  const fruit = FRUIT_KINDS.find((candidate) => candidate === kind) ?? null;

  return (
    <>
      {TREES.map((spec) => (
        <Tree
          key={spec.x}
          x={spec.x}
          y={spec.y}
          scale={spec.scale}
          variant={kind === 'forest' ? spec.forestVariant : spec.variant}
          mangrove={spec.mangrove && water}
          fruit={spec.fruit ? fruit : null}
        />
      ))}
    </>
  );
}

const WIND = [
  'M-100 240Q-30 30 170 85T550 20',
  'M-65 240Q-30 23 170 95T550 44',
  'M-30 240Q-30 16 170 105T550 68',
  'M5 240Q-30 9 170 115T550 92',
];

const GUST = [
  { top: 70, delay: 0, fill: LEAF_GREEN, dur: 9 },
  { top: 118, delay: -2.2, fill: '#7da36f', dur: 11 },
  { top: 52, delay: -4.1, fill: '#3f6b47', dur: 10 },
  { top: 150, delay: -6.3, fill: '#93b27e', dur: 12 },
  { top: 96, delay: -7.4, fill: LEAF_GREEN, dur: 9.5 },
  { top: 132, delay: -9.6, fill: '#c3a65c', dur: 13 },
];

/** Hero only: a gust of leaves blowing across the scene. */
function Gust() {
  return (
    <g className="gust">
      {GUST.map(({ top, delay, fill, dur }) => (
        <g
          key={top}
          className="gust-leaf"
          style={{ '--y': `${top}px`, '--d': `${delay}s`, '--dur': `${dur}s` } as CSSProperties}
        >
          <path className="gust-flutter" d="M0 0q-12-8-15 2 11 7 15-2Z" fill={fill} />
        </g>
      ))}
    </g>
  );
}

function Water() {
  return (
    <>
      <path d="M0 180Q127 155 235 192T480 180V240H0Z" fill="#9fbfb4" />
      <g stroke="#e1ece1" strokeWidth="1.5" fill="none" opacity=".65" className="water-lines">
        <path d="M14 205h51m35 12h75m140-6h83m-168 19h60m126-31h42" />
      </g>
    </>
  );
}

type LandscapeProps = {
  /** Which planting the scene draws (the campaign's art kind). */
  kind?: LandscapeKind;
  /** The large sign-in / campaign hero: adds `hero-art` and the gust of leaves. */
  hero?: boolean;
};

/** K3. Decorative: always `aria-hidden`; the caption or heading beside it carries the meaning. */
export function Landscape({ kind = 'forest', hero = false }: LandscapeProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => (ref.current === null ? undefined : watchOffscreen(ref.current)), []);

  return (
    <svg
      ref={ref}
      className={hero ? 'landscape hero-art' : 'landscape'}
      viewBox="0 0 480 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="480" height="240" fill={BACKGROUND[kind]} />
      <circle className="sun" cx="369" cy="60" r="29" fill="#faf9e8" opacity=".8" />
      <g className="wind" stroke="#7b9a73" strokeWidth=".7" fill="none" opacity=".18">
        {WIND.map((curve) => (
          <path key={curve} d={curve} />
        ))}
      </g>
      <path d="M0 150Q75 104 162 143T329 129T480 135V240H0Z" fill="#b6cba5" />
      <path d="M0 198Q115 115 236 174T480 155V240H0Z" fill="#8daa83" />
      <path d="M0 220Q120 168 248 203T480 180V240H0Z" fill="#64886b" />
      {WATER_KINDS.includes(kind) && <Water />}
      <Trees kind={kind} />
      <g fill="none" stroke="#c6d9b3" strokeWidth="1.4" opacity=".7">
        <path d="m49 221-2-7m2 7 4-5m276 11-1-7m1 7 4-5" />
      </g>
      <g className="drifting-leaf" fill={LEAF_GREEN}>
        <path d="M267 56q-12-8-15 2 11 7 15-2Z" />
        <path d="M62 91q7-9 13-4-3 9-13 4Z" />
      </g>
      {hero && <Gust />}
    </svg>
  );
}
