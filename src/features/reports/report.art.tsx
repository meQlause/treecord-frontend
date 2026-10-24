// The art only S06 uses (design-system §4.5): the heading scene, the small empty-state scenes and the milestone bars.
// Mockup report.jsx:53-103 and donor.jsx:325-396 (`StatArt`, kinds payout, carbon and evidence).
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { Glyph } from '../../shared/art/Glyph';
import { useRise } from '../../shared/ui/useRise';
import { BARS_CAPTION, UPCOMING, barRow, barsLabel, paidCount } from './report.copy';
import { MILESTONE_MONTHS } from './report.rules';

// ---- the heading scene ----
const SHEET_BARS = [
  { x: 300, height: 34, fill: '#a9c199' },
  { x: 322, height: 52, fill: '#7fae6d' },
  { x: 344, height: 44, fill: '#5ea158' },
  { x: 366, height: 70, fill: '#3f8549' },
];
const SHEET_BASE = 150;
const BAR_DELAY = 0.12;
const DATA_DELAY = -1.1;
const DATA_DOTS = [0, 1, 2];

const delay = (seconds: number): CSSProperties => ({ '--d': `${seconds}s` }) as CSSProperties;

function Sheet() {
  return (
    <g className="rp-sheet">
      <rect
        x="270"
        y="30"
        width="150"
        height="176"
        rx="8"
        fill="#153e2c"
        opacity=".1"
        transform="translate(4 6)"
      />
      <rect x="270" y="30" width="150" height="176" rx="8" fill="#fffef9" />
      <polygon points="398,30 420,52 398,52" fill="#e3ebd7" />
      <rect x="286" y="46" width="70" height="7" rx="3.5" fill="#26422f" opacity=".85" />
      <rect x="286" y="60" width="48" height="5" rx="2.5" fill="#c3d1b5" />
      <path d="M288 150H404" stroke="#e3ebd7" strokeWidth="1.2" />
      {SHEET_BARS.map(({ x, height, fill }, index) => (
        <rect
          key={x}
          className="rp-bar"
          x={x}
          y={SHEET_BASE - height}
          width="16"
          height={height}
          rx="2"
          fill={fill}
          style={delay(index * BAR_DELAY)}
        />
      ))}
      <path
        className="rp-trend"
        d="M296 124L318 104 340 112 362 82 384 74"
        fill="none"
        stroke="#c49a3e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
      />
      <rect x="286" y="164" width="96" height="5" rx="2.5" fill="#d6e0ca" />
      <rect x="286" y="176" width="70" height="5" rx="2.5" fill="#d6e0ca" />
      <g className="rp-seal" transform="translate(396 182)">
        <circle r="17" fill="#2E9E5B" />
        <circle r="12.5" fill="none" stroke="#bfe5c9" strokeWidth="1" strokeDasharray="2 2" />
        <path
          d="M-6 0l4 4 8-9"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

/** The report, drawn: a faceted tree sends its data into a report sheet whose bars grow and a seal lands. */
export function ReportArt() {
  return (
    <svg
      className="landscape report-art"
      viewBox="0 0 480 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2e6" />
          <stop offset="1" stopColor="#dde7d2" />
        </linearGradient>
      </defs>
      <rect width="480" height="240" fill="url(#rp-sky)" />
      <polygon
        points="0,194 70,178 150,190 230,176 300,188 380,174 480,184 480,240 0,240"
        fill="#c4d4b3"
      />
      <polygon points="0,194 70,178 110,214 0,240" fill="#b5c8a3" />
      <polygon points="150,190 230,176 210,226" fill="#b8cba6" />
      <polygon points="0,218 120,206 250,220 380,208 480,216 480,240 0,240" fill="#9db892" />
      <ellipse cx="128" cy="204" rx="46" ry="6" fill="#153e2c" opacity=".12" />
      <g transform="translate(56 60) scale(2.25)">
        <g className="ca-tree">
          <polygon points="32,5 44,25 20,25" fill="#5ea158" />
          <polygon points="20,25 32,45 8,45" fill="#24623c" />
          <polygon points="44,25 56,45 32,45" fill="#4a8b4e" />
          <polygon points="20,25 44,25 32,45" fill="#25633d" />
          <polygon points="29,45 32,45 32,57 29,57" fill="#5E4030" />
          <polygon points="32,45 35,45 35,57 32,57" fill="#8B5E3C" />
        </g>
      </g>
      <path
        d="M176 112C204 84 224 128 262 100"
        fill="none"
        stroke="#7f9d6f"
        strokeWidth="1.3"
        strokeDasharray="2 5"
        strokeLinecap="round"
      />
      {DATA_DOTS.map((dot) => (
        <circle
          key={dot}
          className="rp-data"
          r="3"
          fill="#3f7a4d"
          style={delay(dot * DATA_DELAY)}
        />
      ))}
      <Sheet />
    </svg>
  );
}

// ---- the empty-state scenes ----
export type StatKind = 'payout' | 'carbon' | 'evidence';

const GROUND = <path d="M6 70Q70 62 134 68V80H6Z" fill="#e3ebd7" />;
const PIN = 'M0 0-4.5-6.5A5.3 5.3 0 1 1 4.5-6.5Z';

function FacetTree({ x, y, scale }: { x: string; y: string; scale: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <polygon points="0,-30 8,-16 -8,-16" fill="#5ea158" />
      <polygon points="-8,-16 0,-3 -16,-3" fill="#24623c" />
      <polygon points="8,-16 16,-3 0,-3" fill="#4a8b4e" />
      <polygon points="-8,-16 8,-16 0,-3" fill="#25633d" />
      <rect x="-1.6" y="-3" width="3.2" height="7" fill="#7a5a40" />
    </g>
  );
}

function Coin({ x, y, className }: { x: string; y: string; className?: string }) {
  return (
    <g className={className} transform={`translate(${x} ${y})`}>
      <path d="M-15 0v5a15 5 0 0 0 30 0V0" fill="#c49a3e" />
      <ellipse rx="15" ry="5" fill="#e6c46e" />
      <ellipse rx="10" ry="3.2" fill="none" stroke="#c9a24c" strokeWidth=".8" />
    </g>
  );
}

const SCENES: Record<StatKind, ReactNode> = {
  payout: (
    <>
      {GROUND}
      <Coin x="30" y="62" />
      <Coin x="30" y="55" />
      <path
        d="M38 46C60 10 92 12 110 44"
        fill="none"
        stroke="#b8c9a6"
        strokeWidth="1.2"
        strokeDasharray="2 4"
        strokeLinecap="round"
      />
      <g className="sa-fly">
        <ellipse rx="7" ry="7" fill="#e6c46e" stroke="#c49a3e" strokeWidth="1.2" />
        <path
          d="M0-3.5v7M-2.2-1.5a2.2 1.6 0 0 1 4.4 0"
          stroke="#8a6a27"
          strokeWidth="1"
          fill="none"
        />
      </g>
      <g className="sa-sprout" transform="translate(110 66)">
        <path d="M0 0v-16" stroke="#4a7a43" strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="0,-10 -10,-15 -6,-20" fill="#5ea158" />
        <polygon points="0,-14 10,-20 7,-25" fill="#4a8b4e" />
      </g>
    </>
  ),
  carbon: (
    <>
      {GROUND}
      <FacetTree x="40" y="66" scale="1" />
      <g className="sa-co2">
        <circle cx="-6" r="3.2" fill="#b7c4ad" />
        <circle cx="6" r="3.2" fill="#b7c4ad" />
        <circle r="4.4" fill="#66765f" />
      </g>
      <Coin x="104" y="54" className="sa-coin-wait" />
      <Coin x="104" y="46" className="sa-coin-wait" />
    </>
  ),
  evidence: (
    <>
      {GROUND}
      <FacetTree x="42" y="66" scale="0.9" />
      <g transform="translate(88 8)">
        <rect width="34" height="60" rx="6" fill="#26422f" />
        <rect x="3" y="7" width="28" height="44" rx="2" fill="#dfe9d2" />
        <FacetTree x="17" y="44" scale="0.6" />
        <rect className="sa-scan" x="3" y="7" width="28" height="3" fill="#6f9a58" opacity=".7" />
        <circle cx="17" cy="56" r="2.2" fill="#6f8462" />
      </g>
      <g className="sa-gps" transform="translate(66 30)">
        <path d={PIN} fill="#2f6b43" />
        <circle cy="-9.6" r="1.8" fill="#f3f8ea" />
      </g>
      <circle
        className="sa-gps-ring"
        cx="66"
        cy="30"
        r="6"
        fill="none"
        stroke="#6f9a58"
        strokeWidth="1.2"
      />
    </>
  ),
};

/** One small faceted scene for an empty section, drawn from what is missing (donor.jsx `StatArt`). */
export function StatArt({ kind }: { kind: StatKind }) {
  return (
    <svg className={`stat-art stat-art--${kind}`} viewBox="0 0 140 80" aria-hidden="true">
      {SCENES[kind]}
    </svg>
  );
}

// ---- payouts by milestone ----
export type BarRow = { month: number; payouts: number; amount: string; value: number };

const COLUMN_X = 40;
const COLUMN_GAP = 68;
const BASE_Y = 118;
const MIN_BAR = 16;
const BAR_RANGE = 66;
const HALF_BAR = 14;
const TREE_LIFT = 4;
const AMOUNT_LIFT = 30;

type ColumnProps = { row: BarRow | undefined; month: number; index: number; max: number };

function Column({ row, month, index, max }: ColumnProps) {
  const left = COLUMN_X + index * COLUMN_GAP;
  const height = MIN_BAR + (BAR_RANGE * (row?.value ?? 0)) / max;

  return (
    <g className="rise">
      {row === undefined ? (
        <rect
          x={left - HALF_BAR}
          y="94"
          width="28"
          height="24"
          rx="4"
          fill="none"
          stroke="#c3d1b5"
          strokeDasharray="3 3"
        />
      ) : (
        <>
          <rect
            x={left - HALF_BAR}
            y={BASE_Y - height}
            width="28"
            height={height}
            rx="4"
            fill="#78a865"
          />
          <Glyph kind="alive" x={left} y={BASE_Y - TREE_LIFT - height} />
          <text
            x={left}
            y={BASE_Y - AMOUNT_LIFT - height}
            textAnchor="middle"
            fontSize="11"
            fill="#26422f"
            fontFamily="Georgia, serif"
          >
            {row.amount}
          </text>
        </>
      )}
      <text
        x={left}
        y="134"
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        letterSpacing=".6"
        fill="#6f8462"
        fontFamily="Segoe UI, sans-serif"
      >
        M{month}
      </text>
      <text
        x={left}
        y="146"
        textAnchor="middle"
        fontSize="8.5"
        fill="#8b967e"
        fontFamily="Segoe UI, sans-serif"
      >
        {row === undefined ? UPCOMING : paidCount(row.payouts)}
      </text>
    </g>
  );
}

/** Payouts by milestone as six columns: each paid milestone a bar topped by its tree, the rest waiting in outline. */
export function MilestoneBars({ rows }: { rows: readonly BarRow[] }) {
  const root = useRef<SVGSVGElement>(null);
  const max = Math.max(...rows.map((row) => row.value), 1);
  const label = barsLabel(
    rows.filter((row) => row.payouts > 0).map((row) => barRow(row.month, row.payouts, row.amount)),
  );

  useRise(root);

  return (
    <figure className="rp-bars">
      <svg ref={root} viewBox="0 0 420 150" role="img" aria-label={label}>
        <path d="M10 118H410" stroke="#dfe7d3" strokeWidth="1.2" />
        {MILESTONE_MONTHS.map((month, index) => (
          <Column
            key={month}
            month={month}
            index={index}
            max={max}
            row={rows.find((row) => row.month === month && row.payouts > 0)}
          />
        ))}
      </svg>
      <figcaption>{BARS_CAPTION} · USDC</figcaption>
    </figure>
  );
}
