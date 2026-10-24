// The art only S09 uses: the heading scene (mockup my-carbon.jsx:183-242, `RetireArt`). The credit goes into the on-chain
// block and locks; the link draws to the certificate and the stamp comes down: RETIRED. One GSAP loop, run through the
// motion gate (design-system §2.10). Decorative.
import { gsap } from 'gsap';
import { Scene, type Selector } from '../../shared/art/Scene';
import { FacetCoin } from '../../shared/ui/FacetCoin';
import type { Retirement } from './certificate.api';
import { tonnes } from '../../shared/format/carbon';
import { artName } from './certificate.rules';

const COIN = { cx: 378, cy: 70, r: 18 };
const SANS = 'Segoe UI, sans-serif';
const GEORGIA = 'Georgia, serif';
const FORWARD = '+=0.5';
const HOLD = '+=0.15';
const TOGETHER = '<';

/** One round of the stamp: coin in, block locks, link draws, stamp comes down and lifts, then a long rest. */
const build = (select: Selector): gsap.core.Timeline => {
  gsap.set(select('.ra-stamp'), { svgOrigin: '226 146' });
  gsap.set(select('.ra-ink'), { svgOrigin: '224 140' });
  gsap.set(select('.ra-coin'), { svgOrigin: '378 70' });

  return gsap
    .timeline({ repeat: -1, repeatDelay: 0.4, defaults: { ease: 'power3.out' } })
    .set(select('.ra-coin'), { y: 0, scale: 1, opacity: 1 })
    .set(select('.ra-shackle'), { y: -5 })
    .set(select('.ra-link'), { strokeDashoffset: 1, opacity: 1 })
    .set(select('.ra-ink'), { opacity: 0, scale: 1.35 })
    .set(select('.ra-stamp'), { y: -72, rotation: -10 })
    .set(select('.ra-glow'), { opacity: 0 })
    .from(select('.ra-coin'), { y: -26, opacity: 0, duration: 0.6 })
    .to(select('.ra-coin'), { y: 58, duration: 0.5, ease: 'power2.in' }, FORWARD)
    .to(select('.ra-coin'), { scaleY: 0.15, opacity: 0, duration: 0.18, ease: 'power1.in' })
    .to(select('.ra-glow'), { opacity: 1, duration: 0.15, yoyo: true, repeat: 1 }, TOGETHER)
    .to(select('.ra-shackle'), { y: 0, duration: 0.35, ease: 'back.out(3)' })
    .to(select('.ra-link'), { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' })
    .to(select('.ra-stamp'), { y: 0, rotation: 0, duration: 0.38, ease: 'power3.in' })
    .to(select('.ra-cert'), { y: 2, duration: 0.06, yoyo: true, repeat: 1, ease: 'none' })
    .to(select('.ra-ink'), { opacity: 0.9, scale: 1, duration: 0.2, ease: 'power2.out' }, TOGETHER)
    .to(select('.ra-stamp'), { y: -72, rotation: -10, duration: 0.6, ease: 'power2.out' }, HOLD)
    .to({}, { duration: 2.2 })
    .to(select('.ra-ink,.ra-link'), { opacity: 0, duration: 0.5, ease: 'power1.in' });
};

function Certificate({ record }: { record: Pick<Retirement, 'amount' | 'beneficiary'> }) {
  return (
    <g className="ra-cert">
      <g transform="translate(160 104) rotate(-4)">
        <rect
          x="-110"
          y="-78"
          width="220"
          height="156"
          rx="8"
          fill="#153e2c"
          opacity=".12"
          transform="translate(5 7)"
        />
        <rect x="-110" y="-78" width="220" height="156" rx="8" fill="#fffef9" />
        <rect
          x="-100"
          y="-68"
          width="200"
          height="136"
          rx="4"
          fill="none"
          stroke="#d6e0ca"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <text
          y="-48"
          textAnchor="middle"
          fontSize="7"
          letterSpacing="2"
          fill="#7b8c6c"
          fontFamily={SANS}
        >
          RETIREMENT RECORD
        </text>
        <text y="-18" textAnchor="middle" fontSize="30" fill="#26422f" fontFamily={GEORGIA}>
          {tonnes(record.amount)}
        </text>
        <text
          y="-5"
          textAnchor="middle"
          fontSize="6.5"
          letterSpacing="1.6"
          fill="#8b967e"
          fontFamily={SANS}
        >
          tCO₂e RETIRED
        </text>
        <path d="M-76 6H76" stroke="#e3ebd7" />
        <text x="-76" y="26" fontSize="14" fontStyle="italic" fill="#3f6b35" fontFamily={GEORGIA}>
          For {artName(record.beneficiary)}
        </text>
        <rect x="-76" y="40" width="70" height="4" rx="2" fill="#e3ebd7" />
        <rect x="-76" y="50" width="46" height="4" rx="2" fill="#e3ebd7" />
      </g>
      <g transform="rotate(-14 224 140)">
        <g className="ra-ink" opacity="0">
          <circle cx="224" cy="140" r="25" fill="none" stroke="#2f6b43" strokeWidth="2.2" />
          <circle cx="224" cy="140" r="15" fill="none" stroke="#2f6b43" strokeWidth="1" />
          <text
            fontSize="6.4"
            fontWeight="700"
            letterSpacing="1.2"
            fill="#2f6b43"
            fontFamily={SANS}
          >
            <textPath href="#ra-ring">RETIRED · FOR GOOD · RETIRED ·</textPath>
          </text>
          <path
            d="M218 140l4.5 4.5 8-9"
            fill="none"
            stroke="#2f6b43"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </g>
  );
}

function Block() {
  return (
    <>
      <ellipse cx="378" cy="200" rx="42" ry="6" fill="#153e2c" opacity=".12" />
      <polygon points="378,118 414,136 378,154 342,136" fill="#5a9663" />
      <polygon points="342,136 378,154 378,196 342,178" fill="#2f6b43" />
      <polygon points="378,154 414,136 414,178 378,196" fill="#24563a" />
      <path d="M342 157l36 18M378 175l36-18" stroke="#ffffff22" />
      <path d="M367 131l22 10" stroke="#153e2c" strokeWidth="4.5" strokeLinecap="round" />
      <path
        className="ra-glow"
        d="M367 131l22 10"
        stroke="#f0d27a"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0"
      />
      <g transform="translate(396 160) skewY(-26.5)">
        <path
          className="ra-shackle"
          d="M2.5 0v-5a4.5 4.5 0 0 1 9 0v5"
          fill="none"
          stroke="#e6c46e"
          strokeWidth="2.2"
        />
        <rect width="14" height="11" rx="2" fill="#e6c46e" />
        <circle cx="7" cy="5" r="1.6" fill="#8a6a27" />
      </g>
      <text
        x="378"
        y="216"
        textAnchor="middle"
        fontSize="7"
        letterSpacing="1.6"
        fill="#5b7350"
        fontFamily={SANS}
      >
        ON-CHAIN
      </text>
    </>
  );
}

export function RetireArt({ record }: { record: Pick<Retirement, 'amount' | 'beneficiary'> }) {
  return (
    <Scene build={build}>
      <defs>
        <path id="ra-ring" d="M224 160a20 20 0 1 1 .01 0" />
      </defs>
      <Certificate record={record} />
      <Block />
      <path
        className="ra-link"
        d="M340 150C312 150 300 108 272 100"
        fill="none"
        stroke="#c49a3e"
        strokeWidth="1.6"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset="1"
      />
      <g className="ra-coin">
        <FacetCoin {...COIN} id="ra" />
      </g>
      <g className="ra-stamp">
        <g transform="translate(226 146)">
          <rect x="-27" y="-7" width="54" height="7" rx="2" fill="#2f6b43" />
          <rect x="-23" y="-20" width="46" height="13" rx="2" fill="#8B5E3C" />
          <rect x="-23" y="-20" width="46" height="3" rx="1.5" fill="#a87650" />
          <rect x="-5" y="-34" width="10" height="14" fill="#5E4030" />
          <ellipse cy="-41" rx="13" ry="9" fill="#c49a3e" />
          <ellipse cy="-44" rx="7" ry="3" fill="#e6c46e" />
        </g>
      </g>
    </Scene>
  );
}
