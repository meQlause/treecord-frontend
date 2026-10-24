import type { ReactNode } from 'react';
import { Icon, type IconName } from '../art/Icon';

const EMBLEM_SIZE = 24;
const CHECK_SIZE = 14;
const LEAF_SIZE = 20;
const PERCENT = 100;
const FINE_BELOW = 10;

type StockCardProps = {
  label: string;
  icon: IconName;
  caption: ReactNode;
  value: ReactNode;
  unit: string;
  /** The second line under the balance: a label, its value and, if different from `unit`, its own unit. */
  sub: { label: ReactNode; value: ReactNode; unit?: string };
  /** The share bar, 0 to 1. */
  share: number;
  shareLabel: string;
  shareNote: ReactNode;
  note: ReactNode;
};

/** Under 10 % a share keeps one decimal, so a sliver is not shown as 0 %. */
const percentText = (percent: number): string =>
  percent > 0 && percent < FINE_BELOW ? percent.toFixed(1) : String(Math.round(percent));

/** K19. The dark summary card on top of a rail: the balance, a second figure and a share bar. Mockup carbon.jsx:142. */
export function StockCard({
  label,
  icon,
  caption,
  value,
  unit,
  sub,
  share,
  shareLabel,
  shareNote,
  note,
}: StockCardProps) {
  const percent = share * PERCENT;

  return (
    <section className="carbon-wallet cb-stock-card" aria-label={label}>
      <div className="cw-issued">
        <div className="cw-header">
          <h2>{label}</h2>
          <span className="cw-emblem">
            <Icon name={icon} size={EMBLEM_SIZE} />
          </span>
        </div>
        <span className="cw-label">{caption}</span>
        <div className="cw-balance">
          <strong>{value}</strong>
          <span>{unit}</span>
        </div>
        <div className="cw-allocation">
          <span>
            <Icon name="check" size={CHECK_SIZE} />
            {sub.label}
          </span>
          <strong>
            {sub.value} <small>{sub.unit ?? unit}</small>
          </strong>
        </div>
      </div>
      <div className="cw-reservation">
        <div className="cw-reservation-icon">
          <Icon name="leaf" size={LEAF_SIZE} />
        </div>
        <div>
          <span>{shareLabel}</span>
          <small>{shareNote}</small>
        </div>
        <strong>{percentText(percent)}%</strong>
      </div>
      <div
        className="cb-inv-bar cb-rail-bar"
        role="progressbar"
        aria-label={shareLabel}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
      >
        <i style={{ width: `${Math.max(1, percent)}%` }} />
      </div>
      <p className="cw-note">{note}</p>
    </section>
  );
}
