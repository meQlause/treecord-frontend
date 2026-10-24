// The art only S22 uses (mockup planter-pages.jsx:260-300): the signing key drawn as a card, and what the key proves drawn
// as a flow. Both loop through the motion gate (design-system §2.10). The card is informative: it names the key it shows.
import { gsap } from 'gsap';
import { useRef } from 'react';
import { useSceneLoop } from '../../shared/art/Scene';
import {
  CARD_NONE_ALGORITHM,
  CARD_NONE_LINE,
  CARD_READY,
  CARD_READY_LINE,
  DASH,
  FLOW_ACTIVE,
  FLOW_FOOT,
  FLOW_LABEL,
  FLOW_NEEDS,
  FLOW_STEPS,
  FLOW_TITLE,
  KEY_MISSING,
  KEY_NONE,
  KEY_READY,
  NO_KEY_LABEL,
  createdOn,
  keyLabel,
} from './device.copy';
import { cardLabel, createdDate, thumbprintLines } from './device.rules';

const SANS = 'Segoe UI, sans-serif';
const MONO = 'ui-monospace, Consolas, monospace';
const SWEEP_FROM = -180;
const SWEEP_TO = 520;
const FIRST_NODE = 50;
const STEP_PITCH = 80;
const NODE_X = FLOW_STEPS.map((_step, index) => FIRST_NODE + index * STEP_PITCH);
const LAST_STEP = FLOW_STEPS.length - 1;

export type CardKey = { thumbprint: string; label: string; createdAt: string };

type Look = {
  ready: boolean;
  title: string;
  dot: string;
  ink: string;
  soft: string;
  accent: string;
};

const READY_LOOK = {
  ready: true,
  dot: '#9fd08a',
  ink: '#f4f7ee',
  soft: '#dfe9c8',
  accent: '#9fd08a',
};
const IDLE_LOOK = { ready: false, ink: '#26422f', soft: '#8b967e', accent: '#8b967e' };

/** The colours and the title of the card: dark and green with a key, light and dashed without, amber when it was lost. */
const lookOf = (record: CardKey | null, lost: boolean): Look => {
  if (record !== null) {
    return { ...READY_LOOK, title: KEY_READY };
  }

  return { ...IDLE_LOOK, dot: lost ? '#c98a5c' : '#c3d1b5', title: lost ? KEY_MISSING : KEY_NONE };
};

function Backdrop({ ready }: { ready: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="kc-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={ready ? '#2f6b43' : '#fffef9'} />
          <stop offset="1" stopColor={ready ? '#153e2c' : '#f3f6ed'} />
        </linearGradient>
        <linearGradient id="kc-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="kc-clip">
          <rect width="340" height="200" rx="16" />
        </clipPath>
      </defs>
      <g clipPath="url(#kc-clip)">
        <rect width="340" height="200" fill="url(#kc-bg)" />
        {ready && (
          <rect
            className="kc-sweep"
            y="-40"
            width="110"
            height="280"
            fill="url(#kc-light)"
            transform="skewX(-18)"
          />
        )}
      </g>
      {!ready && (
        <rect
          x="8.5"
          y="8.5"
          width="323"
          height="183"
          rx="11"
          fill="none"
          stroke="#c3d1b5"
          strokeDasharray="4 4"
        />
      )}
    </>
  );
}

function Details({ record, look }: { record: CardKey | null; look: Look }) {
  const [first, second] = record === null ? ['', ''] : thumbprintLines(record.thumbprint);

  return (
    <>
      <text x="124" y="88" fontSize="20" fill={look.ink} fontFamily="Georgia, serif">
        {cardLabel(record?.label ?? '')}
      </text>
      <text x="124" y="106" fontSize="9" letterSpacing="1.4" fill={look.accent} fontFamily={SANS}>
        {look.ready ? CARD_READY_LINE : CARD_NONE_LINE}
      </text>
      {look.ready ? (
        <>
          <text x="26" y="142" fontSize="12" letterSpacing="1" fill="#f4f7ee" fontFamily={MONO}>
            {first}
          </text>
          <text x="26" y="160" fontSize="12" letterSpacing="1" fill="#f4f7ee" fontFamily={MONO}>
            {second}
          </text>
        </>
      ) : (
        <path d="M26 146H314" stroke="#e3ebd7" strokeDasharray="3 4" />
      )}
    </>
  );
}

type KeyCardProps = { record: CardKey | null; lost: boolean };

/** The dark card of a ready key, the light dashed one of no key, the amber dot of a key lost from this browser. */
export function KeyCard({ record, lost }: KeyCardProps) {
  const root = useRef<SVGSVGElement>(null);
  const look = lookOf(record, lost);

  useSceneLoop(
    root,
    (select) =>
      gsap
        .timeline({ repeat: -1, repeatDelay: 3 })
        .fromTo(
          select('.kc-sweep'),
          { x: SWEEP_FROM },
          { x: SWEEP_TO, duration: 1.4, ease: 'power2.inOut' },
        )
        .fromTo(
          select('.kc-key'),
          { rotation: 0 },
          {
            rotation: -18,
            svgOrigin: '52 92',
            duration: 0.35,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut',
          },
          '<0.5',
        ),
    [look.ready],
  );

  return (
    <svg
      ref={root}
      className="wc-card"
      viewBox="0 0 340 200"
      role="img"
      aria-label={record === null ? NO_KEY_LABEL : keyLabel(record.thumbprint, record.label)}
    >
      <Backdrop ready={look.ready} />
      <circle cx="28" cy="30" r="3.5" fill={look.dot} />
      <text
        x="38"
        y="33"
        fontSize="8.5"
        letterSpacing="1.8"
        fill={look.ready ? look.soft : '#7b8c6c'}
        fontFamily={SANS}
      >
        {look.title}
      </text>
      <g className="kc-key">
        <circle
          cx="52"
          cy="92"
          r="15"
          fill="none"
          stroke={look.ready ? '#e6c46e' : '#c3d1b5'}
          strokeWidth="6"
        />
        <path
          d="M67 92h34m-11 0v12m10-12v9"
          stroke={look.ready ? '#e6c46e' : '#c3d1b5'}
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <Details record={record} look={look} />
      <text x="26" y="184" fontSize="8.5" letterSpacing="1.6" fill={look.soft} fontFamily={SANS}>
        {record === null ? CARD_NONE_ALGORITHM : createdOn(createdDate(record.createdAt))}
      </text>
      <text
        x="314"
        y="184"
        textAnchor="end"
        fontSize="8.5"
        letterSpacing="1.6"
        fill={look.accent}
        fontFamily={SANS}
      >
        {look.ready ? CARD_READY : DASH}
      </text>
    </svg>
  );
}

const ICONS = [
  <g key="video">
    <rect x="-11" y="-8" width="16" height="16" rx="3" fill="#9db892" />
    <path d="M5-3l7-4v14l-7-4Z" fill="#6f9a58" />
  </g>,
  <text key="hash" y="4" textAnchor="middle" fontSize="11" fill="#3f6b35" fontFamily={MONO}>
    a3f9
  </text>,
  <g key="signed">
    <rect
      x="-9"
      y="-12"
      width="18"
      height="22"
      rx="2"
      fill="#fffef9"
      stroke="#6f9a58"
      strokeWidth="1.4"
    />
    <path d="M-5-5h10M-5 0h7" stroke="#b9cba6" strokeWidth="1.4" />
    <path
      d="M-6 6c3-4 5 2 8-1s3 1 4 0"
      fill="none"
      stroke="#2f6b43"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </g>,
  <g key="verified">
    <circle r="11" fill="#2E9E5B" />
    <path
      d="M-5 0l3.5 3.5 6.5-7"
      fill="none"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </g>,
];

/** A dot carries a recording along the four steps; each step lights as it arrives. */
export function ProofFlow({ ready }: { ready: boolean }) {
  const root = useRef<SVGSVGElement>(null);

  useSceneLoop(root, (select) => {
    const round = gsap
      .timeline({ repeat: -1, repeatDelay: 0.8 })
      .set(select('.pf-node'), { fill: '#fffef9' })
      .set(select('.pf-dot'), { x: 0, opacity: 0 })
      .to(select('.pf-dot'), { opacity: 1, duration: 0.2 });

    NODE_X.forEach((_node, step) => {
      round
        .to(select('.pf-node')[step] ?? [], { fill: '#e3f0da', duration: 0.2 })
        .fromTo(
          select('.pf-ico')[step] ?? [],
          { scale: 0.7 },
          { scale: 1, duration: 0.35, ease: 'back.out(3)', transformOrigin: '50% 50%' },
          '<',
        );

      if (step < LAST_STEP) {
        round.to(select('.pf-dot'), {
          x: (step + 1) * STEP_PITCH,
          duration: 0.7,
          ease: 'power1.inOut',
        });
      }
    });

    return round.to(select('.pf-dot'), { opacity: 0, duration: 0.2 }).to({}, { duration: 1.2 });
  });

  return (
    <svg
      ref={root}
      className="wc-card pf-flow"
      viewBox="0 0 340 200"
      role="img"
      aria-label={FLOW_LABEL}
    >
      <rect x=".5" y=".5" width="339" height="199" rx="16" fill="#fffef9" stroke="#d8e2cb" />
      <circle cx="28" cy="30" r="3.5" fill="#6f9a58" />
      <text x="38" y="33" fontSize="8.5" letterSpacing="1.8" fill="#7b8c6c" fontFamily={SANS}>
        {FLOW_TITLE}
      </text>
      <path d="M50 104H290" stroke="#e3ebd7" strokeWidth="3" />
      <path d="M50 104H290" stroke="#b9cba6" strokeWidth="1.4" strokeDasharray="3 5" />
      {FLOW_STEPS.map((label, step) => (
        <g key={label}>
          <circle
            className="pf-node"
            cx={NODE_X[step]}
            cy="104"
            r="24"
            fill="#fffef9"
            stroke="#b9cba6"
            strokeWidth="1.4"
          />
          <g className="pf-ico" transform={`translate(${NODE_X[step]} 104)`}>
            {ICONS[step]}
          </g>
          <text
            x={NODE_X[step]}
            y="148"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="1.2"
            fill="#5b7350"
            fontFamily={SANS}
          >
            {label}
          </text>
        </g>
      ))}
      <circle className="pf-dot" cx="50" cy="104" r="5" fill="#c49a3e" opacity="0" />
      <text x="26" y="184" fontSize="8.5" letterSpacing="1.6" fill="#7b8c6c" fontFamily={SANS}>
        {FLOW_FOOT}
      </text>
      <text
        x="314"
        y="184"
        textAnchor="end"
        fontSize="8.5"
        letterSpacing="1.6"
        fill="#6f9a58"
        fontFamily={SANS}
      >
        {ready ? FLOW_ACTIVE : FLOW_NEEDS}
      </text>
    </svg>
  );
}
