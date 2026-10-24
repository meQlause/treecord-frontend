// The auditor's pictures (audit-pages.jsx:29-99), shared by S10, S23, S24 and S26. Decorative: the heading beside each one
// names what it shows. The GSAP loops go through `Scene` / `useSceneLoop`, so Pause motion, reduced motion and off screen
// stop them; the CSS loops (ripple, sway) stop with the motion gate too.
import { gsap } from 'gsap';
import { useRef } from 'react';
import { Glyph } from '../../shared/art/Glyph';
import { Scene, useSceneLoop, type Selector } from '../../shared/art/Scene';
import * as copy from './audit.copy';
import { drawnOf, previewOf } from './audit.rules';

const SHOWN_PER_ROW = 7;
const ROW_TOP = 150;
const ROW_BOTTOM = 198;
const ROW_Y = [ROW_TOP, ROW_BOTTOM] as const;
const HEAD_CHARS = 6;
const TAIL_CHARS = 4;
const DIMMED = 0.45;
const COLUMN_X = 178;
const COLUMN_STEP = 42;
const LIFT = -12;
const GOLD = '#c49a3e';
const MONO = 'ui-monospace, Consolas, monospace';
const SANS = 'Segoe UI, sans-serif';

const slotOf = (index: number): [number, number] => [
  COLUMN_X + (index % SHOWN_PER_ROW) * COLUMN_STEP,
  ROW_Y[index < SHOWN_PER_ROW ? 0 : 1],
];

/** The block's hash scans the population; the sampled trees lift out of it, one by one, in sample order. */
const sampleLoop = (select: Selector): gsap.core.Timeline => {
  const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
  const rings = select('.sa-ring');

  timeline
    .set(rings, { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' })
    .set(select('.sa-lift'), { y: 0 })
    .fromTo(
      select('.sa-scan'),
      { x: 0, opacity: 0 },
      { x: 300, opacity: 0.9, duration: 1.4, ease: 'power1.inOut' },
    )
    .to(select('.sa-scan'), { opacity: 0, duration: 0.2 });
  select('.sa-lift').forEach((lifted, index) => {
    timeline.to(lifted, { y: LIFT, duration: 0.35, ease: 'back.out(3)' });

    const ring = rings[index];

    if (ring !== undefined) {
      timeline.to(ring, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, '<');
    }
  });

  return timeline
    .to({}, { duration: 1.8 })
    .to(select('.sa-lift'), { y: 0, duration: 0.3 })
    .to(rings, { opacity: 0, duration: 0.3 }, '<');
};

type SampleArtProps = {
  population: readonly string[];
  samples: readonly string[];
  blockHash: string | null;
};

export function SampleArt({ population, samples, blockHash }: SampleArtProps) {
  const shown = drawnOf(population);
  const picks = samples.filter((tree) => shown.includes(tree));
  const label =
    blockHash === null
      ? '0x…'
      : `${blockHash.slice(0, HEAD_CHARS)}…${blockHash.slice(-TAIL_CHARS)}`;

  return (
    <Scene build={sampleLoop} deps={[population.join(), samples.join()]}>
      <g transform="translate(78 132)">
        <polygon points="0,-34 34,-17 0,0 -34,-17" fill="#5a9663" />
        <polygon points="-34,-17 0,0 0,38 -34,21" fill="#2f6b43" />
        <polygon points="0,0 34,-17 34,21 0,38" fill="#24563a" />
        <rect x="-44" y="48" width="88" height="20" rx="10" fill="#fffef9" stroke="#d6e0ca" />
        <text y="62" textAnchor="middle" fontSize="8.5" fill="#3f6b35" fontFamily={MONO}>
          {label}
        </text>
      </g>
      <path
        d="M116 120C140 108 152 128 166 120"
        fill="none"
        stroke="#9db58a"
        strokeWidth="1.4"
        strokeDasharray="3 5"
      />
      <rect
        className="sa-scan"
        x="160"
        y="104"
        width="6"
        height="110"
        rx="3"
        fill="#e6c46e"
        opacity="0"
      />
      {shown.map((tree, index) => {
        const [left, top] = slotOf(index);
        const picked = picks.indexOf(tree) >= 0;

        return (
          <g key={tree}>
            {picked && (
              <ellipse
                className="sa-ring"
                cx={left}
                cy={top + 1}
                rx="17"
                ry="5"
                fill="none"
                stroke={GOLD}
                strokeWidth="2"
              />
            )}
            <g className={picked ? 'sa-lift' : undefined} opacity={picked ? 1 : DIMMED}>
              <Glyph kind="alive" x={left} y={top} scale={1.15} />
            </g>
          </g>
        );
      })}
      {population.length > shown.length && (
        <text x="452" y="222" textAnchor="end" fontSize="9" fill="#6f8462" fontFamily={SANS}>
          +{population.length - shown.length} more
        </text>
      )}
    </Scene>
  );
}

const NODE_FIRST = 60;
const NODE_COUNT = 4;
const NODE_Y = 96;
const NODE_STEP = 130;
const NODE_X = Array.from({ length: NODE_COUNT }, (_gap, slot) => NODE_FIRST + slot * NODE_STEP);

/** The dot travels block hash → seed → shuffle → sample, each node lighting as it arrives. */
const flowLoop = (select: Selector): gsap.core.Timeline => {
  const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
  const dot = select('.fa-dot');

  timeline
    .set(dot, { x: 0, opacity: 0 })
    .set(select('.fa-node'), { fill: '#fffef9' })
    .to(dot, { opacity: 1, duration: 0.2 });
  NODE_X.forEach((_node, index) => {
    const node = select('.fa-node')[index];
    const icon = select('.fa-ico')[index];

    if (node !== undefined && icon !== undefined) {
      timeline
        .to(node, { fill: '#e3efd8', duration: 0.2 })
        .fromTo(
          icon,
          { scale: 0.7 },
          { scale: 1, duration: 0.35, ease: 'back.out(3)', transformOrigin: '50% 50%' },
          '<',
        );
    }

    if (index < NODE_X.length - 1) {
      timeline.to(dot, { x: (index + 1) * NODE_STEP, duration: 0.7, ease: 'power1.inOut' });
    }
  });

  return timeline.to(dot, { opacity: 0, duration: 0.2 }).to({}, { duration: 1.2 });
};

const FLOW_ICONS = [
  <g key="b">
    <polygon points="0,-12 12,-6 0,0 -12,-6" fill="#5a9663" />
    <polygon points="-12,-6 0,0 0,13 -12,7" fill="#2f6b43" />
    <polygon points="0,0 12,-6 12,7 0,13" fill="#24563a" />
  </g>,
  <text key="s" y="4" textAnchor="middle" fontSize="11" fill="#3f6b35" fontFamily={MONO}>
    0x9f…
  </text>,
  <g key="x" fill="none" stroke="#2f6b43" strokeWidth="2" strokeLinecap="round">
    <path d="M-11-6h6l10 12h6M-11 6h6l10-12h6" />
    <path d="M8-9l3 3-3 3M8 3l3 3-3 3" />
  </g>,
  <g key="t">
    <Glyph kind="alive" x={-7} y={9} scale={0.8} />
    <Glyph kind="alive" x={7} y={9} scale={0.8} />
  </g>,
];

/** How the sample is drawn: block hash → keccak → seed → seeded shuffle → sample. */
export function FlowArt() {
  const root = useRef<SVGSVGElement>(null);

  useSceneLoop(root, flowLoop);

  return (
    <svg
      ref={root}
      className="dg-art au-flow"
      viewBox="0 0 520 210"
      role="img"
      aria-label={copy.FLOW_ARIA}
    >
      <polygon points="0,150 120,138 260,148 400,136 520,146 520,210 0,210" fill="#dfe9d2" />
      <path d="M60 96H450" stroke="#cbd9bb" strokeWidth="3" />
      <path d="M60 96H450" stroke="#9db58a" strokeWidth="1.4" strokeDasharray="3 5" />
      {NODE_X.map((nodeX, index) => (
        <g key={copy.FLOW_LABELS[index]}>
          <circle
            className="fa-node"
            cx={nodeX}
            cy={NODE_Y}
            r="30"
            fill="#fffef9"
            stroke="#b9cba6"
            strokeWidth="1.4"
          />
          <g className="fa-ico" transform={`translate(${nodeX} ${NODE_Y})`}>
            {FLOW_ICONS[index]}
          </g>
          <text
            x={nodeX}
            y="148"
            textAnchor="middle"
            fontSize="10.5"
            letterSpacing="1.2"
            fill="#5b7350"
            fontFamily={SANS}
          >
            {copy.FLOW_LABELS[index]}
          </text>
        </g>
      ))}
      <circle className="fa-dot" cx="60" cy={NODE_Y} r="6" fill={GOLD} opacity="0" />
      <text x="260" y="190" textAnchor="middle" fontSize="10" fill="#7b8c6c" fontFamily={SANS}>
        {copy.FLOW_CAPTION}
      </text>
    </svg>
  );
}

type PopulationProps = { population: readonly string[]; samples: readonly string[] };

const CARD_COLUMNS = 7;
const CARD_COLUMN_STEP = 38;
const CARD_ROW_STEP = 40;
const CARD_LEFT = 46;
const CARD_BOTTOM = 118;
const CARD_ROW_LIFT = 20;
const RIPPLE_STEP = 0.6;
const SPARSE = 0.35;
const LABEL_DROP = 16;

/** A session on its card: the population as trees, the sample picked out in gold and numbered by position. */
export function PopulationArt({ population, samples }: PopulationProps) {
  const shown = previewOf(population.length === 0 ? samples : population);
  const rows = Math.ceil(shown.length / CARD_COLUMNS);

  return (
    <svg
      className="landscape"
      viewBox="0 0 320 184"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="320" height="184" fill="#e9f0de" />
      <polygon points="0,150 90,140 180,148 260,138 320,144 320,184 0,184" fill="#cddbbd" />
      {shown.map((tree, index) => {
        const posX = CARD_LEFT + (index % CARD_COLUMNS) * CARD_COLUMN_STEP;
        const posY =
          CARD_BOTTOM -
          (rows - 1) * CARD_ROW_LIFT +
          Math.floor(index / CARD_COLUMNS) * CARD_ROW_STEP;
        const order = samples.indexOf(tree);

        return (
          <g key={tree}>
            {order >= 0 && (
              <ellipse
                className="pl-ripple"
                style={{ animationDelay: `-${order * RIPPLE_STEP}s` }}
                cx={posX}
                cy={posY + 1}
                rx="15"
                ry="4.5"
                fill="none"
                stroke={GOLD}
                strokeWidth="1.6"
              />
            )}
            <g className={order >= 0 ? 'pl-sway' : undefined} opacity={order >= 0 ? 1 : SPARSE}>
              <Glyph kind="alive" x={posX} y={posY} />
            </g>
            {order >= 0 && (
              <text
                x={posX}
                y={posY + LABEL_DROP}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill="#a07a2e"
                fontFamily={SANS}
              >
                {order + 1}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type RingProps = { ok: number; issue: number; followup: number; size: number };

const PARTS = [
  ['ok', '#6f9a58'],
  ['issue', '#c26a4a'],
  ['followup', '#c49a3e'],
] as const;

/** The findings as a ring: ok / issue / follow-up. */
export function FindingRing({ ok, issue, followup, size }: RingProps) {
  const counts = { ok, issue, followup };
  const lengths = PARTS.map(([name]) => (counts[name] / Math.max(1, size)) * CIRCUMFERENCE);
  const offsets = lengths.map((_length, index) =>
    lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
  );

  return (
    <svg
      className="au-ring"
      viewBox="0 0 120 120"
      role="img"
      aria-label={copy.ringLabel(ok, issue, followup)}
    >
      <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#e3ebd7" strokeWidth="12" />
      {PARTS.map(([name, color], index) => {
        const length = lengths[index] ?? 0;

        return (
          <circle
            key={name}
            className="pl-gauge"
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={`${length} ${CIRCUMFERENCE}`}
            strokeDashoffset={-(offsets[index] ?? 0)}
            transform="rotate(-90 60 60)"
          />
        );
      })}
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontSize="22"
        fill="#26422f"
        fontFamily="Georgia, serif"
      >
        {size}
      </text>
      <text
        x="60"
        y="74"
        textAnchor="middle"
        fontSize="8"
        letterSpacing="1.2"
        fill="#7b8c6c"
        fontFamily={SANS}
      >
        {copy.RING_UNIT}
      </text>
    </svg>
  );
}
