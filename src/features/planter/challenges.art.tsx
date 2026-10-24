// The art only S18 uses (mockup planter-pages.jsx:57-65 and :172-186): the heading scene where an auditor's code flips into
// place on a card held in front of the tree, and the scene of one ticket (the tree in the viewfinder, the code held up with
// its QR, the days left as a ring). CSS loops keep a list cheap; the heading goes through the motion gate (§2.10).
import { gsap } from 'gsap';
import { Glyph } from '../../shared/art/Glyph';
import { QR } from '../../shared/art/QR';
import { Scene, type Selector } from '../../shared/art/Scene';
import type { PlanterChallenge } from './planter.api';

const SANS = 'Segoe UI, sans-serif';
const MONO = 'ui-monospace, Consolas, monospace';
const SCRAMBLE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SAMPLE_CODE = 'K7Q2';
const FRAME = [
  { x: 118, y: 58, dx: 1, dy: 1 },
  { x: 318, y: 58, dx: -1, dy: 1 },
  { x: 118, y: 206, dx: 1, dy: -1 },
  { x: 318, y: 206, dx: -1, dy: -1 },
];
const VIEWFINDER = [
  { x: 62, y: 74, dx: 1, dy: 1 },
  { x: 312, y: 74, dx: -1, dy: 1 },
  { x: 62, y: 222, dx: 1, dy: -1 },
  { x: 312, y: 222, dx: -1, dy: -1 },
];
const ARM = 16;
const RING_RADIUS = 22;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const LAST_DAY = 1;
const CODE_WIDTH = 10.6;
const CODE_LEFT = 26;
const WARNING = '#c98a5c';
const GOOD = '#6f9a58';

const SCRAMBLE_STEP = 7;
const SCRAMBLE_TICK = 13;

/** The code with its unsettled characters flickering through the alphabet; `tick` moves them on (decorative, no randomness). */
const scramble = (code: string, settled: number, tick: number): string =>
  code.slice(0, settled) +
  [...code.slice(settled)]
    .map((char, index) =>
      char === '-'
        ? char
        : (SCRAMBLE[(index * SCRAMBLE_STEP + tick * SCRAMBLE_TICK) % SCRAMBLE.length] ?? char),
    )
    .join('');

/** The card slides in, the code flips into place, the frame closes and the check lands; then a rest. */
const flip = (select: Selector): gsap.core.Timeline => {
  const progress = { t: 0 };
  let tick = 0;
  const code = select('.ca-code')[0];

  return gsap
    .timeline({ repeat: -1, repeatDelay: 0.6 })
    .fromTo(
      select('.ca-card'),
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
    )
    .to(progress, {
      t: 1,
      duration: 1.2,
      ease: 'none',
      onUpdate: () => {
        if (code !== undefined) {
          tick += 1;
          code.textContent = scramble(
            SAMPLE_CODE,
            Math.floor(progress.t * SAMPLE_CODE.length),
            tick,
          );
        }
      },
    })
    .fromTo(
      select('.ca-frame'),
      { opacity: 0, scale: 1.1, transformOrigin: '50% 50%' },
      { opacity: 1, scale: 1, duration: 0.4 },
    )
    .fromTo(
      select('.ca-ok'),
      { scale: 0, transformOrigin: '50% 50%' },
      { scale: 1, duration: 0.4, ease: 'back.out(3)' },
    )
    .to({}, { duration: 1.6 })
    .to(select('.ca-card,.ca-frame,.ca-ok'), { opacity: 0, duration: 0.4 });
};

/** The four corners of a viewfinder, each an L of two strokes. */
function Corners({ corners, stroke }: { corners: typeof FRAME; stroke: string }) {
  return (
    <>
      {corners.map(({ x, y, dx, dy }) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y}h${dx * ARM}M${x} ${y}v${dy * ARM}`}
          fill="none"
          stroke={stroke}
        />
      ))}
    </>
  );
}

/** The heading scene. */
export function CodeArt() {
  return (
    <Scene build={flip}>
      <g transform="translate(170 192) scale(2.6)">
        <polygon points="0,-34 9,-18 -9,-18" fill="#6aab60" />
        <polygon points="0,-34 9,-18 0,-18" fill="#3f844e" />
        <polygon points="0,-24 13,-5 -13,-5" fill="#4a8b4e" />
        <polygon points="0,-24 13,-5 0,-5" fill="#24623c" />
        <rect x="-1.6" y="-5" width="3.2" height="7" fill="#7a5a40" />
      </g>
      <g className="ca-card">
        <g transform="translate(248 112) rotate(-6)">
          <rect x="-58" y="-26" width="116" height="52" rx="8" fill="#fffef9" stroke="#d6e0ca" />
          <text
            x="0"
            y="-8"
            textAnchor="middle"
            fontSize="7"
            letterSpacing="1.6"
            fill="#7b8c6c"
            fontFamily={SANS}
          >
            AUDIT CHALLENGE
          </text>
          <text
            className="ca-code"
            x="0"
            y="15"
            textAnchor="middle"
            fontSize="20"
            letterSpacing="2"
            fill="#26422f"
            fontFamily={MONO}
          >
            {SAMPLE_CODE}
          </text>
        </g>
      </g>
      <g className="ca-frame" strokeWidth="2.6" strokeLinecap="round">
        <Corners corners={FRAME} stroke="#2f6b43" />
      </g>
      <g className="ca-ok" transform="translate(372 76)">
        <circle r="16" fill="#2E9E5B" />
        <path
          d="M-7 0l5 5 9-10"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </Scene>
  );
}

type SceneProps = { challenge: PlanterChallenge; days: { left: number; total: number } };

/** The ring of days left: full at the start, empty at the end, the warning colour on the last day. */
function DaysRing({ days }: { days: SceneProps['days'] }) {
  const share = days.total === 0 ? 0 : days.left / days.total;

  return (
    <g transform="translate(352 46)">
      <circle r={RING_RADIUS} fill="#fffef9" stroke="#e3ebd7" strokeWidth="5" />
      <circle
        r={RING_RADIUS}
        fill="none"
        stroke={days.left <= LAST_DAY ? WARNING : GOOD}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${RING_LENGTH * share} ${RING_LENGTH}`}
        transform="rotate(-90)"
      />
      <text y="3" textAnchor="middle" fontSize="14" fill="#26422f" fontFamily="Georgia, serif">
        {days.left}d
      </text>
      <text
        y="14"
        textAnchor="middle"
        fontSize="6"
        letterSpacing="1"
        fill="#7b8c6c"
        fontFamily={SANS}
      >
        LEFT
      </text>
    </g>
  );
}

/** One ticket's scene: the tree (flagged or alive) in the viewfinder, the code held up beside it, the ring. */
export function ChallengeScene({ challenge, days }: SceneProps) {
  const { code, qr, tree } = challenge;

  return (
    <svg
      className="landscape pl-ticket-scene"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`ct-sky-${tree.treeId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef3e6" />
          <stop offset="1" stopColor="#dde7d2" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#ct-sky-${tree.treeId})`} />
      <g className="pl-cloud">
        <ellipse cx="60" cy="44" rx="22" ry="7" fill="#fffef9" opacity=".9" />
        <ellipse cx="76" cy="38" rx="13" ry="8" fill="#fffef9" opacity=".9" />
      </g>
      <polygon points="0,196 100,184 210,194 300,182 400,190 400,260 0,260" fill="#c4d4b3" />
      <polygon points="0,222 140,212 280,224 400,214 400,260 0,260" fill="#9db892" />
      <ellipse cx="128" cy="200" rx="40" ry="7" fill="#153e2c" opacity=".1" />
      <g className="pl-sway">
        <Glyph kind={tree.status === 'flagged' ? 'flagged' : 'alive'} x={128} y={200} scale={3.6} />
      </g>
      <g strokeWidth="2.4" strokeLinecap="round" opacity=".75">
        <Corners corners={VIEWFINDER} stroke="#2f6b43" />
      </g>
      <g className="pl-bob">
        <g transform="translate(240 136) rotate(-5)">
          <rect
            x="-84"
            y="-34"
            width="168"
            height="68"
            rx="10"
            fill="#153e2c"
            opacity=".12"
            transform="translate(4 6)"
          />
          <rect x="-84" y="-34" width="168" height="68" rx="10" fill="#fffef9" stroke="#d6e0ca" />
          <QR text={qr} x={-80} y={-30} w={60} />
          <text
            x="26"
            y="-12"
            textAnchor="middle"
            fontSize="7.5"
            letterSpacing="1.8"
            fill="#7b8c6c"
            fontFamily={SANS}
          >
            AUDIT CHALLENGE
          </text>
          <text
            x="26"
            y="18"
            textAnchor="middle"
            fontSize="27"
            letterSpacing="3"
            fill="#26422f"
            fontFamily={MONO}
          >
            {code}
          </text>
          <rect
            className="pl-blink"
            x={CODE_LEFT + code.length * CODE_WIDTH}
            y="-1"
            width="2.6"
            height="22"
            fill={GOOD}
          />
          <path d="M-34 34c-4 10-2 22 6 30h20c4-10 4-22-2-30Z" fill="#c99d7a" />
        </g>
      </g>
      <DaysRing days={days} />
    </svg>
  );
}
