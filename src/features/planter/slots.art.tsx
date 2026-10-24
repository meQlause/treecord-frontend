// The art only S17 uses (mockup planter-pages.jsx:45-55 and :103-112): the heading scene where a plot is staked out and a
// seed drops in and comes up, and the card picture of a slot with its tag hanging in it. The loops go through the motion
// gate (design-system §2.10). Decorative; the QR is the one informative part and names its code.
import { gsap } from 'gsap';
import { QR } from '../../shared/art/QR';
import { Scene, type Selector } from '../../shared/art/Scene';
import type { SlotKind } from './planter.api';

const CORNERS = [
  { x: 120, y: 170 },
  { x: 240, y: 130 },
  { x: 360, y: 170 },
  { x: 240, y: 210 },
];
const PLOT = '120,170 240,130 360,170 240,210';
const FLAG_DELAY = 0.4;
const TAG_QR = 40;
const STAKE_HEIGHT = 22;
const POST_WIDTH = 1.5;
const POST_HEIGHT = 16;

/** The plot is staked out, a seed drops into it and comes up; a ring runs out; then a rest. */
const staking = (select: Selector): gsap.core.Timeline =>
  gsap
    .timeline({ repeat: -1, repeatDelay: 0.6 })
    .fromTo(
      select('.pp-edge'),
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' },
    )
    .fromTo(
      select('.pp-stake'),
      { scaleY: 0, transformOrigin: '50% 100%' },
      { scaleY: 1, duration: 0.35, stagger: 0.12, ease: 'back.out(2)' },
      '-=0.3',
    )
    .fromTo(
      select('.pp-seed'),
      { y: -90, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.in' },
    )
    .to(select('.pp-seed'), { opacity: 0, duration: 0.1 })
    .fromTo(
      select('.pp-sprout'),
      { scaleY: 0, transformOrigin: '50% 100%' },
      { scaleY: 1, duration: 0.6, ease: 'back.out(2)' },
      '<',
    )
    .fromTo(
      select('.pp-ring'),
      { attr: { rx: 10, ry: 3 }, opacity: 0.9 },
      { attr: { rx: 120, ry: 34 }, opacity: 0, duration: 1.2, ease: 'power2.out' },
      '<',
    )
    .to({}, { duration: 1.4 })
    .to(select('.pp-sprout'), { scaleY: 0, duration: 0.3 });

/** The heading scene: stakes at the four corners, a seed, a sprout. */
export function PlotArt() {
  return (
    <Scene build={staking}>
      <polygon points={PLOT} fill="#d7e3c9" />
      <polygon
        className="pp-edge"
        points={PLOT}
        fill="none"
        stroke="#5f8a4f"
        strokeWidth="2"
        strokeDasharray="1"
        pathLength="1"
      />
      <polygon
        points={PLOT}
        fill="none"
        stroke="#fffef9"
        strokeWidth="2"
        strokeDasharray=".012 .02"
        pathLength="1"
        opacity=".7"
      />
      {CORNERS.map(({ x, y }) => (
        <g key={`${x}-${y}`} className="pp-stake">
          <rect x={x - 2} y={y - STAKE_HEIGHT} width="4" height={STAKE_HEIGHT} fill="#8B5E3C" />
          <path d={`M${x + 2} ${y - STAKE_HEIGHT}h12l-4 4 4 4h-12Z`} fill="#c49a3e" />
        </g>
      ))}
      <ellipse
        className="pp-ring"
        cx="240"
        cy="170"
        rx="10"
        ry="3"
        fill="none"
        stroke="#c49a3e"
        strokeWidth="1.6"
        opacity="0"
      />
      <ellipse className="pp-seed" cx="240" cy="166" rx="4" ry="5" fill="#8B5E3C" opacity="0" />
      <g className="pp-sprout">
        <path d="M240 170v-30" stroke="#4a7a43" strokeWidth="3" strokeLinecap="round" />
        <polygon points="240,150 220,140 226,130" fill="#5ea158" />
        <polygon points="240,144 262,132 256,122" fill="#4a8b4e" />
      </g>
    </Scene>
  );
}

const CARD_CORNERS = [
  { x: 70, y: 120 },
  { x: 160, y: 88 },
  { x: 250, y: 120 },
  { x: 160, y: 152 },
];

type CardArtProps = { kind: SlotKind; tag: string | null };

/** A slot's card picture: the staked plot with a seed (or an anchor mark), and the tag hanging in it with its QR. */
export function PlotCardArt({ kind, tag }: CardArtProps) {
  return (
    <svg
      className="landscape"
      viewBox="0 0 320 184"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="320" height="184" fill="#e9f0de" />
      <polygon points="0,130 90,120 180,128 260,118 320,124 320,184 0,184" fill="#cddbbd" />
      <polygon
        className="pl-march"
        points="70,120 160,88 250,120 160,152"
        fill="#d7e3c9"
        stroke="#5f8a4f"
        strokeWidth="1.6"
        strokeDasharray="6 5"
      />
      <ellipse
        className="pl-ripple"
        cx="160"
        cy="124"
        rx="34"
        ry="11"
        fill="none"
        stroke="#c49a3e"
        strokeWidth="1.4"
      />
      {CARD_CORNERS.map(({ x, y }, index) => (
        <g key={`${x}-${y}`}>
          <rect
            x={x - POST_WIDTH}
            y={y - POST_HEIGHT}
            width="3"
            height={POST_HEIGHT}
            fill="#8B5E3C"
          />
          <path
            className="pl-flag"
            style={{ animationDelay: `-${index * FLAG_DELAY}s` }}
            d={`M${x + POST_WIDTH} ${y - POST_HEIGHT}h9l-3 3 3 3h-9Z`}
            fill="#c49a3e"
          />
        </g>
      ))}
      <g className="pl-bob">
        {kind === 'anchor' ? (
          <g transform="translate(160 118)">
            <circle r="12" fill="#fffef9" stroke="#2f6b43" strokeWidth="2" />
            <path
              d="M0-6v12M-6 2a6 6 0 0 0 12 0"
              fill="none"
              stroke="#2f6b43"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <ellipse cx="160" cy="118" rx="5" ry="6" fill="#8B5E3C" />
        )}
      </g>
      {tag !== null && (
        <g className="pl-sway" style={{ transformOrigin: '250px 104px' }}>
          <path d="M250 104l12 6" stroke="#8B5E3C" strokeWidth="1.2" />
          <rect x="258" y="98" width="44" height="52" rx="3" fill="#fffef9" stroke="#d6e0ca" />
          <QR text={tag} x={260} y={100} w={TAG_QR} />
          <text
            x="280"
            y="146"
            textAnchor="middle"
            fontSize="5"
            letterSpacing=".6"
            fill="#26422f"
            fontFamily="ui-monospace, Consolas, monospace"
          >
            {tag}
          </text>
        </g>
      )}
    </svg>
  );
}
