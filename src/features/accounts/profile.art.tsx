// The art only S11 uses (mockup shared-pages.jsx:19-91): the heading's "passport" collecting its stamps, the ID card and
// the wallet drawn as a card. The loops (stamps, coin, sweep) go through the motion gate (design-system §2.10).
import { gsap } from 'gsap';
import { useRef } from 'react';
import { Scene, useSceneLoop, type Selector } from '../../shared/art/Scene';
import { initialOf } from '../../app/session/profile-rules';
import { FacetCoin } from '../../shared/ui/FacetCoin';
import { idCardLabel, walletLabel } from './accounts.copy';
import { idCardName, passportName, walletCardName } from './profile.rules';

const SANS = 'Segoe UI, sans-serif';
const GEORGIA = 'Georgia, serif';
const MONO = 'ui-monospace, Consolas, monospace';
const HEX_SIDES = 6;
const HALF_STEP = 0.5;
const INITIAL_RISE = 0.36;
const INITIAL_SIZE = 1.05;
const STAMP_INNER_GAP = 8;
const STAMP_RING_GAP = 4;
const FACETS = ['#5ea158', '#4a8b4e', '#2f7044', '#24623c', '#367a48', '#6aab60'];
const HEX = Array.from({ length: HEX_SIDES }, (_item, side) => ({
  across: Math.cos(((side - HALF_STEP) * Math.PI) / (HEX_SIDES / 2)),
  down: Math.sin(((side - HALF_STEP) * Math.PI) / (HEX_SIDES / 2)),
}));

type StampKind = 'Donor' | 'Planter';

const STAMPS: Record<StampKind, [string, string][]> = {
  Donor: [
    ['FUNDED', '#2f6b43'],
    ['RETIRED', '#a07a2e'],
    ['VERIFIED', '#3d7f6a'],
  ],
  Planter: [
    ['PLANTED', '#2f6b43'],
    ['UPLOADED', '#a07a2e'],
    ['VERIFIED', '#3d7f6a'],
  ],
};

/** Where each stamp lands on the right page: centre, tilt, radius. */
const STAMP_AT = [
  { x: 52, y: -24, tilt: -12, r: 19 },
  { x: 104, y: 6, tilt: 9, r: 17 },
  { x: 58, y: 40, tilt: -5, r: 18 },
];

type AvatarProps = { name: string; size?: number; across?: number; down?: number };

/** A faceted hexagon in the greens of the mark, with the first letter of the name. */
function Avatar({ name, size = 30, across = 0, down = 0 }: AvatarProps) {
  return (
    <g transform={`translate(${across} ${down})`}>
      {HEX.map((corner, side) => {
        const next = HEX[(side + 1) % HEX_SIDES] ?? corner;
        const fill = FACETS[side];

        return (
          <polygon
            key={fill}
            points={`0,0 ${corner.across * size},${corner.down * size} ${next.across * size},${next.down * size}`}
            fill={fill}
            stroke={fill}
            strokeWidth=".5"
          />
        );
      })}
      <text
        y={size * INITIAL_RISE}
        textAnchor="middle"
        fontSize={size * INITIAL_SIZE}
        fill="#fffef9"
        fontFamily={GEORGIA}
      >
        {initialOf(name)}
      </text>
    </g>
  );
}

/** One round of the stamps coming down, one after another, then fading; the coin bobs beside the book. */
const stampLoop = (select: Selector): gsap.core.Animation[] => {
  const stamps = select('.pp-stamp');

  STAMP_AT.forEach(({ x, y }, index) => gsap.set(stamps[index] ?? [], { svgOrigin: `${x} ${y}` }));
  const round = gsap
    .timeline({ repeat: -1, repeatDelay: 0.3 })
    .set(stamps, { opacity: 0, scale: 1.8 });

  round.to({}, { duration: 0.5 });
  stamps.forEach((stamp) =>
    round
      .to(stamp, { opacity: 0.92, scale: 1, duration: 0.22, ease: 'power4.in' })
      .to(select('.pp-book'), { y: 1.5, duration: 0.05, yoyo: true, repeat: 1, ease: 'none' })
      .to({}, { duration: 0.45 }),
  );
  round
    .to({}, { duration: 2 })
    .to(stamps, { opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power1.in' });

  return [
    round,
    gsap.to(select('.pp-coin'), {
      y: -6,
      duration: 1.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    }),
  ];
};

type PassportProps = { name: string; persona: string };

function Stamp({
  label,
  colour,
  at,
  index,
}: {
  label: string;
  colour: string;
  at: (typeof STAMP_AT)[number];
  index: number;
}) {
  const { x, y, tilt, r } = at;

  return (
    <g transform={`rotate(${tilt} ${x} ${y})`}>
      <g className="pp-stamp" opacity="0">
        <circle cx={x} cy={y} r={r} fill="none" stroke={colour} strokeWidth="1.8" />
        <circle
          cx={x}
          cy={y}
          r={r - STAMP_INNER_GAP}
          fill="none"
          stroke={colour}
          strokeWidth=".8"
        />
        <text fontSize="5" fontWeight="700" letterSpacing=".8" fill={colour} fontFamily={SANS}>
          <textPath href={`#pp-ring-${index}`}>
            {label} · {label} ·
          </textPath>
        </text>
        <path
          d={`M${x - STAMP_RING_GAP} ${y}l3 3 5.5-6`}
          fill="none"
          stroke={colour}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

/** The heading scene: the account's passport, its holder page and the stamps it has collected. */
export function PassportArt({ name, persona }: PassportProps) {
  const stamps = STAMPS[persona === 'Planter' ? 'Planter' : 'Donor'];
  const shown = passportName(name);

  return (
    <Scene build={stampLoop} deps={[persona]}>
      <defs>
        {stamps.map(([label], index) => {
          const { x, y, r } = STAMP_AT[index] ?? STAMP_AT[0]!;

          return (
            <path
              key={label}
              id={`pp-ring-${index}`}
              d={`M${x} ${y + r - STAMP_RING_GAP}a${r - STAMP_RING_GAP} ${r - STAMP_RING_GAP} 0 1 1 .01 0`}
            />
          );
        })}
      </defs>
      <ellipse cx="206" cy="196" rx="140" ry="8" fill="#153e2c" opacity=".1" />
      <g className="pp-book">
        <g transform="translate(206 112) rotate(-3)">
          <rect x="-138" y="-82" width="276" height="166" rx="10" fill="#24563a" />
          <rect x="-131" y="-76" width="130" height="154" rx="5" fill="#fffef9" />
          <rect x="1" y="-76" width="130" height="154" rx="5" fill="#fbfaf2" />
          <rect x="-6" y="-76" width="12" height="154" fill="#153e2c" opacity=".07" />
          <text
            x="-66"
            y="-56"
            textAnchor="middle"
            fontSize="6.5"
            letterSpacing="1.8"
            fill="#7b8c6c"
            fontFamily={SANS}
          >
            TREECORD ACCOUNT
          </text>
          <Avatar name={name} size={24} across={-66} down={-18} />
          <text
            x="-66"
            y="26"
            textAnchor="middle"
            fontSize="15"
            fill="#26422f"
            fontFamily={GEORGIA}
          >
            {shown}
          </text>
          <text
            x="-66"
            y="39"
            textAnchor="middle"
            fontSize="6.5"
            letterSpacing="1.6"
            fill="#8b967e"
            fontFamily={SANS}
          >
            {persona.toUpperCase()}
          </text>
          <rect x="-100" y="52" width="68" height="4" rx="2" fill="#e3ebd7" />
          <rect x="-100" y="61" width="46" height="4" rx="2" fill="#e3ebd7" />
          <text
            x="66"
            y="-56"
            textAnchor="middle"
            fontSize="6.5"
            letterSpacing="1.8"
            fill="#7b8c6c"
            fontFamily={SANS}
          >
            ON THE RECORD
          </text>
          <path d="M14-46h104" stroke="#e3ebd7" strokeDasharray="2 3" />
          {stamps.map(([label, colour], index) => (
            <Stamp
              key={label}
              label={label}
              colour={colour}
              at={STAMP_AT[index] ?? STAMP_AT[0]!}
              index={index}
            />
          ))}
        </g>
      </g>
      <g className="pp-coin">
        <ellipse cx="412" cy="186" rx="20" ry="4" fill="#153e2c" opacity=".1" />
        <FacetCoin cx={412} cy={96} r={24} id="pp" />
      </g>
    </Scene>
  );
}

const WALLET_GROUP = 4;
const FIRST_LINE_GROUPS = 5;

/** The wallet drawn as a card: `0x` and the 40 hex digits in groups of four, the first five on line one. */
export function WalletCard({
  wallet,
  name,
  persona,
}: {
  wallet: string;
  name: string;
  persona: string;
}) {
  const root = useRef<SVGSVGElement>(null);
  const groups = wallet.slice(2).match(new RegExp(`.{1,${WALLET_GROUP}}`, 'g')) ?? [];

  useSceneLoop(root, (select) =>
    gsap.fromTo(
      select('.wc-sweep'),
      { x: -180 },
      { x: 520, duration: 1.4, ease: 'power2.inOut', repeat: -1, repeatDelay: 3.2 },
    ),
  );

  return (
    <svg
      ref={root}
      className="wc-card"
      viewBox="0 0 340 200"
      role="img"
      aria-label={walletLabel(wallet)}
    >
      <defs>
        <linearGradient id="wc-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f6b43" />
          <stop offset="1" stopColor="#153e2c" />
        </linearGradient>
        <linearGradient id="wc-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="wc-clip">
          <rect width="340" height="200" rx="16" />
        </clipPath>
      </defs>
      <g clipPath="url(#wc-clip)">
        <rect width="340" height="200" fill="url(#wc-bg)" />
        <g transform="translate(214 18) scale(2.6)" opacity=".13" fill="#dfe9c8">
          <polygon points="32,5 44,25 20,25" />
          <polygon points="20,25 32,45 8,45" />
          <polygon points="44,25 56,45 32,45" />
        </g>
        <rect
          className="wc-sweep"
          x="0"
          y="-40"
          width="110"
          height="280"
          fill="url(#wc-light)"
          transform="skewX(-18)"
        />
      </g>
      <circle cx="28" cy="30" r="3.5" fill="#9fd08a" />
      <text x="38" y="33" fontSize="8.5" letterSpacing="1.8" fill="#dfe9c8" fontFamily={SANS}>
        BASE SEPOLIA
      </text>
      <text
        x="312"
        y="33"
        textAnchor="end"
        fontSize="13"
        fill="#eef3e6"
        fontFamily={GEORGIA}
        fontWeight="700"
      >
        treecord.
      </text>
      <rect x="26" y="58" width="38" height="28" rx="5" fill="#e6c46e" />
      <path d="M26 72h38M39 58v28M51 58v28" stroke="#c49a3e" strokeWidth="1" />
      <text x="26" y="122" fontSize="14" letterSpacing="1.2" fill="#f4f7ee" fontFamily={MONO}>
        0x {groups.slice(0, FIRST_LINE_GROUPS).join(' ')}
      </text>
      <text x="55" y="142" fontSize="14" letterSpacing="1.2" fill="#f4f7ee" fontFamily={MONO}>
        {groups.slice(FIRST_LINE_GROUPS).join(' ')}
      </text>
      <text x="26" y="178" fontSize="9" letterSpacing="1.8" fill="#dfe9c8" fontFamily={SANS}>
        {walletCardName(name)}
      </text>
      <text
        x="314"
        y="178"
        textAnchor="end"
        fontSize="9"
        letterSpacing="1.8"
        fill="#9fd08a"
        fontFamily={SANS}
      >
        {persona.toUpperCase()}
      </text>
    </svg>
  );
}

/** The ID card: the name, as typed so far, the email and the role. */
export function IdCard({ name, email, persona }: { name: string; email: string; persona: string }) {
  return (
    <svg
      className="wc-card id-card"
      viewBox="0 0 340 200"
      role="img"
      aria-label={idCardLabel(name, persona, email)}
    >
      <rect x=".5" y=".5" width="339" height="199" rx="16" fill="#fffef9" stroke="#d8e2cb" />
      <rect
        x="9"
        y="9"
        width="322"
        height="182"
        rx="11"
        fill="none"
        stroke="#dbe4cf"
        strokeDasharray="3 3"
      />
      <circle cx="28" cy="30" r="3.5" fill="#6f9a58" />
      <text x="38" y="33" fontSize="8.5" letterSpacing="1.8" fill="#7b8c6c" fontFamily={SANS}>
        TREECORD ACCOUNT
      </text>
      <g className="pl-float">
        <Avatar name={name} size={30} across={286} down={62} />
      </g>
      <text x="26" y="108" fontSize="26" fill="#26422f" fontFamily={GEORGIA}>
        {idCardName(name)}
      </text>
      <text x="26" y="132" fontSize="12" fill="#5f7052" fontFamily={MONO}>
        {email}
      </text>
      <path d="M26 152H314" stroke="#e3ebd7" />
      <text x="26" y="178" fontSize="9" letterSpacing="1.8" fill="#7b8c6c" fontFamily={SANS}>
        {persona.toUpperCase()}
      </text>
      <text
        x="314"
        y="178"
        textAnchor="end"
        fontSize="9"
        letterSpacing="1.8"
        fill="#6f9a58"
        fontFamily={SANS}
      >
        BASE SEPOLIA
      </text>
    </svg>
  );
}
