// Where a credit comes from, as one panorama (mockup carbon.jsx:203-260, `Journey`): five vignettes along a winding road
// (planted, verified, issued, mirrored on-chain, available). A coin travels the road and stops at each; the vignette it
// reaches comes alive and its caption lights. One 8 s round, the same beat for road, vignettes and captions, all CSS
// (`jr-*`), paused with the motion gate (§2.10). The picture is one image: its name lists the five steps.
import { FacetCoin } from '../../shared/ui/FacetCoin';
import { JOURNEY, journeyLabel } from './batch.copy';
import { captionNote, journeySteps, priceText } from './batch.rules';
import type { BatchDetail } from './carbon.api';

const ROAD = 'M90 150C150 120 210 172 270 150S390 122 450 150S570 176 630 150S750 122 810 150';
const SANS = 'Segoe UI, sans-serif';
const GEORGIA = 'Georgia, serif';
const BACKDROP_TREES = [
  { x: 40, y: 150, scale: 0.8 },
  { x: 170, y: 146, scale: 0.6 },
  { x: 372, y: 150, scale: 0.7 },
  { x: 530, y: 146, scale: 0.55 },
  { x: 720, y: 150, scale: 0.75 },
  { x: 880, y: 148, scale: 0.6 },
];
const STACK = [{ top: 140 }, { top: 132 }, { top: 124 }, { top: 116 }];
const STOP_FIRST = 90;
const STOP_GAP = 180;
const SIGN_MIN = 92;
const SIGN_MAX = 164;
const SIGN_PER_CHAR = 7.1;
const SIGN_PAD = 42;
const SIGN_TAIL = 8;
const SIGN_CORNER = 5;
const BADGE_OFFSET = 11;
const TITLE_OFFSET = 25;

type TreeProps = { x: number; y: number; scale: number };

function Tree({ x, y, scale }: TreeProps) {
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

function StackCoin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-14 0v5a14 4.6 0 0 0 28 0V0" fill="#c49a3e" />
      <ellipse rx="14" ry="4.6" fill="#e6c46e" />
      <ellipse rx="9.5" ry="3" fill="none" stroke="#c9a24c" strokeWidth=".8" />
    </g>
  );
}

function Planted() {
  return (
    <g className="jr-stage jr-0">
      <ellipse cx="90" cy="140" rx="30" ry="7" fill="#9e7b55" />
      <ellipse cx="90" cy="138" rx="22" ry="4.5" fill="#b8916a" />
      <g className="jr-sprout">
        <path d="M90 137V112" stroke="#4a7a43" strokeWidth="2.6" strokeLinecap="round" />
        <polygon points="90,120 74,113 79,105" fill="#5ea158" />
        <polygon points="90,116 106,106 102,98" fill="#4a8b4e" />
      </g>
    </g>
  );
}

/** The tree, a phone scanning it, a GPS pin. */
function Verified() {
  return (
    <g className="jr-stage jr-1">
      <Tree x={254} y={142} scale={1.7} />
      <g transform="translate(286 82)">
        <rect width="28" height="48" rx="5" fill="#26422f" />
        <rect x="3" y="6" width="22" height="34" rx="2" fill="#dfe9d2" />
        <rect className="jr-scan" x="3" y="6" width="22" height="2.5" fill="#6f9a58" />
        <path
          className="jr-tick"
          d="m8 24 4 4 8-9"
          fill="none"
          stroke="#2E9E5B"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g className="jr-pin" transform="translate(232 70)">
        <path d="M0 0-5-7A5.8 5.8 0 1 1 5-7Z" fill="#2f6b43" />
        <circle cy="-10.4" r="2" fill="#f3f8ea" />
      </g>
    </g>
  );
}

/** The certificate, stamped. */
function Issued({ registry }: { registry: string }) {
  return (
    <g className="jr-stage jr-2">
      <g transform="translate(450 108) rotate(-4)">
        <rect
          x="-38"
          y="-30"
          width="76"
          height="56"
          rx="5"
          fill="#153e2c"
          opacity=".1"
          transform="translate(3 4)"
        />
        <rect x="-38" y="-30" width="76" height="56" rx="5" fill="#fffef9" />
        <rect
          x="-32"
          y="-24"
          width="64"
          height="44"
          rx="3"
          fill="none"
          stroke="#d6e0ca"
          strokeDasharray="2 2"
        />
        <text y="-9" textAnchor="middle" fontSize="10" fill="#26422f" fontFamily={GEORGIA}>
          {registry}
        </text>
        <rect x="-22" y="0" width="34" height="3.5" rx="1.7" fill="#e3ebd7" />
        <rect x="-22" y="8" width="24" height="3.5" rx="1.7" fill="#e3ebd7" />
        <g className="jr-stamp" transform="translate(24 12)">
          <circle r="10" fill="#2E9E5B" />
          <path
            d="m-4 0 3 3 5-6"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </g>
  );
}

/** The credit and its reflection in the network. */
function Mirrored({ batchId }: { batchId: string }) {
  return (
    <g className="jr-stage jr-3">
      <ellipse cx="630" cy="146" rx="36" ry="8" fill="#a5c2b4" />
      <ellipse cx="630" cy="146" rx="26" ry="5" fill="#bcd6c9" />
      <g className="jr-float">
        <FacetCoin cx={630} cy={104} r={17} id={`jr-${batchId}`} />
      </g>
      <g className="jr-reflect" opacity=".35" transform="translate(0 292) scale(1 -1)">
        <g transform="translate(630 146) scale(.55 .3) translate(-630 -146)">
          <FacetCoin cx={630} cy={146} r={17} id={`jrr-${batchId}`} dim />
        </g>
      </g>
      <path
        d="M604 120q-10-16 4-30M656 120q10-16-4-30"
        fill="none"
        stroke="#9db58a"
        strokeWidth="1.2"
        strokeDasharray="2 3"
      />
    </g>
  );
}

/** The stack of credits with a price tag. */
function Available({ price }: { price: string }) {
  return (
    <g className="jr-stage jr-4">
      <ellipse cx="810" cy="146" rx="22" ry="4.5" fill="#153e2c" opacity=".1" />
      {STACK.map(({ top }) => (
        <StackCoin key={top} x={810} y={top} />
      ))}
      <g className="jr-new">
        <StackCoin x={810} y={108} />
      </g>
      <g transform="translate(838 92) rotate(8)">
        <path d="M0 0h34l6 8-6 8H0Z" fill="#fffef9" stroke="#d6e0ca" />
        <circle cx="34" cy="8" r="1.8" fill="#c3d1b5" />
        <text x="15" y="11" textAnchor="middle" fontSize="8" fill="#3f6b35" fontFamily={SANS}>
          {price}
        </text>
      </g>
    </g>
  );
}

type CaptionProps = { index: number; label: string; note: string };

/** A caption written on the soil under a vignette; the number lights as the coin arrives. */
function Caption({ index, label, note }: CaptionProps) {
  const stop = STOP_FIRST + index * STOP_GAP;
  const width = Math.min(SIGN_MAX, Math.max(SIGN_MIN, label.length * SIGN_PER_CHAR + SIGN_PAD));
  const left = stop - width / 2;

  return (
    <g className={`jr-cap jr-cap-${index}`}>
      <rect x={stop - 2} y="214" width="4" height="58" rx="1.5" fill="#8B5E3C" />
      <rect x={stop} y="214" width="2" height="58" fill="#5E4030" />
      <ellipse cx={stop} cy="272" rx="14" ry="3" fill="#153e2c" opacity=".12" />
      <g className="jr-sign" style={{ transformOrigin: `${stop}px 212px` }}>
        <path
          d={`M${left} 210h${width - SIGN_TAIL}l8 13-8 13H${left}a5 5 0 0 1-5-5v-16a5 5 0 0 1 5-5Z`}
          className="jr-board"
        />
        <path
          d={`M${left} 210h${width - SIGN_TAIL}l8 13H${left - SIGN_CORNER}v-8a5 5 0 0 1 5-5Z`}
          className="jr-board-top"
        />
        <circle className="jr-badge" cx={left + BADGE_OFFSET} cy="223" r="9" />
        <text
          className="jr-no"
          x={left + BADGE_OFFSET}
          y="226.5"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fontFamily={SANS}
        >
          {index + 1}
        </text>
        <text
          className="jr-title"
          x={left + TITLE_OFFSET}
          y="227.5"
          fontSize="12.5"
          fontFamily={GEORGIA}
        >
          {label}
        </text>
      </g>
      <text
        x={stop}
        y="284"
        textAnchor="middle"
        fontSize="10.5"
        fontStyle="italic"
        fill="#6f8462"
        fontFamily={GEORGIA}
      >
        {captionNote(note)}
      </text>
    </g>
  );
}

/** The sky, the sun, the far trees, the hills and the road the coin travels. */
function Backdrop() {
  return (
    <>
      <defs>
        <linearGradient id="jr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f6ed" />
          <stop offset="1" stopColor="#e4ecd8" />
        </linearGradient>
      </defs>
      <rect y="54" width="900" height="240" rx="14" fill="url(#jr-sky)" />
      <circle cx="560" cy="86" r="18" fill="#fbfaec" opacity=".9" />
      <g opacity=".45">
        {BACKDROP_TREES.map((tree) => (
          <Tree key={tree.x} {...tree} />
        ))}
      </g>
      <polygon
        points="0,160 140,146 300,158 460,144 620,160 780,146 900,154 900,200 0,200"
        fill="#cddbbd"
      />
      <polygon
        points="0,182 180,172 380,184 560,172 760,184 900,176 900,200 0,200"
        fill="#b3c8a1"
      />
      <path
        d={ROAD}
        fill="none"
        stroke="#fffef9"
        strokeWidth="9"
        strokeLinecap="round"
        opacity=".9"
      />
      <path
        d={ROAD}
        fill="none"
        stroke="#a9c199"
        strokeWidth="1.4"
        strokeDasharray="3 6"
        strokeLinecap="round"
      />
    </>
  );
}

export function Journey({ batch }: { batch: BatchDetail }) {
  const steps = journeySteps(batch);

  return (
    <section className="cb-journey" aria-label={JOURNEY}>
      <h3>{JOURNEY}</h3>
      <div className="cb-journey-scroll">
        <div className="cb-journey-inner">
          <svg
            className="cb-journey-art"
            viewBox="0 54 900 240"
            role="img"
            aria-label={journeyLabel(steps)}
          >
            <Backdrop />
            <Planted />
            <Verified />
            <Issued registry={batch.registry} />
            <Mirrored batchId={batch.batchId} />
            <Available price={priceText(batch.usdcPerTonne)} />
            <polygon
              points="0,196 150,190 300,198 450,190 600,198 750,190 900,196 900,294 0,294"
              fill="#e2eadb"
            />
            <polygon
              points="0,196 150,190 300,198 450,190 600,198 750,190 900,196 900,201 750,195 600,203 450,195 300,203 150,195 0,201"
              fill="#c9d8b9"
            />
            {steps.map(([label, note], index) => (
              <Caption key={label} index={index} label={label} note={note} />
            ))}
            <g className="jr-traveller" style={{ offsetPath: `path('${ROAD}')` }}>
              <circle r="9" fill="#e6c46e" stroke="#c49a3e" strokeWidth="1.5" />
              <path
                d="M-3 2.5c-1-4 1-5.5 5-5.5 0 4-2 5.5-5 5m-1.5 1.5 4-4"
                fill="none"
                stroke="#8a6a27"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
