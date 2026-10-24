// The heading scene of S16 (mockup planter-pages.jsx:35-43, `TreesArt`): the check-in pin walks the three ages of a tree;
// each check lands and pays a coin. One GSAP loop through the motion gate (design-system §2.10). Decorative.
import { gsap } from 'gsap';
import { Scene, type Selector } from '../../shared/art/Scene';

const AGES = [
  { x: 150, label: 'MONTH 0' },
  { x: 250, label: 'MONTH 12' },
  { x: 360, label: 'MONTH 36' },
];
const SANS = 'Segoe UI, sans-serif';
const PIN_START = 60;
const WIDEN = 8;
const RISE = 30;
const SCALE_STEP = 0.6;
const BASE_SCALE = 1.2;
const CHECK_SHIFT = 6;
const BASE_RING = 22;
const CHECK_OFFSET = 20;
const COIN_FLOOR = 150;

/** One walk: the pin comes in, visits each age, hops, the check lands, a coin floats up; then a rest. */
const walk = (select: Selector): gsap.core.Timeline => {
  const checks = select('.pa-check');
  const coins = select('.pa-coin');
  const round = gsap
    .timeline({ repeat: -1, repeatDelay: 0.5 })
    .set(checks, { scale: 0, transformOrigin: '50% 50%' })
    .set(coins, { y: 0, opacity: 0 })
    .set(select('.pa-pin'), { x: (AGES[0]?.x ?? 0) - PIN_START, opacity: 0 })
    .to(select('.pa-pin'), { opacity: 1, duration: 0.3 });

  AGES.forEach(({ x }, index) => {
    round
      .to(select('.pa-pin'), { x, duration: 0.7, ease: 'power2.inOut' })
      .to(select('.pa-pin'), { y: -8, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' })
      .to(checks[index] ?? [], { scale: 1, duration: 0.35, ease: 'back.out(3)' }, '<0.1')
      .fromTo(
        coins[index] ?? [],
        { y: 0, opacity: 1 },
        { y: -34, opacity: 0, duration: 1, ease: 'power1.out' },
        '<',
      );
  });

  return round.to({}, { duration: 1.4 }).to(select('.pa-pin'), { opacity: 0, duration: 0.3 });
};

type AgeProps = { x: number; label: string; index: number };

function Age({ x, label, index }: AgeProps) {
  const scale = BASE_SCALE + index * SCALE_STEP;
  const up = RISE * index;

  return (
    <g>
      <ellipse cx={x} cy="190" rx={BASE_RING + index * WIDEN} ry="5" fill="#153e2c" opacity=".1" />
      <g transform={`translate(${x} 188) scale(${scale})`}>
        <polygon points="0,-34 9,-18 -9,-18" fill="#6aab60" />
        <polygon points="0,-34 9,-18 0,-18" fill="#3f844e" />
        <polygon points="0,-24 13,-5 -13,-5" fill="#4a8b4e" />
        <polygon points="0,-24 13,-5 0,-5" fill="#24623c" />
        <rect x="-1.6" y="-5" width="3.2" height="7" fill="#7a5a40" />
      </g>
      <g
        className="pa-check"
        transform={`translate(${x + CHECK_OFFSET + index * CHECK_SHIFT} ${COIN_FLOOR - up})`}
      >
        <circle r="10" fill="#2E9E5B" />
        <path
          d="M-4.5 0l3 3 5.5-6"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g className="pa-coin">
        <g transform={`translate(${x} ${COIN_FLOOR - up})`}>
          <path d="M-11 0v4a11 3.6 0 0 0 22 0V0" fill="#c49a3e" />
          <ellipse rx="11" ry="3.6" fill="#e6c46e" />
        </g>
      </g>
      <text
        x={x}
        y="214"
        textAnchor="middle"
        fontSize="8"
        letterSpacing="1.6"
        fill="#5b7350"
        fontFamily={SANS}
      >
        {label}
      </text>
    </g>
  );
}

export function TreesArt() {
  return (
    <Scene build={walk}>
      {AGES.map(({ x, label }, index) => (
        <Age key={x} x={x} label={label} index={index} />
      ))}
      <g className="pa-pin" opacity="0">
        <g transform="translate(0 196)">
          <path d="M0 0-7-10A8.6 8.6 0 1 1 7-10Z" fill="#2f6b43" />
          <circle cy="-15" r="3" fill="#f3f8ea" />
        </g>
      </g>
    </Scene>
  );
}
