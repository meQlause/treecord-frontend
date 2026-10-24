// The art only S20 uses (mockup planter-pages.jsx:66-75 and :490-520): the heading scene where recordings leave the phone
// for the server, and the picture of one upload — the tree, the phone that filmed it with its state as a badge, and how far
// the server has carried it (checks → score → attest → on-chain; a cross where it was turned back). The card loops are CSS;
// the heading goes through the motion gate (design-system §2.10). Decorative: the card's text names the state.
import { gsap } from 'gsap';
import type { ReactNode } from 'react';
import { Glyph } from '../../shared/art/Glyph';
import { Scene, type Selector } from '../../shared/art/Scene';
import type { CaptureKind } from '../evidence/evidence.rules';
import { STEP_LABELS } from './uploads.copy';

const SANS = 'Segoe UI, sans-serif';
const TILES = [0, 1, 2];
const TILE_PITCH = 32;
const FLIGHT_X = 213;
const FLIGHT_Y = 45;
const STEP_X = 76;
const STEP_PITCH = 56;
const LAST_LINE_STEP = 3;
const BAD_SCALE = 2.3;
const GOOD_SCALE = 3.2;
const PHONE_TREE_SCALE = 0.85;
const DELAY_STAGGER = 0.9;
const SEND_SECONDS = 0.5;
const LAND_AT = 0.9;
const TILE_TOP = 24;
const SLOT_TOP = 12;
const SLOT_PITCH = 24;
const NOW_WIDTH = 2.4;
const STEP_WIDTH = 1.4;
const TICK_BACK = 3;
const CROSS_ARM = 2.6;

/** Each tile flies from the phone to the server, whose light blinks; the check pops, then the tiles come back. */
const sending = (select: Selector): gsap.core.Timeline => {
  const line = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });

  select('.ua-tile').forEach((tile, index) => {
    line
      .fromTo(
        tile,
        { x: 0, y: 0, opacity: 1, scale: 1 },
        {
          x: FLIGHT_X,
          y: FLIGHT_Y - index * TILE_PITCH,
          scale: 0.6,
          opacity: 0,
          duration: 1,
          ease: 'power2.inOut',
        },
        index * SEND_SECONDS,
      )
      .fromTo(
        select('.ua-light')[0] ?? [],
        { fill: '#9fd08a' },
        { fill: '#f0d27a', duration: 0.15, yoyo: true, repeat: 1 },
        index * SEND_SECONDS + LAND_AT,
      );
  });

  return line
    .fromTo(
      select('.ua-ok'),
      { scale: 0, transformOrigin: '50% 50%' },
      { scale: 1, duration: 0.4, ease: 'back.out(3)' },
    )
    .to({}, { duration: 1 })
    .fromTo(
      select('.ua-tile'),
      { x: 0, y: 0, scale: 1, opacity: 0 },
      { opacity: 1, duration: 0.4, stagger: 0.12 },
    )
    .to(select('.ua-ok'), { scale: 0, duration: 0.25 }, '<');
};

/** The heading scene: three clips on the phone fly to the server, which checks each in. */
export function UploadArt() {
  return (
    <Scene build={sending}>
      <g transform="translate(110 54) rotate(-4)">
        <rect width="78" height="140" rx="12" fill="#26422f" />
        <rect x="6" y="14" width="66" height="112" rx="5" fill="#dfe9d2" />
        {TILES.map((tile) => (
          <g
            key={tile}
            className="ua-tile"
            transform={`translate(14 ${TILE_TOP + tile * TILE_PITCH})`}
          >
            <rect width="50" height="26" rx="4" fill="#9db892" />
            <polygon points="20,8 30,13 20,18" fill="#fffef9" />
          </g>
        ))}
      </g>
      <path
        d="M196 120C240 90 290 90 320 104"
        fill="none"
        stroke="#9db58a"
        strokeWidth="1.4"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
      <g transform="translate(320 88)">
        <rect width="84" height="96" rx="10" fill="#2f6b43" />
        {TILES.map((tile) => (
          <rect
            key={tile}
            x="10"
            y={SLOT_TOP + tile * SLOT_PITCH}
            width="64"
            height="16"
            rx="4"
            fill="#24563a"
          />
        ))}
        <circle className="ua-light" cx="64" cy="20" r="3.4" fill="#9fd08a" />
      </g>
      <g className="ua-ok" transform="translate(404 92)">
        <circle r="14" fill="#2E9E5B" stroke="#eef3e6" strokeWidth="2.4" />
        <path
          d="M-6 0l4 4 8-9"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </Scene>
  );
}

type Badge = { fill: string; shape: ReactNode; motion: number };

/** The badge on the phone: a check on-chain, a cross turned back, a magnifier in review, an up-arrow waiting, a clock else. */
const badgeOf = (status: string, queued: boolean): Badge => {
  if (status === 'onchain') {
    return {
      fill: '#2E9E5B',
      motion: 1,
      shape: <path d="M-6 0l4 4 8-9" stroke="#fff" strokeWidth="2.6" />,
    };
  }

  if (status === 'rejected' || status === 'failed') {
    return {
      fill: '#f3e3c9',
      motion: 1,
      shape: <path d="M-5-5l10 10M5-5l-10 10" stroke="#9c4a36" strokeWidth="2.4" />,
    };
  }

  if (status === 'needs_review') {
    return {
      fill: '#f3e3c9',
      motion: 2,
      shape: (
        <>
          <circle cx="-1.5" cy="-1.5" r="5" stroke="#825f30" strokeWidth="2" />
          <path d="M2.2 2.2l4.3 4.3" stroke="#825f30" strokeWidth="2.4" />
        </>
      ),
    };
  }

  return queued
    ? {
        fill: '#fffef9',
        motion: 0,
        shape: <path d="M0 6V-6M-5-1l5-5 5 5" stroke="#a07a2e" strokeWidth="2.2" />,
      }
    : {
        fill: '#fffef9',
        motion: 1,
        shape: (
          <>
            <circle r="6.5" stroke="#3f6b35" strokeWidth="1.8" />
            <path d="M0-3.6V0l2.6 2" stroke="#3f6b35" strokeWidth="1.8" />
          </>
        ),
      };
};

type StepProps = { label: string; index: number; at: number; bad: boolean };

type StepLook = { fill: string; stroke: string; ink: string };

const LOOKS = {
  done: { fill: '#6f9a58', stroke: '#6f9a58', ink: '#6f8462' },
  cross: { fill: '#f3e3c9', stroke: '#c98a5c', ink: '#9c4a36' },
  now: { fill: '#fffef9', stroke: '#c49a3e', ink: '#a07a2e' },
  todo: { fill: '#fffef9', stroke: '#b9cba6', ink: '#6f8462' },
} as const satisfies Record<string, StepLook>;

/** A step is done before `at`, in progress (or crossed, when turned back) at it, still to come after. */
const lookOf = (index: number, current: number, bad: boolean): keyof typeof LOOKS => {
  if (index < current) {
    return 'done';
  }

  if (index !== current) {
    return 'todo';
  }

  return bad ? 'cross' : 'now';
};

function Step({ label, index, at, bad }: StepProps) {
  const center = STEP_X + index * STEP_PITCH;
  const state = lookOf(index, at, bad);
  const look = LOOKS[state];

  return (
    <g>
      <circle
        cx={center}
        cy="154"
        r="6.5"
        fill={look.fill}
        stroke={look.stroke}
        strokeWidth={index === at ? NOW_WIDTH : STEP_WIDTH}
        className={state === 'now' ? 'pl-pulse' : undefined}
      />
      {state === 'done' && (
        <path
          d={`M${center - TICK_BACK} 154l2 2 4-4.5`}
          fill="none"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
      {state === 'cross' && (
        <path
          d={`M${center - CROSS_ARM} 151.4l5.2 5.2M${center + CROSS_ARM} 151.4l-5.2 5.2`}
          stroke="#9c4a36"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
      <text
        x={center}
        y="174"
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        fill={look.ink}
        fontFamily={SANS}
      >
        {label}
      </text>
    </g>
  );
}

type CardArtProps = {
  kind: CaptureKind;
  status: string;
  queued: boolean;
  at: number;
  index: number;
};

type Delay = { animationDelay: string };

/** The tree the recording is of: a small one for a planting or replant, a swaying one, a stump for a dead tree. */
function Subject({ kind, delay }: { kind: CaptureKind; delay: Delay }) {
  const small = kind === 'PLANTED' || kind === 'REPLANTED';

  return (
    <g className={kind === 'DEAD' ? 'pl-bob' : 'pl-sway'} style={delay}>
      <Glyph
        kind={kind === 'DEAD' ? 'dead' : 'alive'}
        x={112}
        y={118}
        scale={small ? BAD_SCALE : GOOD_SCALE}
      />
    </g>
  );
}

/** The phone that filmed it, with the state as a badge on it. */
function Phone({ status, queued, delay }: { status: string; queued: boolean; delay: Delay }) {
  const badge = badgeOf(status, queued);

  return (
    <>
      <g className="pl-bob" style={delay}>
        <g transform="translate(170 40) rotate(-6)">
          <rect x="2" y="4" width="52" height="88" rx="9" fill="#153e2c" opacity=".12" />
          <rect width="52" height="88" rx="9" fill="#26422f" />
          <rect x="4" y="10" width="44" height="66" rx="4" fill="#dfe9d2" />
          <path d="M4 60h44v12a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#b9cfa5" />
          <Glyph kind="alive" x={26} y={66} scale={PHONE_TREE_SCALE} />
          <circle
            className="pl-blink"
            cx="12"
            cy="16"
            r="2.2"
            fill={queued ? '#c49a3e' : '#c0392b'}
          />
          <circle cx="26" cy="82" r="2.2" fill="#4d6b54" />
        </g>
      </g>
      <g transform="translate(228 70)">
        {status === 'onchain' && (
          <circle className="pl-ripple" r="16" fill="none" stroke="#2E9E5B" strokeWidth="1.6" />
        )}
        <circle r="15" fill={badge.fill} stroke="#eef3e6" strokeWidth="2.4" />
        <g
          className={`pl-ico pl-ico-${badge.motion}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {badge.shape}
        </g>
      </g>
    </>
  );
}

/** The line the server has carried the recording along, lit as far as `at`. */
function Line({ at, delay }: { at: number; delay: Delay }) {
  const reach = STEP_X + Math.min(at, LAST_LINE_STEP) * STEP_PITCH;

  return (
    <>
      <path
        d={`M${STEP_X} 154H${STEP_X + LAST_LINE_STEP * STEP_PITCH}`}
        stroke="#b9cba6"
        strokeWidth="1.4"
      />
      {at > 0 && (
        <>
          <path d={`M${STEP_X} 154H${reach}`} stroke="#6f9a58" strokeWidth="2.4" />
          <path
            className="pl-glint"
            style={delay}
            d={`M${STEP_X} 154H${reach}`}
            stroke="#fffef9"
            strokeWidth="2.4"
            strokeDasharray="10 250"
            strokeLinecap="round"
            opacity=".9"
          />
        </>
      )}
    </>
  );
}

/** One upload as a picture. `at` is the step in progress (−1 queued); the cross sits on it when turned back. */
export function UploadCardArt({ kind, status, queued, at, index }: CardArtProps) {
  const bad = status === 'rejected' || status === 'failed';
  const delay = { animationDelay: `-${index * DELAY_STAGGER}s` };

  return (
    <svg
      className="landscape"
      viewBox="0 0 320 184"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="320" height="184" fill="#e9f0de" />
      <polygon points="0,122 80,112 170,120 250,110 320,116 320,184 0,184" fill="#cddbbd" />
      <g className="pl-cloud" style={delay}>
        <ellipse cx="40" cy="38" rx="20" ry="6" fill="#fffef9" opacity=".85" />
        <ellipse cx="54" cy="33" rx="12" ry="7" fill="#fffef9" opacity=".85" />
      </g>
      <ellipse cx="112" cy="118" rx="34" ry="6" fill="#153e2c" opacity=".1" />
      <Subject kind={kind} delay={delay} />
      <Phone status={status} queued={queued} delay={delay} />
      <Line at={at} delay={delay} />
      {STEP_LABELS(status === 'needs_review').map((label, step) => (
        <Step key={label} label={label} index={step} at={at} bad={bad} />
      ))}
    </svg>
  );
}
