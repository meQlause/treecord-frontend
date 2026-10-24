import { gsap } from 'gsap';
import { Scene, type Selector } from './Scene';

// K29. Mockup planter-pages.jsx:77-88. Device (and evidence): the key turns in the phone, the signature draws across
// to the record, the seal lands. Palette: design-system §2.4.
const INK = '#26422f';
const PAPER = '#fffef9';
const GOLD = '#c49a3e';
const SEAL = '#2E9E5B';
const RING = '#eef3e6';
const MONO = 'ui-monospace, Consolas, monospace';
const BOUNCE = 'back.out(3)';

const HEX = [
  { hex: 'a3', left: 204 },
  { hex: 'f9', left: 224 },
  { hex: '0c', left: 244 },
  { hex: '7e', left: 264 },
  { hex: 'b2', left: 284 },
];
const TEXT_LINES = ['34', '46', '58', '70'];

const keyLoop = (select: Selector): gsap.core.Timeline =>
  gsap
    .timeline({ repeat: -1, repeatDelay: 0.6 })
    .fromTo(
      select('.ka-key'),
      { rotation: -60, svgOrigin: '149 116' },
      { rotation: 0, duration: 0.6, ease: 'back.out(2)' },
    )
    .fromTo(
      select('.ka-wave'),
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' },
    )
    .fromTo(select('.ka-hex'), { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.06 }, '<.2')
    .fromTo(
      select('.ka-seal'),
      { scale: 0, transformOrigin: '50% 50%' },
      { scale: 1, duration: 0.45, ease: BOUNCE },
    )
    .to({}, { duration: 1.6 })
    .to(select('.ka-wave,.ka-hex'), { opacity: 0, duration: 0.4 });

function Phone() {
  return (
    <g transform="translate(110 50) rotate(-5)">
      <rect width="78" height="140" rx="12" fill={INK} />
      <rect x="6" y="14" width="66" height="112" rx="5" fill="#dfe9d2" />
      <circle cx="39" cy="66" r="22" fill={PAPER} />
    </g>
  );
}

function Record() {
  return (
    <g transform="translate(318 66) rotate(4)">
      <rect width="96" height="118" rx="8" fill={PAPER} stroke="#d6e0ca" />
      <rect x="14" y="18" width="56" height="6" rx="3" fill={INK} opacity=".8" />
      {TEXT_LINES.map((top) => (
        <rect key={top} x="14" y={top} width="62" height="4" rx="2" fill="#e3ebd7" />
      ))}
    </g>
  );
}

/** K29. Heading art for the device key and evidence pages. Decorative; the page heading beside it names the page. */
export function KeyArt() {
  return (
    <Scene build={keyLoop}>
      <Phone />
      <g className="ka-key">
        <circle cx="141" cy="114" r="8" fill="none" stroke={GOLD} strokeWidth="4" />
        <path d="M149 116h18m-6 0v7m5-7v5" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      </g>
      <path
        className="ka-wave"
        d="M196 116c14-18 22 18 36 0s22 18 36 0 22 18 36 0"
        fill="none"
        stroke="#2f6b43"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="1"
        pathLength="1"
      />
      {HEX.map(({ hex, left }) => (
        <text
          key={hex}
          className="ka-hex"
          x={left}
          y="146"
          fontSize="10"
          fill="#6f8462"
          fontFamily={MONO}
          opacity="0"
        >
          {hex}
        </text>
      ))}
      <Record />
      <g className="ka-seal" transform="translate(398 168)">
        <circle r="17" fill={SEAL} stroke={RING} strokeWidth="2.4" />
        <path
          d="M-7 0l5 5 9-10"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </Scene>
  );
}
