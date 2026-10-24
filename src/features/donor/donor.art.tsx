// The art only S13's two action cards use (mockup donor.jsx:302-330): a folded map with a lens that glides from pin to
// pin, and a plot that is marked out, seeded and grows. CSS loops (`ex-*`, `cr-*`), paused with the motion gate (§2.10).
import type { CSSProperties } from 'react';

const SLOW = 1.2;
const ARM = 5;
const SPARK_STEP = 0.5;
const PINS = [
  { x: 46, y: 72 },
  { x: 100, y: 60 },
  { x: 158, y: 46 },
];
const FIELD_TREES = [
  { x: 40, y: 50 },
  { x: 90, y: 84 },
  { x: 140, y: 74 },
  { x: 166, y: 70 },
  { x: 60, y: 88 },
];
const SPARKS = [
  { x: 136, y: 54 },
  { x: 62, y: 40 },
  { x: 168, y: 62 },
];

const delay = (seconds: number): CSSProperties => ({ '--d': `${seconds}s` }) as CSSProperties;

/** "Explore": a folded map of plantings; a lens glides from pin to pin and each pin hops as the lens finds it. */
export function ExploreArt() {
  return (
    <svg className="action-art" viewBox="0 0 200 110" aria-hidden="true">
      <polygon points="22,30 74,20 74,92 22,100" fill="#d7e3c9" />
      <polygon points="74,20 126,32 126,102 74,92" fill="#c4d5b2" />
      <polygon points="126,32 178,22 178,94 126,102" fill="#d7e3c9" />
      {FIELD_TREES.map(({ x, y }) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <polygon points="0,-9 5,0 -5,0" fill="#6f9a58" />
          <polygon points="0,-9 5,0 0,0" fill="#4a8b4e" />
        </g>
      ))}
      <path
        d="M46 72C66 56 80 78 100 60S140 52 158 46"
        fill="none"
        stroke="#7f9d6f"
        strokeWidth="1.3"
        strokeDasharray="2 4"
        strokeLinecap="round"
      />
      {PINS.map(({ x, y }, index) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <g className="ex-pin" style={delay(index * SLOW)}>
            <ellipse cy="1" rx="4" ry="1.4" fill="#153e2c" opacity=".2" />
            <path d="M0 0-6.5-9.5A7.6 7.6 0 1 1 6.5-9.5Z" fill="#2f6b43" />
            <path d="M0 0 6.5-9.5A7.6 7.6 0 0 0 0-21Z" fill="#4a8b4e" />
            <circle cy="-14" r="2.6" fill="#f3f8ea" />
          </g>
        </g>
      ))}
      <g className="ex-lens">
        <circle r="15" fill="#ffffff" fillOpacity=".35" stroke="#2c4a33" strokeWidth="3" />
        <path d="M10.6 10.6 20 20" stroke="#2c4a33" strokeWidth="4.5" strokeLinecap="round" />
        <path
          d="M-8-6a10 10 0 0 1 6-5"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity=".8"
        />
      </g>
    </svg>
  );
}

/** "Create": a new plot is marked out, a seed drops in, the seedling rises and opens; the plus pulses. */
export function CreateArt() {
  return (
    <svg className="action-art" viewBox="0 0 200 110" aria-hidden="true">
      <polygon points="30,86 100,64 170,86 100,108" fill="#d7e3c9" />
      <polygon
        className="cr-plot"
        points="30,86 100,64 170,86 100,108"
        fill="none"
        stroke="#5f8a4f"
        strokeWidth="1.4"
        strokeDasharray="4 4"
        pathLength="100"
      />
      <polygon points="66,88 100,76 100,96" fill="#a6bf93" />
      <polygon points="100,76 134,88 100,96" fill="#8daa83" />
      <ellipse className="cr-seed" cx="100" cy="20" rx="3.2" ry="4.2" fill="#8B5E3C" />
      <g className="cr-sprout">
        <path d="M100 80V52" stroke="#4a7a43" strokeWidth="2.6" strokeLinecap="round" />
        <g className="cr-leaf cr-leaf--l">
          <polygon points="100,60 82,52 88,44" fill="#5ea158" />
          <polygon points="100,60 88,44 96,48" fill="#24623c" />
        </g>
        <g className="cr-leaf cr-leaf--r">
          <polygon points="100,54 118,44 114,36" fill="#4a8b4e" />
          <polygon points="100,54 114,36 106,42" fill="#25633d" />
        </g>
      </g>
      {SPARKS.map(({ x, y }, index) => (
        <path
          key={x}
          className="cr-spark"
          style={delay(index * SPARK_STEP)}
          d={`M${x} ${y - ARM}v10M${x - ARM} ${y}h10`}
          stroke="#9db58a"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
