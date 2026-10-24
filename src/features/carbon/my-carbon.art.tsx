// The art only S15 draws (mockup my-carbon.jsx:244-263): the ledger of the heading — three stacks of coins (issued, reserved,
// retired) whose heights come from the figures; reserved coins are outlines (not issued yet), the retired stack carries a
// turning seal, one issued coin floats. Decorative; palette: design-system §2.4. The loops are CSS (motion gate).
import type { CSSProperties } from 'react';
import { FacetCoin } from '../../shared/ui/FacetCoin';
import { stackOf } from './my-carbon.rules';

const SANS = 'Segoe UI, sans-serif';
const COIN_PITCH = 9;
const COIN_DELAY = 0.08;
const BASE_Y = 182;
const PETALS = 12;
const PETAL_STEP = Math.PI / (PETALS / 2);
const PETAL_RING = 13;
const COIN_LIFT = 40;
const SEAL_LIFT = 22;
const SEAL_PETALS = Array.from({ length: PETALS }, (_petal, index) => index);

type Style = 'issued' | 'reserved' | 'retired';

const STACKS: readonly { x: number; style: Style; label: string }[] = [
  { x: 150, style: 'issued', label: 'ISSUED' },
  { x: 250, style: 'reserved', label: 'RESERVED' },
  { x: 350, style: 'retired', label: 'RETIRED' },
];

function Coin({ x, y, style }: { x: number; y: number; style: Style }) {
  if (style === 'reserved') {
    return (
      <g transform={`translate(${x} ${y})`}>
        <path
          d="M-20 0v6a20 6.5 0 0 0 40 0V0"
          fill="#eef3e6"
          stroke="#9db58a"
          strokeDasharray="3 3"
        />
        <ellipse rx="20" ry="6.5" fill="#f6f9f1" stroke="#9db58a" strokeDasharray="3 3" />
      </g>
    );
  }

  const retired = style === 'retired';

  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-20 0v6a20 6.5 0 0 0 40 0V0" fill={retired ? '#9aa48f' : '#c49a3e'} />
      <ellipse rx="20" ry="6.5" fill={retired ? '#c9d0bf' : '#e6c46e'} />
      <ellipse
        rx="13.5"
        ry="4.2"
        fill="none"
        stroke={retired ? '#aab39f' : '#c9a24c'}
        strokeWidth=".9"
      />
    </g>
  );
}

function Seal({ y }: { y: number }) {
  return (
    <g transform={`translate(350 ${y})`}>
      <g className="ba-rosette">
        {SEAL_PETALS.map((petal) => (
          <circle
            key={petal}
            cx={Math.cos(petal * PETAL_STEP) * PETAL_RING}
            cy={Math.sin(petal * PETAL_STEP) * PETAL_RING}
            r="4"
            fill="#2E9E5B"
          />
        ))}
        <circle r="13" fill="#2E9E5B" />
      </g>
      <path
        d="M-5 0l3.5 3.5 7-7.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

type Props = { issued: number; reserved: number; retired: number };

export function LedgerArt({ issued, reserved, retired }: Props) {
  const figures: [number, number, number] = [issued, reserved, retired];
  const counts = {
    issued: stackOf(issued, figures),
    reserved: stackOf(reserved, figures),
    retired: stackOf(retired, figures),
  };

  return (
    <svg
      className="landscape ledger-art"
      viewBox="0 0 480 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2e6" />
          <stop offset="1" stopColor="#dde7d2" />
        </linearGradient>
      </defs>
      <rect width="480" height="240" fill="url(#lg-sky)" />
      <polygon points="0,198 90,184 200,196 300,182 400,194 480,186 480,240 0,240" fill="#c4d4b3" />
      <polygon points="0,220 140,208 280,222 420,210 480,216 480,240 0,240" fill="#9db892" />
      {STACKS.map(({ x, style, label }) => (
        <g key={label}>
          <ellipse cx={x} cy="190" rx="27" ry="5" fill="#153e2c" opacity=".1" />
          {Array.from({ length: counts[style] }, (_coin, index) => (
            <g
              key={index}
              className={style === 'issued' ? 'lg-coin' : undefined}
              style={{ '--d': `${index * COIN_DELAY}s` } as CSSProperties}
            >
              <Coin x={x} y={BASE_Y - index * COIN_PITCH} style={style} />
            </g>
          ))}
          <text
            x={x}
            y="210"
            textAnchor="middle"
            fontSize="7.5"
            letterSpacing="1.6"
            fill="#5b7350"
            fontFamily={SANS}
          >
            {label}
          </text>
        </g>
      ))}
      {issued > 0 && (
        <g className="lg-float">
          <FacetCoin
            cx={150}
            cy={BASE_Y - counts.issued * COIN_PITCH - COIN_LIFT}
            r={18}
            id="ledger"
          />
        </g>
      )}
      {retired > 0 && <Seal y={BASE_Y - counts.retired * COIN_PITCH - SEAL_LIFT} />}
    </svg>
  );
}
