import { useRef } from 'react';
import { useRise } from './useRise';

const FILLS = ['#dfe9d2', '#b9d1a3', '#78a865', '#2f6b43'];
const CENTRE = 110;
const FULL_WIDTH = 200;
const MIN_WIDTH = 6;
const TOP = 2;
const ROW_STEP = 15;
const BAR_HEIGHT = 11;
const BAR_RADIUS = 5.5;

type CarbonFunnelProps = {
  /** Label and amount per stage, widest first: estimate, reserved, allocated, held. A missing amount draws the minimum. */
  rows: readonly (readonly [string, number | null])[];
};

/** K27. The carbon stages as centred bars, each as wide as its amount (area-true, so by square root). Mockup donor.jsx:168. */
export function CarbonFunnel({ rows }: CarbonFunnelProps) {
  const root = useRef<SVGSVGElement>(null);
  const max = Math.max(...rows.map(([, amount]) => amount ?? 0), 1);

  useRise(root);

  return (
    <svg ref={root} className="pc-art pc-funnel" viewBox="0 0 220 60" aria-hidden="true">
      {rows.map(([label, amount], index) => {
        const width = Math.max(MIN_WIDTH, FULL_WIDTH * Math.sqrt((amount ?? 0) / max));

        return (
          <rect
            key={label}
            className="grow"
            x={CENTRE - width / 2}
            y={TOP + index * ROW_STEP}
            width={width}
            height={BAR_HEIGHT}
            rx={BAR_RADIUS}
            fill={FILLS[index]}
          />
        );
      })}
    </svg>
  );
}
