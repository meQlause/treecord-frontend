// P10. Always a `progressbar` with a value (design-system §4.1). `bar` is the 5 px catalog bar, `meter` the 10 px
// gradient one; they keep two fills so neither drifts into the other.
const VARIANT = {
  bar: { track: 'progress', fill: 'span' },
  meter: { track: 'cb-inv-bar', fill: 'i' },
} as const;

const FULL = 100;
const METER_FLOOR = 1;

type ProgressProps = {
  /** What the bar measures, e.g. "Funding progress"; also its accessible name. */
  label: string;
  /** 0–100; clamped. */
  percent: number;
  variant?: keyof typeof VARIANT;
  className?: string;
};

export function Progress({ label, percent, variant = 'bar', className = '' }: ProgressProps) {
  const { track, fill: Fill } = VARIANT[variant];
  const clamped = Math.min(FULL, Math.max(0, percent));
  // a meter keeps a visible sliver at 0 %
  const width = variant === 'meter' ? Math.max(METER_FLOOR, clamped) : clamped;

  return (
    <div
      className={`${track} ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={FULL}
    >
      <Fill style={{ width: `${width}%` }} />
    </div>
  );
}
