import { useRef } from 'react';
import { useRise } from './useRise';

const RADIUS = 30;
const ARC = Math.PI * RADIUS;
const ARC_PATH = 'M10 44a30 30 0 0 1 60 0';
const PERCENT = 100;

type PayoutGaugeProps = {
  paid: number;
  budget: number;
};

/** K26. A half-circle gauge of how much of the payout budget is paid. Mockup donor.jsx:159. */
export function PayoutGauge({ paid, budget }: PayoutGaugeProps) {
  const root = useRef<SVGSVGElement>(null);
  const share = budget > 0 ? Math.min(1, paid / budget) : 0;

  useRise(root);

  return (
    <svg ref={root} className="pc-gauge" viewBox="0 0 80 50" aria-hidden="true">
      <path d={ARC_PATH} fill="none" stroke="#e3ebd7" strokeWidth="7" strokeLinecap="round" />
      <path
        className="rise"
        d={ARC_PATH}
        fill="none"
        stroke="#c49a3e"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${ARC * share} ${ARC}`}
      />
      <text
        x="40"
        y="42"
        textAnchor="middle"
        fontSize="13"
        fill="#26422f"
        fontFamily="Georgia, serif"
      >
        {Math.round(share * PERCENT)}%
      </text>
    </svg>
  );
}
