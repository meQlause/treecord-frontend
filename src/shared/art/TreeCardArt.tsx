import { Glyph, type GlyphKind } from './Glyph';

// K30. Mockup planter-pages.jsx:89-111. A tree's card picture, drawn from its record: the tree in its real state above
// a track of milestone dots. The CSS loops (cloud, sway, coin, glint, pulse) pause with the motion gate (§2.10).
// Palette: design-system §2.4.
export type MilestoneStatus = 'Paid' | 'Open' | 'Upcoming' | 'Paused' | 'Forfeited' | 'Missed';

export type Milestone = { month: number; status: MilestoneStatus };

const PAPER = '#fffef9';
const GOLD = '#c49a3e';
const SHADOW = '#153e2c';
const TRACK = '#b9cba6';
const GRASS = '#6f9a58';
const GROUND = '#e9f0de';
const FORFEIT = '#e9dcc8';

type Dot = { fill: string; stroke: string; width: string; className?: string };

/** MS_COLOR plus the stroke each dot wears: paid is solid green, the open one pulses gold. */
const DOT: Record<MilestoneStatus, Dot> = {
  Paid: { fill: GRASS, stroke: GRASS, width: '1.4' },
  Open: { fill: PAPER, stroke: GOLD, width: '2.4', className: 'pl-pulse' },
  Upcoming: { fill: PAPER, stroke: TRACK, width: '1.4' },
  Paused: { fill: '#cfd2c4', stroke: TRACK, width: '1.4' },
  Forfeited: { fill: FORFEIT, stroke: TRACK, width: '1.4' },
  Missed: { fill: FORFEIT, stroke: TRACK, width: '1.4' },
};

/** What each kind of tree does while it stands there: the removed spot marches its dashes, a dead tree is still. */
const GLYPH_LOOP: Record<GlyphKind, string> = {
  alive: 'pl-sway',
  completed: 'pl-sway',
  flagged: 'pl-sway',
  funded: 'pl-sway',
  planned: 'pl-sway',
  removed: 'pl-march',
  dead: '',
};
const COIN_KINDS: GlyphKind[] = ['alive', 'completed'];

const TRACK_LEFT = 38;
const TRACK_STEP = 48;
const DELAY_CYCLE = 7;
const DELAY_STEP = 0.7;
const TREE_AT = { x: 160, y: 118, scale: 3.4 };

function Milestones({ milestones }: { milestones: Milestone[] }) {
  return (
    <>
      {milestones.map(({ month, status }, index) => {
        const dot = DOT[status];

        return (
          <g key={month} transform={`translate(${TRACK_LEFT + index * TRACK_STEP} 154)`}>
            <circle
              r="6.5"
              fill={dot.fill}
              stroke={dot.stroke}
              strokeWidth={dot.width}
              className={dot.className}
            />
            {status === 'Paid' && (
              <path
                d="M-3 0l2 2 4-4.5"
                fill="none"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
            <text
              y="20"
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#6f8462"
              fontFamily="Segoe UI, sans-serif"
            >
              M{month}
            </text>
          </g>
        );
      })}
    </>
  );
}

/** The green run of the track up to the last paid milestone, with a glint travelling along it. */
function Paid({ last }: { last: number }) {
  const run = `M${TRACK_LEFT} 154H${TRACK_LEFT + last * TRACK_STEP}`;

  return (
    <>
      <path d={run} stroke={GRASS} strokeWidth="2.4" />
      <path
        className="pl-glint"
        d={run}
        stroke={PAPER}
        strokeWidth="2.4"
        strokeDasharray="10 250"
        strokeLinecap="round"
        opacity=".9"
      />
    </>
  );
}

type TreeCardArtProps = {
  /** The tree's state, lower case (`alive`, `flagged`, `dead`, `removed`, `completed`). */
  kind: GlyphKind;
  /** The tree's payout milestones in order; the track draws one dot each. */
  milestones: Milestone[];
  /** Any number that differs per tree (its id): staggers the loops so a grid of cards does not move in step. */
  seed?: number;
};

/** K30. Decorative: the card's heading and badge carry the tree's name and state. */
export function TreeCardArt({ kind, milestones, seed = 0 }: TreeCardArtProps) {
  const last = milestones.map((milestone) => milestone.status).lastIndexOf('Paid');
  const delay = { animationDelay: `-${(seed % DELAY_CYCLE) * DELAY_STEP}s` };

  return (
    <svg
      className="landscape"
      viewBox="0 0 320 184"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="320" height="184" fill={GROUND} />
      <polygon points="0,122 80,112 170,120 250,110 320,116 320,184 0,184" fill="#cddbbd" />
      <g className="pl-cloud" style={delay}>
        <ellipse cx="40" cy="38" rx="20" ry="6" fill={PAPER} opacity=".85" />
        <ellipse cx="54" cy="33" rx="12" ry="7" fill={PAPER} opacity=".85" />
      </g>
      <ellipse cx="160" cy="118" rx="44" ry="7" fill={SHADOW} opacity=".1" />
      <g className={GLYPH_LOOP[kind] || undefined} style={delay}>
        <Glyph kind={kind} {...TREE_AT} />
      </g>
      {COIN_KINDS.includes(kind) && last >= 0 && (
        <g className="pl-coin-rise" style={delay}>
          <path d="M182 54v3a9 3 0 0 0 18 0v-3" fill={GOLD} />
          <ellipse cx="191" cy="54" rx="9" ry="3" fill="#e6c46e" />
        </g>
      )}
      <path d="M38 154H282" stroke={TRACK} strokeWidth="1.4" />
      {last > 0 && <Paid last={last} />}
      <Milestones milestones={milestones} />
    </svg>
  );
}
