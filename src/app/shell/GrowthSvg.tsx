/* eslint-disable no-magic-numbers -- SVG coordinates of the sidebar art, ported from shell.jsx:88 */
import { MILESTONES, VIEW_WIDTH, type Geometry } from './growth-geometry';

// Palette: design-system §2.4 (art only). GSAP draws these shapes (growth-loop.ts) through their `ga-*` classes.
const GOLD = '#c49a3e';
const LINE = '#cbd9bb';
const GREEN = '#6f9a58';
const BARK = '#7a573d';
const STONE = '#b8a47e';
const PANEL = '#5d8a6a';
const STEEL = '#5a7749';
// a path hidden by its dash offset; GSAP draws it by taking the offset to 0
const DASH = { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 };
const PEBBLES = [
  { cx: 30, cy: 26, r: 2.4 },
  { cx: 70, cy: 42, r: 1.8 },
  { cx: 160, cy: 22, r: 2.2 },
  { cx: 150, cy: 44, r: 1.6 },
];

// GPS satellite, top right, clear of the words
function Satellite({ geo }: { geo: Geometry }) {
  return (
    <g transform={`translate(${geo.satellite.x} ${geo.satellite.y}) rotate(-24)`}>
      <g className="ga-sat">
        <rect x="-19" y="-3.5" width="12" height="7" rx="1" fill={PANEL} />
        <rect x="7" y="-3.5" width="12" height="7" rx="1" fill={PANEL} />
        <path d="M-13 -3.5v7M13 -3.5v7M-7 0h-12M7 0h12" stroke="#e9efe0" strokeWidth=".6" />
        <rect
          x="-5"
          y="-4.5"
          width="10"
          height="9"
          rx="2"
          fill="#f4f7ee"
          stroke={STEEL}
          strokeWidth="1.2"
        />
        <path d="M0 4.5v3.5" stroke={STEEL} strokeWidth="1.2" strokeLinecap="round" />
        <circle cy="9" r="1.6" fill={GOLD} />
      </g>
    </g>
  );
}

// 36-month ruler: each tick sits where the tree's tip is at that month; the satellite pings the tip with a beam
function Ruler({ geo }: { geo: Geometry }) {
  const { ground, top, rulerX, trunkX, satellite, tips } = geo;

  return (
    <>
      {MILESTONES.map(({ month }, index) => (
        <line
          key={`beam-${month}`}
          className="ga-beam"
          x1={satellite.x + 3.5}
          y1={satellite.y + 8}
          x2={trunkX}
          y2={(tips[index] ?? ground) - 2}
          stroke={GOLD}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0"
          {...DASH}
        />
      ))}
      <line
        x1={rulerX}
        y1={ground}
        x2={rulerX}
        y2={top}
        stroke={LINE}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g className="ga-life">
        <line
          className="ga-prog"
          x1={rulerX}
          y1={ground}
          x2={rulerX}
          y2={top}
          stroke={GREEN}
          strokeWidth="2"
          strokeLinecap="round"
          {...DASH}
        />
      </g>
      {MILESTONES.map(({ month }, index) => (
        <g key={month}>
          <circle
            className="ga-tick"
            cx={rulerX}
            cy={tips[index]}
            r="3.6"
            fill="#f6f9f1"
            stroke="#b9cba6"
            strokeWidth="1.2"
          />
          <text
            className="ga-lab"
            x={rulerX + 9}
            y={(tips[index] ?? ground) + 2.6}
            fontSize="7.5"
            fontWeight="600"
            letterSpacing=".4"
            fill="#9aa88c"
            fontFamily="Segoe UI, sans-serif"
          >
            M{month}
          </text>
          <line
            x1={rulerX + 30}
            x2={trunkX - 8}
            y1={tips[index]}
            y2={tips[index]}
            stroke={LINE}
            strokeWidth=".7"
            strokeDasharray="1.5 3"
          />
        </g>
      ))}
    </>
  );
}

const rootPaths = (left: number, base: number): string[] => [
  `M${left} ${base}C${left - 2} ${base + 12} ${left - 18} ${base + 15} ${left - 32} ${base + 30}`,
  `M${left} ${base}C${left + 1} ${base + 14} ${left + 5} ${base + 26} ${left + 1} ${base + 42}`,
  `M${left} ${base}C${left + 3} ${base + 9} ${left + 20} ${base + 13} ${left + 34} ${base + 24}`,
  `M${left - 12} ${base + 13}c-6 4-8 10-7 16`,
  `M${left + 16} ${base + 12}c4 5 5 11 3 16`,
];

// ground in cross-section: soil, strata, pebbles, the grass edge, the roots
function Ground({ geo }: { geo: Geometry }) {
  const { ground, height, trunkX } = geo;

  return (
    <>
      <rect y={ground + 1} width={VIEW_WIDTH} height={height - ground} fill="url(#ga-soil)" />
      <path
        d={`M0 ${ground + 18}h185M0 ${ground + 34}h185`}
        stroke="#bba882"
        strokeWidth=".8"
        strokeDasharray="2 5"
        opacity=".7"
      />
      {PEBBLES.map(({ cx, cy, r }) => (
        <ellipse key={cx} cx={cx} cy={ground + cy} rx={r * 1.4} ry={r} fill={STONE} />
      ))}
      <path
        d={`M0 ${ground + 3}Q46 ${ground - 4} 92 ${ground + 1}T185 ${ground}V${ground + 5}H0Z`}
        fill="#9fbb8c"
      />
      <g className="ga-life" fill="none" stroke={BARK} strokeLinecap="round">
        {rootPaths(trunkX, ground).map((path, index) => (
          <path
            key={path}
            className="ga-root"
            d={path}
            strokeWidth={index < 3 ? 1.8 : 1.1}
            {...DASH}
          />
        ))}
      </g>
    </>
  );
}

// the seed lands, the tree grows tier by tier, the ring marks each milestone, the verified badge pops at M36
function Tree({ geo }: { geo: Geometry }) {
  const { ground, span, trunkX, top, badge, tiers } = geo;
  const trunk = 0.2 * span;

  return (
    <>
      <circle className="ga-seed" cx={trunkX} cy={top - 4} r="3.4" fill="#8B5E3C" opacity="0" />
      <g className="ga-life">
        <g className="ga-tree" opacity="0">
          <rect x={trunkX - 4} y={ground - trunk} width="4" height={trunk} fill="#5E4030" />
          <rect x={trunkX} y={ground - trunk} width="4" height={trunk} fill="#8B5E3C" />
          {tiers.map(({ left, right, fill }) => (
            <g key={left}>
              <polygon
                points={left}
                fill={fill.left}
                stroke={fill.left}
                strokeWidth=".6"
                strokeLinejoin="round"
              />
              <polygon
                points={right}
                fill={fill.right}
                stroke={fill.right}
                strokeWidth=".6"
                strokeLinejoin="round"
              />
            </g>
          ))}
        </g>
        <circle
          className="ga-ring"
          cx={trunkX}
          cy={ground}
          r="2"
          fill="none"
          stroke={GOLD}
          strokeWidth="1.4"
          opacity="0"
        />
        <g className="ga-badge" opacity="0">
          <circle
            cx={badge.x}
            cy={badge.y}
            r="10"
            fill="#2E9E5B"
            stroke="#eef3e6"
            strokeWidth="2.4"
          />
          <path
            className="ga-check"
            d={`M${badge.x - 4.5} ${badge.y}l3 3 5.5-6`}
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...DASH}
          />
        </g>
      </g>
    </>
  );
}

export function GrowthSvg({ geo }: { geo: Geometry }) {
  return (
    <svg className="growth-art" viewBox={`0 0 ${VIEW_WIDTH} ${geo.height}`} aria-hidden="true">
      <defs>
        <linearGradient id="ga-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ddd1b8" />
          <stop offset="1" stopColor="#cbb995" />
        </linearGradient>
      </defs>
      <Satellite geo={geo} />
      <Ruler geo={geo} />
      <Ground geo={geo} />
      <Tree geo={geo} />
    </svg>
  );
}

/* eslint-enable no-magic-numbers */
