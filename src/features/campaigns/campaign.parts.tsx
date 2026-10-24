// S04's read pieces (s04-campaign.md §1): the hero, the fact strip, the budget chart, the milestone track and the plot
// grid. Each takes the figures it draws; none fetches.
import { useState, type CSSProperties } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { Photo } from '../../shared/art/Photo';
import { number } from '../../shared/format/number';
import { Badge } from '../../shared/ui/Badge';
import { artForSpecies } from './art';
import type { BudgetRow, CampaignDetail, ScheduleStop } from './campaigns.api';
import {
  BACK_TO_CAMPAIGNS,
  BUDGET_LABEL,
  FACT_COMMITMENT,
  FACT_NETWORK,
  FACT_RADIUS,
  FACT_TREES,
  SLOTS_ANCHOR,
  SLOTS_OPEN,
  SLOTS_PLANTED,
  STATUS_LABEL,
  monthsLabel,
  networkName,
  radiusLabel,
  stopLabel,
  trackLabel,
} from './campaigns.copy';
import { cellsOf } from './campaign.rules';
import { usdc } from './campaigns.rules';
import { untitledCampaign } from '../../shared/ui/approved-copy';

const ICON = 15;
const BACK_ICON = 17;
const HERO_ICON = 17;
const FACT_ICON = 24;
/** A title this long would run out of the fixed-height hero; it wraps and the hero grows (P-10b). */
const LONG_TITLE = 60;
const PERCENT = 100;
const SEGMENT_LABEL_BPS = 1000;

export function BackLink() {
  return (
    <Link className="back-link" to="/campaigns">
      <Icon name="back" size={BACK_ICON} />
      {BACK_TO_CAMPAIGNS}
    </Link>
  );
}

function HeroSpecies({ species }: { species: CampaignDetail['species'] }) {
  return (
    species !== null && (
      <span className="hero-species">
        <Icon name="leaf" size={ICON} />
        {species.name}
      </span>
    )
  );
}

function HeroRegion({ region }: { region: CampaignDetail['region'] }) {
  return (
    region?.name != null && (
      <span className="hero-location">
        <Icon name="pin" size={HERO_ICON} />
        {region.name}
      </span>
    )
  );
}

export function Hero({ campaign }: { campaign: CampaignDetail }) {
  const title = campaign.title ?? untitledCampaign(campaign.address);
  const long = title.length > LONG_TITLE;

  return (
    <section className={long ? 'detail-hero wrap-title' : 'detail-hero'}>
      <Photo kind={artForSpecies(campaign.species?.code)} decorative={false} />
      <div className="hero-copy">
        <div className="hero-tags">
          <Badge status={STATUS_LABEL[campaign.status]} />
          <HeroSpecies species={campaign.species} />
        </div>
        <h1 className={long ? 'wrap-any' : undefined}>{title}</h1>
        <HeroRegion region={campaign.region} />
      </div>
    </section>
  );
}

/** `trees` is the (counting) tree target the fact shows. */
export function FactStrip({ campaign, trees }: { campaign: CampaignDetail; trees: number }) {
  const radius = campaign.region === null ? '—' : radiusLabel(number(campaign.region.radiusM));

  return (
    <div className="fact-strip">
      <div>
        <Icon name="tree" size={FACT_ICON} />
        <span>{FACT_TREES}</span>
        <strong>{number(trees)}</strong>
      </div>
      <div>
        <Icon name="clock" size={FACT_ICON} />
        <span>{FACT_COMMITMENT}</span>
        <strong>{monthsLabel(campaign.commitmentUnits)}</strong>
      </div>
      <div>
        <Icon name="pin" size={FACT_ICON} />
        <span>{FACT_RADIUS}</span>
        <strong>{radius}</strong>
      </div>
      <div>
        <span className="fact-dot" />
        <span>{FACT_NETWORK}</span>
        <strong>{networkName(campaign.chainId)}</strong>
      </div>
    </div>
  );
}

/** Budget: one thick stacked bar; pointing at a row (or a segment) lights its share and dims the rest (FR-037 #2). */
export function BudgetChart({ budget }: { budget: readonly BudgetRow[] }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div
      className={active === null ? 'budget-chart' : 'budget-chart has-active'}
      onMouseLeave={() => setActive(null)}
    >
      <div className="budget-stack" aria-hidden="true">
        {budget.map(({ bucket, bps }, index) => (
          <span
            key={bucket}
            className={active === index ? `budget-${index} active` : `budget-${index}`}
            style={{ flexGrow: bps }}
            onMouseEnter={() => setActive(index)}
          >
            {bps >= SEGMENT_LABEL_BPS && <em>{bps / PERCENT}%</em>}
          </span>
        ))}
      </div>
      <ul className="budget-rows">
        {budget.map(({ bucket, bps, amount }, index) => (
          <li
            key={bucket}
            className={active === index ? 'active' : ''}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the row is focusable so a keyboard lights its segment too (FR-037 #2)
            tabIndex={0}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
          >
            <span className="budget-name">
              <i className={`budget-${index}`} />
              {BUDGET_LABEL[bucket] ?? bucket}
            </span>
            <span className="budget-share">{bps / PERCENT}%</span>
            <strong>
              {usdc(amount)} <small>USDC</small>
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// the track's own geometry (mockup main.jsx:127): month 0 to 36 on a 640 x 160 canvas
const TRACK_LEFT = 40;
const TRACK_RIGHT = 600;
const TRACK_Y = 112;
const TRACK_MONTHS = 36;
const COIN_RADIUS = 9;
const COIN_RISE = 30;
const STEM_TOP = 8;
const STEM_LENGTH = 22;
const DOT_RADIUS = 6;
const MONTH_DROP = 26;
const SHARE_RISE = 38;
const INNER_RATIO = 0.62;
const LEAF = { left: 0.32, drop: 0.1, up: 0.6, wide: 0.64, rise: 0.2, back: 0.5 };
const SHARE_UNIT = 10;

/** The leaf on a coin, in the mockup's relative curves. */
const leafPath = (posX: number, posY: number, radius: number): string => {
  const first = [
    radius * LEAF.left,
    -radius * LEAF.up,
    radius * LEAF.wide,
    -radius * LEAF.rise,
  ].join(' ');
  const back = [
    -radius * LEAF.left,
    radius * LEAF.back,
    -radius * LEAF.wide,
    radius * LEAF.rise,
  ].join(' ');

  return `M${posX - radius * LEAF.left} ${posY + radius * LEAF.drop}q${first}q${back}Z`;
};

function Stop({ stop, index }: { stop: ScheduleStop; index: number }) {
  const posX = TRACK_LEFT + (stop.month / TRACK_MONTHS) * (TRACK_RIGHT - TRACK_LEFT);
  const share = stop.bps / PERCENT;
  const radius = COIN_RADIUS * Math.sqrt(share / SHARE_UNIT);
  const coinY = TRACK_Y - COIN_RISE - radius;

  return (
    <g className="track-stop" style={{ '--i': index } as CSSProperties}>
      <line
        x1={posX}
        y1={TRACK_Y - STEM_TOP}
        x2={posX}
        y2={TRACK_Y - STEM_LENGTH + (radius - COIN_RADIUS)}
        className="track-stem"
      />
      <g
        className="track-coin"
        style={{ '--cx': `${posX}px`, '--cy': `${coinY}px` } as CSSProperties}
      >
        <circle cx={posX} cy={coinY} r={radius} className="coin-face" />
        <circle cx={posX} cy={coinY} r={radius * INNER_RATIO} className="coin-inner" />
        <path d={leafPath(posX, coinY, radius)} className="coin-leaf" />
      </g>
      <circle cx={posX} cy={TRACK_Y} r={DOT_RADIUS} className="track-dot" />
      <text x={posX} y={TRACK_Y + MONTH_DROP} className="track-month">
        {stopLabel(stop.month)}
      </text>
      <text x={posX} y={TRACK_Y - SHARE_RISE - 2 * radius} className="track-share">
        {share}%
      </text>
    </g>
  );
}

/** The incentive schedule on a true time scale; the schedule, not progress: nothing here is "done". */
export function MilestoneTrack({ schedule }: { schedule: readonly ScheduleStop[] }) {
  const label = trackLabel(
    schedule.map(({ month, bps }) => [month, bps / PERCENT] as const),
    TRACK_MONTHS,
  );

  return (
    <figure className="milestone-track">
      <svg viewBox="0 0 640 160" role="img" aria-label={label}>
        <line x1={TRACK_LEFT} y1={TRACK_Y} x2={TRACK_RIGHT} y2={TRACK_Y} className="track-base" />
        <line
          x1={TRACK_LEFT}
          y1={TRACK_Y}
          x2={TRACK_RIGHT}
          y2={TRACK_Y}
          className="track-draw"
          pathLength="1"
        />
        {schedule.map((stop, index) => (
          <Stop key={stop.milestone} stop={stop} index={index} />
        ))}
      </svg>
    </figure>
  );
}

const PLOT_CELLS = Array.from({ length: PERCENT }, (_cell, index) => index);

/** 100 little trees, one per 1% of the target: anchor (platform managed) vs open, filled when planted. */
export function PlotGrid({ slots, trees }: { slots: CampaignDetail['slots']; trees: number }) {
  const anchorCells = cellsOf(slots.anchor, trees);
  const plantedCells = cellsOf(slots.planted, trees);

  return (
    <div className="plot">
      <div className="plot-grid" aria-hidden="true">
        {PLOT_CELLS.map((cell) => (
          <svg
            key={cell}
            viewBox="0 0 12 14"
            className={[
              'plot-tree',
              cell < anchorCells ? 'anchor' : 'open',
              cell < plantedCells ? 'planted' : '',
            ].join(' ')}
            style={{ '--i': cell } as CSSProperties}
          >
            <path d="M6 1 11 10H1Z" />
            <path d="M5.3 10h1.4v3H5.3Z" />
          </svg>
        ))}
      </div>
      <dl className="plot-legend">
        <div>
          <dt>
            <i className="anchor" />
            {SLOTS_ANCHOR}
          </dt>
          <dd>{number(slots.anchor)}</dd>
        </div>
        <div>
          <dt>
            <i className="open" />
            {SLOTS_OPEN}
          </dt>
          <dd>{number(slots.open)}</dd>
        </div>
        <div>
          <dt>
            <i className="planted" />
            {SLOTS_PLANTED}
          </dt>
          <dd>{number(slots.planted)}</dd>
        </div>
      </dl>
    </div>
  );
}
