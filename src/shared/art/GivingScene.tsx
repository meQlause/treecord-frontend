import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useRef } from 'react';
import { useSceneLoop, type Build, type Selector } from './Scene';

gsap.registerPlugin(MotionPathPlugin);

// K22. Mockup donor.jsx:205-243. The overview as one card in two halves: each half is one scene with its numbers drawn
// in. Giving: coins leave your wallet for the campaign plots, then go on to the planters. Numbers count up once; the
// scene loops and follows the motion gate (design-system §2.10). Palette: §2.4.
const GOLD = '#c49a3e';
const SHADOW = '#153e2c';
const GROUND = '#dfe9d2';
const PATCH = '#c4d5b2';
const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });
const COUNT_SECONDS = 1.4;
const MAX_PLOTS = 5;
const PLOT_CENTER = 260;
const PLOT_GAP = 30;
const COLUMN_LEFT = 80;
const COLUMN_GAP = 180;
const EASE_FLY = 'power1.inOut';
const EASE_POP = 'back.out(3)';
const FAINT = 0.3;
const MIDDLE = 0.5;

/** A whole number with thousands separators, the way every figure of the donor overview is written. */
export const formatCount = (value: number): string => WHOLE.format(Math.round(value));

/** Counts the text of `element` up from 0 to `to` once. It ends on the figure React already rendered. */
export function countUp(
  element: Element | undefined,
  to: number,
  format: (value: number) => string,
): void {
  if (element === undefined) {
    return;
  }

  const counter = { value: 0 };

  gsap.to(counter, {
    value: to,
    duration: COUNT_SECONDS,
    ease: 'power2.out',
    onUpdate: () => {
      element.textContent = format(counter.value);
    },
  });
}

type FigureProps = { left: number; value: string; caption: string; className: string };

/** One big figure with its small caption under it. The figure's `className` is what `countUp` finds. */
export function Figure({ left, value, caption, className }: FigureProps) {
  return (
    <g className="dg-fig">
      <text
        className={className}
        x={left}
        y="182"
        textAnchor="middle"
        fontSize="30"
        fill="#26422f"
        fontFamily="Georgia, serif"
        letterSpacing="-.8"
      >
        {value}
      </text>
      <text
        x={left}
        y="200"
        textAnchor="middle"
        fontSize="10.5"
        letterSpacing="1.2"
        fill="#7b8c6c"
        fontFamily="Segoe UI, sans-serif"
      >
        {caption}
      </text>
    </g>
  );
}

function Coin({ className }: { className?: string }) {
  return (
    <g className={className}>
      <path d="M-15 0v5a15 4.8 0 0 0 30 0V0" fill={GOLD} />
      <ellipse rx="15" ry="4.8" fill="#e6c46e" />
      <ellipse rx="10" ry="3.1" fill="none" stroke="#c9a24c" strokeWidth=".8" />
    </g>
  );
}

const STACK = [{ top: 134 }, { top: 126 }, { top: 118 }, { top: 110 }, { top: 102 }];
const SPROUTS = [
  { left: 410, front: '0,-12 -12,-20 -9,-25', back: '0,-16 9,-22 6,-26' },
  { left: 440, front: '0,-12 12,-20 9,-25', back: '0,-16 -9,-22 -6,-26' },
  { left: 470, front: '0,-12 -12,-20 -9,-25', back: '0,-16 9,-22 6,-26' },
];
const PATH_LOOK = {
  fill: 'none',
  stroke: '#b9cba6',
  strokeWidth: '1.4',
  strokeDasharray: '3 5',
  strokeLinecap: 'round',
} as const;

/** Your wallet: a stack of coins. */
function Wallet() {
  return (
    <>
      <ellipse cx="80" cy="140" rx="26" ry="5" fill={SHADOW} opacity=".1" />
      {STACK.map(({ top }) => (
        <g key={top} transform={`translate(80 ${top})`}>
          <Coin />
        </g>
      ))}
    </>
  );
}

/** The campaigns: one marked plot each, with a pin that hops when the coin lands. */
function Plots({ count }: { count: number }) {
  return (
    <>
      <ellipse cx="260" cy="132" rx="70" ry="13" fill={PATCH} />
      {[...new Array<number>(count).keys()]
        .map((index) => PLOT_CENTER + (index - (count - 1) / 2) * PLOT_GAP)
        .map((left) => (
          <g key={left} transform={`translate(${left} 0)`}>
            <path d="M-11 130l11-5 11 5-11 5Z" fill="#a6bf93" />
            <g className="dg-plot-pin" transform="translate(0 122)">
              <path d="M0 0-5.5-8A6.4 6.4 0 1 1 5.5-8Z" fill="#2f6b43" />
              <circle cy="-12" r="2.2" fill="#f3f8ea" />
            </g>
          </g>
        ))}
    </>
  );
}

/** The planters: sprouts that take the payout. They stay faint until something has been paid. */
function Planters({ paid }: { paid: boolean }) {
  return (
    <>
      <ellipse cx="440" cy="134" rx="56" ry="11" fill={PATCH} />
      {SPROUTS.map(({ left, front, back }) => (
        <g key={left} transform={`translate(${left} 132)`} opacity={paid ? 1 : FAINT}>
          <g className="dg-sprout">
            <path d="M0 0v-18" stroke="#4a7a43" strokeWidth="2.2" strokeLinecap="round" />
            <polygon points={front} fill="#5ea158" />
            <polygon points={back} fill="#3f844e" />
          </g>
        </g>
      ))}
    </>
  );
}

/** A coin leaves one stop for the next along its dotted path: appears, flies, vanishes. */
function fly(timeline: gsap.core.Timeline, select: Selector, leg: 'a' | 'b', start: string) {
  const path = select(`.dg-path-${leg}`)[0];
  const coin = select(`.dg-coin-${leg}`);

  return timeline
    .to(coin, { opacity: 1, duration: 0.15 }, start)
    .to(
      coin,
      {
        duration: 1.3,
        ease: EASE_FLY,
        motionPath: {
          path: path as SVGPathElement,
          align: path as SVGPathElement,
          alignOrigin: [MIDDLE, MIDDLE],
        },
      },
      '<',
    )
    .to(coin, { opacity: 0, duration: 0.15 });
}

type Counts = {
  values: readonly [number, number, number];
  format: (value: number) => string;
};

const givingBuild =
  ({ values, format }: Counts): Build =>
  (select) => {
    values.forEach((value, index) =>
      countUp(select(`.dg-n${index}`)[0], value, index === 1 ? formatCount : format),
    );

    const timeline = gsap
      .timeline({ repeat: -1, repeatDelay: 0.4 })
      .set(select('.dg-coin'), { opacity: 0 });

    fly(timeline, select, 'a', '>').to(
      select('.dg-plot-pin'),
      { y: '-=7', duration: 0.2, stagger: 0.08, yoyo: true, repeat: 1, ease: 'power2.out' },
      '<',
    );

    // nothing paid to planters yet: the money stops at the campaigns
    if (values[2] > 0) {
      fly(timeline, select, 'b', '+=.2').fromTo(
        select('.dg-sprout'),
        { scaleY: 0.6 },
        { scaleY: 1, duration: 0.5, stagger: 0.08, ease: EASE_POP, transformOrigin: '50% 100%' },
        '<',
      );
    }

    return timeline.to({}, { duration: 1.2 });
  };

type GivingSceneProps = {
  /** Contributed, campaigns supported, paid to planters. */
  values: readonly [number, number, number];
  /** The small caption under each figure, in the same order. */
  captions: readonly [string, string, string];
  /** What the scene says to assistive tech (the figures in a sentence). */
  label: string;
  /** How many plots to draw, 1 to 5; the campaign count by default. */
  plots?: number;
  /** How the first and third figures are written; whole numbers by default. */
  format?: (value: number) => string;
};

/** K22. Informative art: `role="img"` with the caller's `label`. */
export function GivingScene({
  values,
  captions,
  label,
  plots = values[1],
  format = formatCount,
}: GivingSceneProps) {
  const root = useRef<SVGSVGElement>(null);
  const count = Math.max(1, Math.min(MAX_PLOTS, plots));

  useSceneLoop(root, givingBuild({ values, format }), [...values, count]);

  return (
    <svg ref={root} className="dg-art" viewBox="0 0 520 210" role="img" aria-label={label}>
      <polygon points="0,150 120,138 260,148 400,136 520,146 520,210 0,210" fill={GROUND} />
      <path className="dg-path-a" d="M80 98C130 40 210 40 260 92" {...PATH_LOOK} />
      <path className="dg-path-b" d="M260 92C310 40 390 40 440 98" {...PATH_LOOK} />
      <Wallet />
      <Plots count={count} />
      <Planters paid={values[2] > 0} />
      <g className="dg-coin dg-coin-a" opacity="0">
        <Coin />
      </g>
      <g className="dg-coin dg-coin-b" opacity="0">
        <Coin />
      </g>
      {values.map((value, index) => (
        <Figure
          key={`dg-n${index}`}
          left={COLUMN_LEFT + index * COLUMN_GAP}
          value={index === 1 ? formatCount(value) : format(value)}
          caption={captions[index] ?? ''}
          className={`dg-n${index}`}
        />
      ))}
    </svg>
  );
}
