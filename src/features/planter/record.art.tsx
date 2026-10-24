// The art S19 draws (mockup planter-pages.jsx:276-363): the scene before the camera opens, the viewfinder over the live
// image, the four capture steps as one track, and the location rule with the accuracy ring. The scene loops through the
// motion gate (design-system §2.10); the track and the rule are informative and name their state.
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useRef } from 'react';
import { useSceneLoop } from '../../shared/art/Scene';
import { MAX_GPS_ACCURACY_M } from '../evidence/evidence.config';
import type { CaptureKind, Fix } from '../evidence/evidence.rules';

gsap.registerPlugin(MotionPathPlugin);

const SANS = 'Segoe UI, sans-serif';
const SCENE_CORNERS = [
  { x: 140, y: 96, run: 1, rise: 1 },
  { x: 260, y: 96, run: -1, rise: 1 },
  { x: 140, y: 226, run: 1, rise: -1 },
  { x: 260, y: 226, run: -1, rise: -1 },
];
const FINDER_CORNERS = [
  { x: 20, y: 20, run: 1, rise: 1 },
  { x: 380, y: 20, run: -1, rise: 1 },
  { x: 20, y: 280, run: 1, rise: -1 },
  { x: 380, y: 280, run: -1, rise: -1 },
];
const SCENE_ARM = 16;
const FINDER_ARM = 22;
const CENTER = 0.5;
const ICON_STAGGER = 0.5;
const BOLD = 700;
const REGULAR = 500;
const STEPS = [
  ['Camera & GPS', 'M-7-4h3l2-3h4l2 3h3v10h-14Z'],
  ['Live position', 'M0 6-5-1A6 6 0 1 1 5-1Z'],
  ['Recording', 'M-5-5h10v10h-10Z'],
  ['Sealed', 'M-5 0l3.5 3.5 6.5-7'],
] as const;
const LAST_STEP = STEPS.length - 1;
const TRACK_FIRST = 36;
const TRACK_PITCH = 76;
const TRACK_LENGTH = 228;
const RING_MIN = 10;
const RING_MAX = 58;
const RING_SCALE = 30;
const WALK_SECONDS = 7;

function Seedling() {
  return (
    <g transform="translate(200 206)">
      <ellipse rx="22" ry="5" fill="#8B5E3C" opacity=".8" />
      <path d="M0 0v-30" stroke="#6aab60" strokeWidth="3.4" strokeLinecap="round" />
      <polygon points="0,-18 -20,-28 -14,-38" fill="#7ab86e" />
      <polygon points="0,-24 22,-36 16,-46" fill="#5ea158" />
    </g>
  );
}

function TreeShape() {
  return (
    <g transform="translate(200 210) scale(2.6)">
      <polygon points="0,-34 9,-18 -9,-18" fill="#7ab86e" />
      <polygon points="0,-34 9,-18 0,-18" fill="#4a8b4e" />
      <polygon points="0,-24 13,-5 -13,-5" fill="#5ea158" />
      <polygon points="0,-24 13,-5 0,-5" fill="#2f7044" />
      <rect x="-1.6" y="-5" width="3.2" height="7" fill="#8B5E3C" />
    </g>
  );
}

/** Before the camera opens: the target in the viewfinder, the phone walking round it, GPS locking. */
export function CaptureScene({ kind }: { kind: CaptureKind }) {
  const root = useRef<SVGSVGElement>(null);

  useSceneLoop(root, (select) => {
    const orbit = select('.cs-orbit')[0] as SVGPathElement;
    const walk = gsap.to(select('.cs-phone'), {
      duration: WALK_SECONDS,
      ease: 'none',
      repeat: -1,
      motionPath: { path: orbit, align: orbit, alignOrigin: [CENTER, CENTER] },
    });
    const lock = gsap
      .timeline({ repeat: -1 })
      .fromTo(
        select('.cs-ring'),
        { attr: { r: 6 }, opacity: 0.9 },
        { attr: { r: 34 }, opacity: 0, duration: 1.8, ease: 'power2.out' },
      )
      .fromTo(
        select('.cs-frame'),
        { scale: 1.06, transformOrigin: '50% 50%' },
        { scale: 1, duration: 0.9, ease: 'power2.inOut', yoyo: true, repeat: 1 },
        0,
      );

    return [walk, lock];
  });

  return (
    <svg
      ref={root}
      className="ev-scene"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cs-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#21402c" />
          <stop offset="1" stopColor="#152c1d" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#cs-bg)" />
      <path d="M133 0V300M267 0V300M0 100H400M0 200H400" stroke="#fff" strokeOpacity=".05" />
      <g transform="translate(0 -34)">
        <ellipse cx="200" cy="212" rx="150" ry="36" fill="#2b4f37" />
        <ellipse cx="200" cy="208" rx="96" ry="20" fill="#35603f" />
        <path
          className="cs-orbit"
          d="M72 200a128 34 0 1 0 256 0a128 34 0 1 0-256 0"
          fill="none"
          stroke="#9fd08a"
          strokeOpacity=".45"
          strokeWidth="1.4"
          strokeDasharray="4 6"
        />
        {kind === 'PLANTED' ? <Seedling /> : <TreeShape />}
        <g
          className="cs-frame"
          fill="none"
          stroke="#f4f7ee"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          {SCENE_CORNERS.map(({ x, y, run, rise }) => (
            <path
              key={`${x}-${y}`}
              d={`M${x} ${y}h${run * SCENE_ARM}M${x} ${y}v${rise * SCENE_ARM}`}
            />
          ))}
        </g>
        <g transform="translate(286 92)">
          <circle className="cs-ring" r="6" fill="none" stroke="#e6c46e" strokeWidth="1.6" />
          <path d="M0 0-6-9A7 7 0 1 1 6-9Z" fill="#e6c46e" />
          <circle cy="-12" r="2.4" fill="#21402c" />
        </g>
        <g className="cs-phone">
          <rect x="-8" y="-13" width="16" height="26" rx="3" fill="#f4f7ee" />
          <rect x="-5.5" y="-9" width="11" height="16" rx="1.5" fill="#6f9a58" />
          <circle cy="10" r="1.2" fill="#6f9a58" />
        </g>
      </g>
    </svg>
  );
}

/** While live: a viewfinder over the camera image. */
export function Finder() {
  return (
    <svg className="ev-finder" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M133 0V300M267 0V300M0 100H400M0 200H400"
        stroke="#fff"
        strokeOpacity=".18"
        vectorEffect="non-scaling-stroke"
      />
      <g fill="none" stroke="#fff" strokeWidth="2.4" vectorEffect="non-scaling-stroke">
        {FINDER_CORNERS.map(({ x, y, run, rise }) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y}h${run * FINDER_ARM}M${x} ${y}v${rise * FINDER_ARM}`}
          />
        ))}
      </g>
      <path
        d="M192 150h16M200 142v16"
        stroke="#fff"
        strokeOpacity=".7"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** A step is done before `step`, in progress at it, still to come after. */
const stateOf = (step: number, index: number): 'done' | 'now' | 'todo' => {
  if (index < step) {
    return 'done';
  }

  return index === step ? 'now' : 'todo';
};

const FILL = { done: '#6f9a58', now: '#fffef9', todo: '#fffef9' } as const;
const STROKE = { done: '#6f9a58', now: '#c49a3e', todo: '#c3d1b5' } as const;
const INK = { done: '#fff', now: '#c49a3e', todo: '#b9cba6' } as const;

/** The four capture steps as one track; `step` is the zero-based step in progress. */
export function CaptureTrack({ step }: { step: number }) {
  const shown = Math.min(step, LAST_STEP);

  return (
    <svg
      className="pl-track"
      viewBox="0 0 300 74"
      role="img"
      aria-label={`Capture step ${shown + 1} of 4: ${STEPS[shown]?.[0] ?? ''}`}
    >
      <path d="M36 24H264" stroke="#e3ebd7" strokeWidth="3" />
      <path
        d="M36 24H264"
        stroke="#6f9a58"
        strokeWidth="3"
        strokeDasharray={`${(shown / LAST_STEP) * TRACK_LENGTH} 300`}
      />
      {STEPS.map(([label, shape], index) => {
        const center = TRACK_FIRST + index * TRACK_PITCH;
        const state = stateOf(step, index);
        const outline = index === 0 || index === LAST_STEP;

        return (
          <g key={label}>
            {state === 'now' && (
              <circle
                className="pl-now"
                cx={center}
                cy="24"
                r="16"
                fill="none"
                stroke="#d8b96a"
                strokeWidth="1.4"
              />
            )}
            <circle
              cx={center}
              cy="24"
              r="13"
              fill={FILL[state]}
              stroke={STROKE[state]}
              strokeWidth="1.6"
            />
            <g transform={`translate(${center} 24)`}>
              <path
                className={state === 'now' ? 'pl-ico pl-ico-now' : 'pl-ico'}
                style={{ animationDelay: `-${index * ICON_STAGGER}s` }}
                d={shape}
                fill={outline ? 'none' : INK[state]}
                stroke={outline ? INK[state] : 'none'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <text
              x={center}
              y="56"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight={state === 'now' ? BOLD : REGULAR}
              fill={state === 'todo' ? '#8b967e' : '#26422f'}
              fontFamily={SANS}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type RuleProps = { kind: CaptureKind; fix: Fix | null; radiusM: number };

/** The ring's colour and reading for the accuracy of `fix` (none yet, good, too coarse). */
const readingOf = (fix: Fix | null): { tone: string; text: string; label: string } => {
  if (fix === null) {
    return { tone: '#b9cba6', text: 'Waiting for GPS', label: 'waiting for GPS' };
  }

  const good = fix.acc <= MAX_GPS_ACCURACY_M;
  const rounded = fix.acc.toFixed(0);

  return {
    tone: good ? '#6f9a58' : '#c98a5c',
    text: `±${rounded} m ${good ? '· good' : '· too coarse'}`,
    label: `accuracy ±${rounded} m, ${good ? 'good' : 'too coarse'}`,
  };
};

/** The location rule, live: the allowed zone, the target in it, your fix and its accuracy ring. */
export function RuleDiagram({ kind, fix, radiusM }: RuleProps) {
  const planting = kind === 'PLANTED';
  const { tone, text, label } = readingOf(fix);
  const ring =
    fix === null ? 0 : Math.min(RING_MAX, RING_MIN + (fix.acc / MAX_GPS_ACCURACY_M) * RING_SCALE);
  const rule = planting
    ? 'GPS must fall inside the campaign region'
    : `GPS must be within ${radiusM} m of the planting spot`;

  return (
    <svg className="pl-rule" viewBox="0 0 300 150" role="img" aria-label={`${rule}; ${label}`}>
      <rect x=".5" y=".5" width="299" height="149" rx="12" fill="#f6f9f1" stroke="#e3ebd7" />
      <circle cx="92" cy="75" r="58" fill="#e3efd8" stroke="#9fbb8c" strokeDasharray="4 4" />
      <g className="pl-live">
        {planting ? (
          <g transform="translate(92 80)">
            <path d="M0 0v-14" stroke="#4a7a43" strokeWidth="2.2" strokeLinecap="round" />
            <polygon points="0,-8 -9,-13 -6,-18" fill="#5ea158" />
            <polygon points="0,-11 10,-17 7,-21" fill="#3f844e" />
          </g>
        ) : (
          <g transform="translate(92 84) scale(.9)">
            <polygon points="0,-24 9,-8 -9,-8" fill="#6aab60" />
            <polygon points="0,-16 12,2 -12,2" fill="#3f844e" />
          </g>
        )}
      </g>
      {fix !== null && (
        <>
          <circle
            className="pl-acc"
            cx="104"
            cy="66"
            r={ring}
            fill={tone}
            fillOpacity=".14"
            stroke={tone}
            strokeWidth="1.4"
          />
          <circle
            className="pl-fix"
            cx="104"
            cy="66"
            r="4.5"
            fill={tone}
            stroke="#fff"
            strokeWidth="1.6"
          />
        </>
      )}
      <text x="168" y="44" fontSize="8" letterSpacing="1.4" fill="#7b8c6c" fontFamily={SANS}>
        {planting ? 'ALLOWED ZONE' : 'CHECK-IN RADIUS'}
      </text>
      <text x="168" y="62" fontSize="15" fill="#26422f" fontFamily="Georgia, serif">
        {planting ? 'Campaign region' : `${radiusM} m of the spot`}
      </text>
      <text x="168" y="92" fontSize="8" letterSpacing="1.4" fill="#7b8c6c" fontFamily={SANS}>
        YOUR ACCURACY
      </text>
      <text
        x="168"
        y="110"
        fontSize="15"
        fill={fix === null ? '#8b967e' : tone}
        fontFamily="Georgia, serif"
      >
        {text}
      </text>
      <text x="168" y="126" fontSize="8.5" fill="#8b967e" fontFamily={SANS}>
        needs ±{MAX_GPS_ACCURACY_M} m or better
      </text>
    </svg>
  );
}
