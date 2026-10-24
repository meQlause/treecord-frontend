// The art only S07 uses: the heading scene (mockup carbon.jsx:119-160, `CarbonArt`). CO₂ drifts into a faceted tree (the
// Treecord mark), the tree turns it into facets, and the facets fly into one faceted coin: one credit, one tonne.
// Decorative; the CSS loops pause with the motion gate (design-system §2.10). Palette: §2.4.
import type { CSSProperties } from 'react';
import { FacetCoin } from '../../shared/ui/FacetCoin';

const COIN_X = 352;
const COIN_Y = 96;
const COIN_RADIUS = 40;
const COIN_SHADOW_DROP = 62;
const LABEL_DROP = 76;
const CAPTION_DROP = 90;
const SHARD_FILLS = ['#5ea158', '#e6c46e', '#4a8b4e', '#d9b259'];
const SHARD_DELAY = -0.34;
const SHARD_LIFT = 54;
const SHARD_LIFT_STEP = 12;
const SHARD_LIFT_CYCLE = 3;
const CO2 = [
  { x: 72, y: 30, dx: 66, dy: 66, delay: 0, scale: 1.25 },
  { x: 238, y: 22, dx: -86, dy: 76, delay: -1.7, scale: 1.1 },
  { x: 120, y: 14, dx: 24, dy: 84, delay: -3.4, scale: 1 },
  { x: 204, y: 46, dx: -54, dy: 50, delay: -5.1, scale: 0.95 },
];
const SHARDS = [
  { x: 128, y: 92 },
  { x: 170, y: 84 },
  { x: 150, y: 118 },
  { x: 116, y: 132 },
  { x: 184, y: 126 },
  { x: 140, y: 70 },
  { x: 160, y: 146 },
  { x: 196, y: 104 },
  { x: 124, y: 110 },
  { x: 176, y: 62 },
].map(({ x, y }, index) => ({
  x,
  y,
  fill: SHARD_FILLS[index % SHARD_FILLS.length],
  delay: index * SHARD_DELAY,
  path: `path('M${x} ${y}Q${(x + COIN_X) / 2} ${Math.min(y, COIN_Y) - SHARD_LIFT - (index % SHARD_LIFT_CYCLE) * SHARD_LIFT_STEP} ${COIN_X} ${COIN_Y}')`,
}));

const css = (vars: Record<string, string>): CSSProperties => vars as CSSProperties;

function Drift() {
  return (
    <>
      {CO2.map(({ x, y, dx, dy, delay, scale }, index) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${scale})`}>
          <g
            className="ca-co2"
            style={css({
              '--tx': `${dx / scale}px`,
              '--ty': `${dy / scale}px`,
              '--d': `${delay}s`,
            })}
          >
            <circle cx="-9" r="4.4" fill="#b7c4ad" />
            <circle cx="9" r="4.4" fill="#b7c4ad" />
            <circle r="6.2" fill="#66765f" />
            {index === 0 && (
              <text
                y="-12"
                textAnchor="middle"
                fontSize="8"
                fill="#5f6f58"
                fontFamily="Segoe UI, sans-serif"
              >
                CO₂
              </text>
            )}
          </g>
        </g>
      ))}
    </>
  );
}

function Tree() {
  return (
    <g transform="translate(70 50) scale(2.7)">
      <g className="ca-tree">
        <polygon points="32,5 44,25 20,25" fill="#5ea158" />
        <polygon points="20,25 32,45 8,45" fill="#24623c" />
        <polygon points="44,25 56,45 32,45" fill="#4a8b4e" />
        <polygon className="ca-glint" points="20,25 44,25 32,45" fill="#25633d" />
        <polygon points="29,45 32,45 32,57 29,57" fill="#5E4030" />
        <polygon points="32,45 35,45 35,57 32,57" fill="#8B5E3C" />
      </g>
    </g>
  );
}

export function CarbonArt() {
  return (
    <svg
      className="landscape carbon-art"
      viewBox="0 0 480 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ca-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2e6" />
          <stop offset="1" stopColor="#dde7d2" />
        </linearGradient>
      </defs>
      <rect width="480" height="240" fill="url(#ca-sky)" />
      <polygon
        points="0,194 70,178 150,190 230,176 300,188 380,174 480,184 480,240 0,240"
        fill="#c4d4b3"
      />
      <polygon points="0,194 70,178 110,214 0,240" fill="#b5c8a3" />
      <polygon points="150,190 230,176 210,226" fill="#b8cba6" />
      <polygon points="300,188 380,174 360,222" fill="#b5c8a3" />
      <polygon points="0,218 120,206 250,220 380,208 480,216 480,240 0,240" fill="#9db892" />
      <Drift />
      <ellipse cx="156" cy="206" rx="54" ry="7" fill="#153e2c" opacity=".12" />
      <Tree />
      {SHARDS.map(({ x, y, fill, delay, path }) => (
        <g
          key={`${x}-${y}`}
          className="ca-shard"
          style={css({ offsetPath: path, '--d': `${delay}s` })}
        >
          <polygon points="0,-4.5 4,3 -4,3" fill={fill} />
        </g>
      ))}
      <ellipse
        cx={COIN_X}
        cy={COIN_Y + COIN_SHADOW_DROP}
        rx="34"
        ry="6"
        fill="#153e2c"
        opacity=".12"
      />
      <FacetCoin cx={COIN_X} cy={COIN_Y} r={COIN_RADIUS} id="hero" />
      <text
        x={COIN_X}
        y={COIN_Y + LABEL_DROP}
        textAnchor="middle"
        fontSize="15"
        fill="#2c4a33"
        fontFamily="Georgia, serif"
      >
        1 tCO₂e
      </text>
      <text
        x={COIN_X}
        y={COIN_Y + CAPTION_DROP}
        textAnchor="middle"
        fontSize="7.5"
        letterSpacing="1.6"
        fill="#6f8462"
        fontFamily="Segoe UI, sans-serif"
      >
        BATCH #101 · ISSUED
      </text>
    </svg>
  );
}
