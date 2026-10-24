import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';
import { watchOffscreen } from '../motion/offscreen';

// Mockup art.jsx:18. Every icon lives: each has a small loop that says what it does (the pin bobs, the clock hand
// turns, arrows lean toward where they go, wifi waves try to connect). The loops are CSS (style.css) and pause with the
// motion toggle, a hidden tab, reduced motion, and while the icon is off screen (the motion gate, design-system §2.10).
const SHAPES = {
  home: (
    <>
      <path d="m3 11 9-8 9 8v10H3Z" />
      <path d="M9 21v-7h6v7" />
      <path className="icon-leaf" d="M15 7q0-5 5-5-1 5-5 5Z" />
    </>
  ),
  campaign: (
    <>
      <path d="M3 20h18M7 18v-7m10 7V9" />
      <path className="icon-leaf" d="m7 3-5 9h10Zm10-2-4 8h8Z" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <path d="M4 6V4h14v2" />
      <path className="ic-shift" d="M21 11h-6v5h6" />
      <path d="M17 13.5h.1" />
    </>
  ),
  payout: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v8m2-7H9a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H8" />
      <path className="ic-tick" d="m14 19 3 3 5-7" />
    </>
  ),
  carbon: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path className="icon-leaf" d="M7 16c-2-7 2-9 10-9 0 7-3 10-8 8m-2 2 7-7" />
    </>
  ),
  flag: (
    <>
      <path d="M5 22V3" />
      <path className="icon-leaf" d="M5 4c5-5 9 5 15 0v10c-6 5-10-5-15 0" />
    </>
  ),
  profile: (
    <>
      <circle className="ic-bob" cx="12" cy="7" r="4" />
      <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
    </>
  ),
  plus: <path className="ic-pop" d="M12 5v14M5 12h14" />,
  leaf: (
    <>
      <path
        className="ic-leaf-back"
        d="M5 18C0 7 10 3 20 3c0 10-3 18-12 16"
        fill="currentColor"
        opacity=".18"
      />
      <path className="icon-leaf" d="M5 20 16 9M5 16C2 7 10 4 20 4c0 10-4 17-12 14" />
    </>
  ),
  tree: (
    <>
      <path d="M12 21v-9m0 5-4-4m4 1 4-4" />
      <path className="icon-leaf" d="M7 16a4 4 0 0 1-2-7 5 5 0 0 1 10-3 5 5 0 0 1 3 9" />
    </>
  ),
  pin: (
    <>
      <path className="ic-shadow" d="M9.5 22.6h5" opacity=".45" />
      <g className="ic-bob">
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle className="ic-pulse" cx="12" cy="10" r="2" />
      </g>
    </>
  ),
  arrow: <path className="ic-lean-right" d="M5 12h14m-6-6 6 6-6 6" />,
  back: <path className="ic-lean-left" d="M19 12H5m6-6-6 6 6 6" />,
  down: <path className="ic-lean-down" d="m6 9 6 6 6-6" />,
  close: <path className="ic-turn-quarter" d="m6 6 12 12M6 18 18 6" />,
  filter: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle className="ic-knob-a" cx="9" cy="7" r="2" fill="var(--paper)" />
      <circle className="ic-knob-b" cx="15" cy="17" r="2" fill="var(--paper)" />
    </>
  ),
  pause: (
    <>
      <path className="ic-bar" d="M8 5v14" strokeWidth="3" />
      <path className="ic-bar ic-bar-late" d="M16 5v14" strokeWidth="3" />
    </>
  ),
  play: <path className="ic-pop" d="m8 5 11 7-11 7Z" />,
  check: <path className="ic-tick" d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12l3 2" />
      <path className="ic-hand" d="M12 12V6.5" />
    </>
  ),
  copy: (
    <>
      <path d="M15 5V4H4v11h1" />
      <rect className="ic-shift" x="8" y="8" width="12" height="12" rx="2" />
    </>
  ),
  retry: (
    <g className="ic-turn">
      <path d="M20 10a8 8 0 1 0 0 6M20 4v6h-6" />
    </g>
  ),
  warning: (
    <>
      <path d="M10 4 2 18a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 4a2 2 0 0 0-4 0Z" />
      <path className="ic-blink" d="M12 9v4m0 4v.1" />
    </>
  ),
  wifi: (
    <>
      <path className="ic-wave ic-wave-3" d="M3 7a16 16 0 0 1 18 0" />
      <path className="ic-wave ic-wave-2" d="M6 11a11 11 0 0 1 12 0" />
      <path className="ic-wave" d="M9 15a5 5 0 0 1 6 0" />
      <path d="M12 19h.01M3 3l18 18" />
    </>
  ),
  sliders: (
    <>
      <path d="M6 3v18M18 3v18M12 3v18" />
      <path className="ic-slide" d="M3 8h6" strokeWidth="3" />
      <path className="ic-slide ic-slide-up" d="M9 16h6" strokeWidth="3" />
      <path className="ic-slide ic-slide-late" d="M15 6h6" strokeWidth="3" />
    </>
  ),
};

export type IconName = keyof typeof SHAPES;

const DEFAULT_SIZE = 20;
const PHASE_STEP = 0.61;
const PHASE_CYCLE = 4;
let instances = 0;

/** A different phase per instance, so a row of identical icons breathes out of step instead of in lockstep. */
const nextPhase = (): string => {
  const phase = -((instances * PHASE_STEP) % PHASE_CYCLE);

  instances += 1;

  return `${phase.toFixed(2)}s`;
};

type IconProps = Omit<ComponentPropsWithoutRef<'svg'>, 'name'> & {
  name?: IconName;
  size?: number;
};

/** K1. Decorative (`aria-hidden`): whatever carries meaning around it carries the accessible name (rule 11). */
export function Icon({
  name = 'leaf',
  size = DEFAULT_SIZE,
  className = '',
  style,
  ...props
}: IconProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [phase] = useState(nextPhase);

  useEffect(() => (ref.current === null ? undefined : watchOffscreen(ref.current)), []);

  return (
    <svg
      ref={ref}
      className={`ic ic--${name} ${className}`}
      style={{ '--phase': phase, ...style } as CSSProperties}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {SHAPES[name]}
    </svg>
  );
}
