import { gsap } from 'gsap';
import type { ComponentType } from 'react';
import { Scene, type Build, type Selector } from './Scene';

// K28. Mockup shared-pages.jsx:144-221. Heading art for one tree, drawn in its real state (growing, completed, dead
// stump, removed, flagged). A phone frames it, the shutter flashes, the GPS pin drops on its plot and the evidence hash
// checks in: how a tree gets proven. Palette: design-system §2.4.
export type TreeArtKind = 'growing' | 'completed' | 'dead' | 'removed' | 'flagged';

const FOOT_X = 196;
const FOOT_Y = 196;
const FULL_HEIGHT = 150;
const FULL_WIDTH = 78;
const MIN_GROWTH = 0.45;
const START_GROWTH = 0.4;
const GROWTH_SPAN = 0.6;
const MATURITY_MONTHS = 36;
const SHADOW_REACH = 0.7;
const SHADOW_PAD = 10;
const TRUNK_WIDTH = 3;
const TRUNK_SHARE = 0.2;
const CAP_SHARE = 0.035;
const FRAME_PAD_X = 18;
const FRAME_PAD_Y = 14;
const FRAME_ARM = 14;

const BARK_DARK = '#5E4030';
const BARK_LIGHT = '#8B5E3C';
const GOLD = '#c49a3e';
const PAPER = '#fffef9';
const SEAL = '#2E9E5B';
const PIN = '#2f6b43';
const INK = '#26422f';
const SCREEN = '#dfe9d2';
const EASE_OUT = 'power2.out';

/** Where each tier of the crown sits (share of the tree's height), how wide it is, and its two facet colours. */
const TIERS = [
  { base: 0.14, apex: 0.58, half: 0.5, left: '#4a8b4e', right: '#24623c' },
  { base: 0.38, apex: 0.8, half: 0.39, left: '#5ea158', right: '#2f7044' },
  { base: 0.6, apex: 1, half: 0.28, left: '#78b46c', right: '#3d7f4c' },
];
const FRAME_CORNERS = [
  { across: -1, down: -1 },
  { across: 1, down: -1 },
  { across: -1, down: 1 },
  { across: 1, down: 1 },
];

/** A tree is as tall as its age; a completed one is full grown. The Dead and Removed states reuse it for the shadow. */
const sizeOf = (kind: TreeArtKind, month: number): number =>
  kind === 'completed'
    ? 1
    : Math.max(MIN_GROWTH, Math.min(1, START_GROWTH + (GROWTH_SPAN * month) / MATURITY_MONTHS));

type Sized = { scale: number };

function Crown({ scale }: Sized) {
  const height = FULL_HEIGHT * scale;
  const width = FULL_WIDTH * scale;
  const trunk = TRUNK_SHARE * height;

  return (
    <g className="ta-tree">
      <rect
        x={FOOT_X - TRUNK_WIDTH * scale}
        y={FOOT_Y - trunk}
        width={TRUNK_WIDTH * scale}
        height={trunk}
        fill={BARK_DARK}
      />
      <rect
        x={FOOT_X}
        y={FOOT_Y - trunk}
        width={TRUNK_WIDTH * scale}
        height={trunk}
        fill={BARK_LIGHT}
      />
      {TIERS.map(({ base, apex, half, left, right }) => {
        const bottom = FOOT_Y - base * height;
        const top = FOOT_Y - apex * height;
        const cap = bottom - CAP_SHARE * height;
        const reach = half * width * 2;

        return (
          <g key={base}>
            <polygon
              points={`${FOOT_X},${top} ${FOOT_X - reach},${bottom} ${FOOT_X},${cap}`}
              fill={left}
            />
            <polygon
              points={`${FOOT_X},${top} ${FOOT_X},${cap} ${FOOT_X + reach},${bottom}`}
              fill={right}
            />
          </g>
        );
      })}
    </g>
  );
}

function Stump() {
  return (
    <g>
      <path d="M187 196l2-26 6-4 5 5 3-3 2 28Z" fill={BARK_LIGHT} />
      <path d="M187 196l2-26 6-4 2 30Z" fill={BARK_DARK} />
      <path d="M214 196v-12" stroke="#4a7a43" strokeWidth="2" strokeLinecap="round" />
      <polygon points="214,187 206,182 208,178" fill="#5ea158" />
    </g>
  );
}

function Mound() {
  return <ellipse cx={FOOT_X} cy={FOOT_Y} rx="24" ry="6" fill="#9e7b55" />;
}

const BODY: Record<TreeArtKind, ComponentType<Sized>> = {
  growing: Crown,
  completed: Crown,
  flagged: Crown,
  dead: Stump,
  removed: Mound,
};

/** The viewfinder framing the tree: four corner brackets that grow with it. */
function Viewfinder({ scale }: Sized) {
  const height = FULL_HEIGHT * scale;
  const width = FULL_WIDTH * scale;

  return (
    <g
      className="ta-frame"
      opacity="0"
      fill="none"
      stroke={PAPER}
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      {FRAME_CORNERS.map(({ across, down }) => {
        const left = FOOT_X + across * (width + FRAME_PAD_X);
        const top = FOOT_Y - height / 2 + down * (height / 2 + FRAME_PAD_Y);

        return (
          <path
            key={`${across}${down}`}
            d={`M${left} ${top}h${-across * FRAME_ARM}M${left} ${top}v${-down * FRAME_ARM}`}
          />
        );
      })}
    </g>
  );
}

function Phone() {
  return (
    <g className="ta-phone" opacity="0">
      <g transform="translate(352 64) rotate(7)">
        <rect width="62" height="112" rx="10" fill={INK} />
        <rect x="5" y="10" width="52" height="88" rx="4" fill={SCREEN} />
        <path d="M12 60l10-14 8 10 6-6 12 16H12Z" fill="#9db892" />
        <polygon points="31,22 39,38 23,38" fill="#4a8b4e" />
        <rect x="30" y="38" width="2" height="8" fill={BARK_DARK} />
        <path
          d="M9 14h6M9 14v6M53 14h-6M53 14v6M9 94h6M9 94v-6M53 94h-6M53 94v-6"
          stroke={PIN}
          strokeWidth="1.4"
        />
        <rect
          className="ta-flash"
          x="5"
          y="10"
          width="52"
          height="88"
          rx="4"
          fill="#fff"
          opacity="0"
        />
        <circle cx="31" cy="105" r="3" fill={SCREEN} />
      </g>
    </g>
  );
}

function Hash() {
  return (
    <g className="ta-hash" opacity="0">
      <rect x="330" y="186" width="108" height="24" rx="12" fill={PAPER} stroke="#d6e0ca" />
      <circle cx="344" cy="198" r="7" fill={SEAL} />
      <path
        d="M340.5 198l2.5 2.5 4.5-5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="356"
        y="201.5"
        fontSize="9"
        fill="#3f6b35"
        fontFamily="ui-monospace, Consolas, monospace"
      >
        SHA-256 ✓
      </text>
    </g>
  );
}

/** The proof, once: the phone slides in, the frame closes, the shutter flashes, the pin drops, the hash checks in. */
function proof(select: Selector, frameOrigin: string): gsap.core.Timeline {
  return gsap
    .timeline({ repeat: -1, repeatDelay: 0.6 })
    .set(select('.ta-pin'), { y: -60, opacity: 0 })
    .set(select('.ta-ring'), { attr: { r: 2 }, opacity: 0 })
    .set(select('.ta-hash'), { opacity: 0, y: 6 })
    .set(select('.ta-frame'), { opacity: 0, scale: 1.15, svgOrigin: frameOrigin })
    .fromTo(
      select('.ta-phone'),
      { x: 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
    )
    .to(select('.ta-frame'), { opacity: 1, scale: 1, duration: 0.4, ease: EASE_OUT })
    .to(select('.ta-flash'), { opacity: 0.85, duration: 0.06 })
    .to(select('.ta-flash'), { opacity: 0, duration: 0.35 })
    .to(select('.ta-pin'), { y: 0, opacity: 1, duration: 0.5, ease: 'bounce.out' }, '<')
    .to(select('.ta-ring'), { attr: { r: 26 }, opacity: 0.8, duration: 0.01 }, '>-.1')
    .to(select('.ta-ring'), { opacity: 0, duration: 0.8, attr: { r: 40 }, ease: EASE_OUT }, '<')
    .to(select('.ta-hash'), { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }, '<.1')
    .to({}, { duration: 2.2 })
    .to(select('.ta-phone,.ta-frame,.ta-hash,.ta-pin'), {
      opacity: 0,
      duration: 0.5,
      ease: 'power1.in',
    });
}

/** The proof loop, plus the gentle sway of a tree that is still standing. */
const proofBuild =
  (height: number, sways: boolean): Build =>
  (select) => {
    const timeline = proof(select, `${FOOT_X} ${FOOT_Y - height / 2}`);
    const trees = select('.ta-tree');

    if (!sways || trees.length === 0) {
      return timeline;
    }

    gsap.set(trees, { svgOrigin: `${FOOT_X} ${FOOT_Y}` });

    return [
      timeline,
      gsap.to(trees, { rotation: 1.2, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    ];
  };

type TreeArtProps = {
  kind: TreeArtKind;
  /** The tree's age in months; sets how tall a growing tree is drawn (full grown at 36). */
  month?: number;
};

/** K28. Decorative: the page heading beside it names the tree and its state. */
export function TreeArt({ kind, month = 0 }: TreeArtProps) {
  const scale = sizeOf(kind, month);
  const Body = BODY[kind];

  return (
    <Scene
      build={proofBuild(FULL_HEIGHT * scale, kind !== 'dead' && kind !== 'removed')}
      deps={[kind, month]}
    >
      <circle cx="96" cy="58" r="20" fill="#fbfaec" />
      <ellipse
        cx={FOOT_X}
        cy={FOOT_Y + 1}
        rx={FULL_WIDTH * scale * SHADOW_REACH + SHADOW_PAD}
        ry="5"
        fill="#153e2c"
        opacity=".12"
      />
      <Body scale={scale} />
      {kind === 'flagged' && (
        <g>
          <path d="M150 196v-38" stroke={BARK_DARK} strokeWidth="2" />
          <path d="M151 158h18l-5 6 5 6h-18Z" fill={GOLD} />
        </g>
      )}
      <Viewfinder scale={scale} />
      <g className="ta-ring-g">
        <circle
          className="ta-ring"
          cx={FOOT_X}
          cy={FOOT_Y}
          r="2"
          fill="none"
          stroke={GOLD}
          strokeWidth="1.6"
          opacity="0"
          transform="scale(1 .28)"
          style={{ transformOrigin: `${FOOT_X}px ${FOOT_Y}px` }}
        />
      </g>
      <g className="ta-pin" opacity="0">
        <path d="M226 194l-8-11a10 10 0 1 1 16 0Z" fill={PIN} />
        <circle cx="226" cy="177" r="3.6" fill="#f3f8ea" />
      </g>
      <Phone />
      <Hash />
    </Scene>
  );
}
