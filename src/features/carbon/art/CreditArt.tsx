// Mockup carbon.jsx:92-117 (`CreditArt`). The batch card scene: the credit coin, the species it came from on faceted
// ground, and the inventory as ten chips (lit = still available). Decorative. Shared by S07, S08 and S15; palette:
// design-system §2.4. The loops (tree breathing, chips) pause with the motion gate through CSS.
import type { CSSProperties } from 'react';
import { FacetCoin } from '../../../shared/ui/FacetCoin';
import type { CarbonBatch } from '../carbon.api';
import { litChips } from '../carbon.rules';

const MANGROVE = /mangrove/i;
const CHIPS = 10;
const CHIP_PITCH = 8.6;
const CHIP_DELAY = 0.08;
const TREE_DELAY = -0.9;
const TREES = [
  { x: 106, y: 96, scale: 0.95 },
  { x: 130, y: 90, scale: 0.75 },
  { x: 154, y: 98, scale: 1.05 },
  { x: 176, y: 92, scale: 0.7 },
];
const COIN = { cx: 56, cy: 56, r: 30 };
const CHIP_KEYS = Array.from({ length: CHIPS }, (_item, chip) => chip);

const delay = (seconds: number): CSSProperties => ({ '--d': `${seconds}s` }) as CSSProperties;

type TreeProps = { x: number; y: number; scale: number; mangrove: boolean };

function Tree({ x, y, scale, mangrove }: TreeProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {mangrove && (
        <path
          d="M0 0-7 7M0 0 7 7M-1 2-3 8M1 2 3 8"
          stroke="#7a5a40"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
      )}
      <polygon points="0,-30 8,-16 -8,-16" fill="#5ea158" />
      <polygon points="-8,-16 0,-3 -16,-3" fill="#24623c" />
      <polygon points="8,-16 16,-3 0,-3" fill="#4a8b4e" />
      <polygon points="-8,-16 8,-16 0,-3" fill="#25633d" />
      <rect x="-1.5" y="-3" width="3" height="5" fill="#7a5a40" />
    </g>
  );
}

function Ground({ mangrove }: { mangrove: boolean }) {
  return (
    <>
      {mangrove ? (
        <>
          <polygon points="0,96 90,88 180,96 300,86 300,120 0,120" fill="#bcd2c4" />
          <path
            d="M110 104h26m30 6h34m-120 4h22"
            stroke="#e1ece1"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <polygon points="0,96 80,86 170,94 300,84 300,120 0,120" fill="#c8d7b8" />
          <polygon points="80,86 170,94 120,112" fill="#b8cba6" />
        </>
      )}
      <polygon
        points="0,108 120,100 240,108 300,102 300,120 0,120"
        fill={mangrove ? '#a5c2b4' : '#a9c199'}
      />
    </>
  );
}

export function CreditArt({ batch }: { batch: CarbonBatch }) {
  const mangrove = MANGROVE.test(batch.campaign.species.name);
  const lit = litChips(batch);

  return (
    <svg
      className="cb-scene"
      viewBox="0 0 300 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="300" height="120" fill="#eef3e6" />
      <Ground mangrove={mangrove} />
      {TREES.map((tree, index) => (
        <g key={tree.x} className="cb-scene-tree" style={delay(index * TREE_DELAY)}>
          <Tree {...tree} mangrove={mangrove} />
        </g>
      ))}
      <ellipse cx="56" cy="98" rx="26" ry="4.5" fill="#153e2c" opacity=".12" />
      <FacetCoin {...COIN} id={batch.batchId} dim={lit === 0} />
      <g transform="translate(206 74)">
        {CHIP_KEYS.map((chip) => (
          <rect
            key={chip}
            x={chip * CHIP_PITCH}
            width="6.4"
            height="10"
            rx="1.6"
            fill={chip < lit ? '#6f9a58' : '#d6e0ca'}
            className={chip < lit ? 'cb-chip' : undefined}
            style={delay(chip * CHIP_DELAY)}
          />
        ))}
      </g>
    </svg>
  );
}
