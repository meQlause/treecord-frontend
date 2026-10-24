// The art only S08 uses: the heading scene (mockup carbon.jsx:264-297, `BatchArt`). The batch drawn from its own record:
// the registry certificate with its serial range ticking through, a rosette seal, and two coin stacks sized by the data
// (issued vs still available); now and then a credit leaves the stack. CSS loops, paused with the motion gate (§2.10).
import type { BatchDetail } from './carbon.api';
import { inventoryShare } from './carbon.rules';
import { serialSamples } from './batch.rules';

const STACK_HEIGHT = 8;
const DIM_OPACITY = 0.35;
const COIN_STEP = 9;
const COIN_TOP = 182;
const SEAL_DOTS = 12;
const SEAL_RADIUS = 15;
const ODOMETER_STEP = 13;
const SANS = 'Segoe UI, sans-serif';
const GEORGIA = 'Georgia, serif';
const STACK_ROWS = Array.from({ length: STACK_HEIGHT }, (_item, row) => row);
const SEAL_KEYS = Array.from({ length: SEAL_DOTS }, (_item, dot) => dot);

type CoinProps = { x: number; row: number; className?: string; dim?: boolean };

function Coin({ x, row, className, dim = false }: CoinProps) {
  return (
    <g
      className={className}
      transform={`translate(${x} ${COIN_TOP - row * COIN_STEP})`}
      opacity={dim ? DIM_OPACITY : 1}
    >
      <path d="M-20 0v6a20 6.5 0 0 0 40 0V0" fill="#c49a3e" />
      <ellipse rx="20" ry="6.5" fill="#e6c46e" />
      <ellipse rx="13.5" ry="4.2" fill="none" stroke="#c9a24c" strokeWidth=".9" />
    </g>
  );
}

function Seal() {
  return (
    <g transform="translate(66 44)">
      <path d="M-8 6-12 26-4 21 0 28 2 8M8 6l4 20-8-5-4 7-2-20" fill="#2f6b43" />
      <g className="ba-rosette">
        {SEAL_KEYS.map((dot) => (
          <circle
            key={dot}
            cx={Math.cos((dot * Math.PI) / (SEAL_DOTS / 2)) * SEAL_RADIUS}
            cy={Math.sin((dot * Math.PI) / (SEAL_DOTS / 2)) * SEAL_RADIUS}
            r="4"
            fill="#2E9E5B"
          />
        ))}
        <circle r="15" fill="#2E9E5B" />
        <circle r="11" fill="none" stroke="#bfe5c9" strokeDasharray="2 2" />
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

function Certificate({ batch }: { batch: BatchDetail }) {
  return (
    <g className="ba-cert" transform="translate(150 100) rotate(-4)">
      <rect
        x="-104"
        y="-74"
        width="208"
        height="150"
        rx="8"
        fill="#153e2c"
        opacity=".12"
        transform="translate(5 7)"
      />
      <rect x="-104" y="-74" width="208" height="150" rx="8" fill="#fffef9" />
      <rect
        x="-94"
        y="-64"
        width="188"
        height="130"
        rx="4"
        fill="none"
        stroke="#d6e0ca"
        strokeWidth="1.2"
        strokeDasharray="3 3"
      />
      <text y="-38" textAnchor="middle" fontSize="17" fill="#26422f" fontFamily={GEORGIA}>
        {batch.registry}
      </text>
      <text
        y="-24"
        textAnchor="middle"
        fontSize="7"
        letterSpacing="2"
        fill="#7b8c6c"
        fontFamily={SANS}
      >
        VINTAGE {batch.vintage}
      </text>
      <text
        y="-13"
        textAnchor="middle"
        fontSize="7.5"
        fill="#8b967e"
        fontFamily={GEORGIA}
        fontStyle="italic"
      >
        {batch.campaign.species.name}
      </text>
      <path d="M-70-5H70" stroke="#e3ebd7" />
      <text
        y="8"
        textAnchor="middle"
        fontSize="6.5"
        letterSpacing="1.6"
        fill="#8b967e"
        fontFamily={SANS}
      >
        SERIAL
      </text>
      <g transform="translate(0 23)" clipPath="url(#ba-serial)">
        <g className="ba-odometer">
          {serialSamples(batch).map((serial, index) => (
            <text
              key={serial}
              y={index * ODOMETER_STEP}
              textAnchor="middle"
              fontSize="10"
              fill="#3f6b35"
              fontFamily="ui-monospace, Consolas, monospace"
            >
              {serial}
            </text>
          ))}
        </g>
      </g>
      <rect x="-60" y="36" width="78" height="5" rx="2.5" fill="#e3ebd7" />
      <rect x="-60" y="47" width="54" height="5" rx="2.5" fill="#e3ebd7" />
      <Seal />
    </g>
  );
}

export function BatchArt({ batch }: { batch: BatchDetail }) {
  const available = Math.max(0, Math.round(STACK_HEIGHT * inventoryShare(batch)));

  return (
    <svg
      className="landscape batch-art"
      viewBox="0 0 480 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ba-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2e6" />
          <stop offset="1" stopColor="#dde7d2" />
        </linearGradient>
        <clipPath id="ba-serial">
          <rect x="-70" y="-9" width="140" height="13" />
        </clipPath>
      </defs>
      <rect width="480" height="240" fill="url(#ba-sky)" />
      <polygon points="0,198 90,184 200,196 300,182 400,194 480,186 480,240 0,240" fill="#c4d4b3" />
      <polygon points="0,220 140,208 280,222 420,210 480,216 480,240 0,240" fill="#9db892" />
      <Certificate batch={batch} />
      <ellipse cx="316" cy="190" rx="26" ry="5" fill="#153e2c" opacity=".1" />
      <ellipse cx="380" cy="190" rx="26" ry="5" fill="#153e2c" opacity=".1" />
      {STACK_ROWS.map((row) => (
        <Coin key={`issued-${row}`} x={316} row={row} dim />
      ))}
      {STACK_ROWS.slice(0, available).map((row) => (
        <Coin key={`available-${row}`} x={380} row={row} />
      ))}
      {available > 0 && (
        <g className="ba-lift">
          <Coin x={380} row={available} />
        </g>
      )}
      <text
        x="316"
        y="208"
        textAnchor="middle"
        fontSize="7"
        letterSpacing="1.6"
        fill="#5b7350"
        fontFamily={SANS}
      >
        ISSUED
      </text>
      <text
        x="380"
        y="208"
        textAnchor="middle"
        fontSize="7"
        letterSpacing="1.6"
        fill="#5b7350"
        fontFamily={SANS}
      >
        AVAILABLE
      </text>
    </svg>
  );
}
