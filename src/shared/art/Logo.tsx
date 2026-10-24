import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';
import { watchOffscreen } from '../motion/offscreen';

// K2, mockup art.jsx:58. Four crown facets, two trunk halves and the green "proven" badge.
const CROWN = [
  ['32,5 44,25 20,25', '#5ea158'],
  ['20,25 32,45 8,45', '#24623c'],
  ['44,25 56,45 32,45', '#4a8b4e'],
  ['20,25 44,25 32,45', '#25633d'],
] as const;
const TRUNK = [
  ['29,45 32,45 32,58 29,58', '#5e4030'],
  ['32,45 35,45 35,58 32,58', '#8b5e3c'],
] as const;
const DEFAULT_SIZE = 36;
const FACET_STROKE = '.6';

const Facet = ({ points, fill }: { points: string; fill: string }) => (
  <polygon
    points={points}
    fill={fill}
    stroke={fill}
    strokeWidth={FACET_STROKE}
    strokeLinejoin="round"
  />
);

type LogoProps = Omit<ComponentPropsWithoutRef<'svg'>, 'width' | 'height'> & { size?: number };

export function Logo({ size = DEFAULT_SIZE, className = '', ...props }: LogoProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => (ref.current === null ? undefined : watchOffscreen(ref.current)), []);

  return (
    <svg
      ref={ref}
      className={`logo ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g className="lg-crown">
        {CROWN.map(([points, fill]) => (
          <Facet key={points} points={points} fill={fill} />
        ))}
      </g>
      {TRUNK.map(([points, fill]) => (
        <Facet key={points} points={points} fill={fill} />
      ))}
      <g className="lg-badge">
        <circle
          cx="49"
          cy="49"
          r="10"
          fill="#2e9e5b"
          stroke="var(--paper, #f7f6f2)"
          strokeWidth="2.5"
        />
        <path
          className="lg-check"
          d="M44.5,49 L48,52.5 L54,45.5"
          pathLength="1"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
