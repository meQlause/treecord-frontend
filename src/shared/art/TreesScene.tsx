import { gsap } from 'gsap';
import { useRef } from 'react';
import { Figure, countUp, formatCount } from './GivingScene';
import { FacetTree } from './Glyph';
import { useSceneLoop, type Build, type Selector } from './Scene';

// K23. Mockup donor.jsx:245-270. The other half of the overview: the grove rises, the survival ring draws, the open
// flags wave. Numbers count up once; the scene loops and follows the motion gate (design-system §2.10).
const PATCH = '#c4d5b2';
const POLE = '#5E4030';
const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PERCENT = 100;
const MAX_FLAGS = 3;
const FLAG_CENTER = 436;
const FLAG_GAP = 30;
const POLE_DX = 6;
const TREE_DX = -8;
const COLUMN_LEFT = 80;
const COLUMN_GAP = 180;
const RING_AT = 0.3;
const FLAGS_AT = 0.6;
const FAINT_GROVE = 0.22;
const FAINT_FLAGS = 0.35;

const RING_TREE = { x: 260, y: 112, scale: 0.9 };
const FLAG_TREE = { y: 132, scale: 0.75 };
const GROVE = [
  { left: 24, top: 132, scale: 0.8 },
  { left: 48, top: 128, scale: 1 },
  { left: 72, top: 134, scale: 0.9 },
  { left: 96, top: 127, scale: 1.1 },
  { left: 120, top: 133, scale: 0.85 },
  { left: 140, top: 129, scale: 0.95 },
  { left: 62, top: 140, scale: 0.7 },
  { left: 108, top: 141, scale: 0.75 },
];

export type TreesTotals = {
  /** Trees planted across the donor's campaigns. */
  planted: number;
  /** Survival in percent, or `null` while there is nothing to measure. */
  survival: number | null;
  /** Open flags. */
  flags: number;
};

/** The grove: it grows in when trees are planted; with nothing planted it stays a faint outline of what is planned. */
function Grove({ planted }: { planted: boolean }) {
  return (
    <>
      <ellipse cx="80" cy="134" rx="78" ry="12" fill={PATCH} />
      {GROVE.map(({ left, top, scale }) =>
        planted ? (
          <FacetTree key={left} x={left} y={top} scale={scale} className="dg-grove" />
        ) : (
          <g key={left} opacity={FAINT_GROVE}>
            <FacetTree x={left} y={top} scale={scale} />
          </g>
        ),
      )}
    </>
  );
}

/** Survival: the ring around one tree. */
function SurvivalRing({ survival }: { survival: number }) {
  return (
    <>
      <circle cx="260" cy="96" r={RADIUS} fill="#fffef9" stroke="#e3ebd7" strokeWidth="7" />
      <circle
        className="dg-ring"
        cx="260"
        cy="96"
        r={RADIUS}
        fill="none"
        stroke="#6f9a58"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(CIRCUMFERENCE * survival) / PERCENT} ${CIRCUMFERENCE}`}
        transform="rotate(-90 260 96)"
      />
      <FacetTree {...RING_TREE} />
    </>
  );
}

/** Open flags on their trees: one to three, or one faint tree when there are none. */
function OpenFlags({ flags }: { flags: number }) {
  const shown = Math.max(flags, 1);

  return (
    <>
      <ellipse cx="440" cy="134" rx="56" ry="11" fill={PATCH} />
      {[...new Array<number>(shown).keys()].map((index) => {
        const left = FLAG_CENTER + (index - (shown - 1) / 2) * FLAG_GAP;

        return (
          <g key={left} opacity={flags > 0 ? 1 : FAINT_FLAGS}>
            <FacetTree x={left + TREE_DX} {...FLAG_TREE} />
            <g transform={`translate(${left} 0)`}>
              <path d="M6 134v-46" stroke={POLE} strokeWidth="2" strokeLinecap="round" />
              <path
                className="dg-flag"
                data-origin={`${left + POLE_DX} 89`}
                d="M7 89h20l-6 7 6 7h-20Z"
                fill="#c49a3e"
              />
            </g>
          </g>
        );
      })}
    </>
  );
}

/** Counts the three figures up once, and pins each flag's pivot to its pole so it waves from there. */
function start(select: Selector, { planted, survival, flags }: TreesTotals): void {
  countUp(select('.dg-n0')[0], planted, formatCount);

  if (survival !== null) {
    countUp(select('.dg-n1')[0], survival, (value) => `${value.toFixed(1)}%`);
  }

  countUp(select('.dg-n2')[0], flags, formatCount);

  select('.dg-flag').forEach((flag) => {
    gsap.set(flag, { svgOrigin: (flag as SVGElement).dataset['origin'] ?? '' });
  });
}

const treesBuild =
  (totals: TreesTotals): Build =>
  (select) => {
    const { planted, survival, flags } = totals;
    const share = (CIRCUMFERENCE * (survival ?? 0)) / PERCENT;

    start(select, totals);

    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });

    // nothing planted yet: the grove stays a faint outline of what's planned, nothing grows or waves
    if (planted > 0) {
      timeline.fromTo(
        select('.dg-grove'),
        { scaleY: 0, opacity: 0, transformOrigin: '50% 100%' },
        { scaleY: 1, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(2)' },
      );
    }

    timeline
      .fromTo(
        select('.dg-ring'),
        { strokeDasharray: `0 ${CIRCUMFERENCE}` },
        { strokeDasharray: `${share} ${CIRCUMFERENCE}`, duration: 1.2, ease: 'power2.inOut' },
        RING_AT,
      )
      .to({}, { duration: 1.6 });

    if (flags > 0) {
      timeline.to(
        select('.dg-flag'),
        { skewY: -8, duration: 0.35, yoyo: true, repeat: 5, ease: 'sine.inOut', stagger: 0.12 },
        FLAGS_AT,
      );
    }

    if (planted > 0) {
      timeline.to(select('.dg-grove'), { opacity: 0, duration: 0.4, stagger: 0.03 });
    }

    return timeline;
  };

type TreesSceneProps = {
  totals: TreesTotals;
  /** The small caption under each figure: planted, survival, open flags. */
  captions: readonly [string, string, string];
  /** What the scene says to assistive tech (the figures in a sentence). */
  label: string;
};

/** K23. Informative art: `role="img"` with the caller's `label`. */
export function TreesScene({ totals, captions, label }: TreesSceneProps) {
  const root = useRef<SVGSVGElement>(null);
  const flags = Math.min(MAX_FLAGS, totals.flags);
  const survival = totals.survival ?? 0;
  const figures = [
    formatCount(totals.planted),
    totals.survival === null ? '—' : `${survival}%`,
    formatCount(totals.flags),
  ];

  useSceneLoop(root, treesBuild(totals), [totals.planted, totals.survival, totals.flags]);

  return (
    <svg ref={root} className="dg-art" viewBox="0 0 520 210" role="img" aria-label={label}>
      <polygon points="0,150 120,138 260,148 400,136 520,146 520,210 0,210" fill="#dfe9d2" />
      <Grove planted={totals.planted > 0} />
      <SurvivalRing survival={survival} />
      <OpenFlags flags={flags} />
      {figures.map((value, index) => (
        <Figure
          key={`dg-n${index}`}
          left={COLUMN_LEFT + index * COLUMN_GAP}
          value={value}
          caption={captions[index] ?? ''}
          className={`dg-n${index}`}
        />
      ))}
    </svg>
  );
}
