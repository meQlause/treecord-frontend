// S13's campaign card (s13-donor-home.md §2, mockup donor.jsx:198-223): what the donor gave and what it became — the
// funding, the trees and their health, the planter budget, the carbon. Read-only; the card only links to S04 and S06.
import { motion } from 'motion/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Glyph } from '../../shared/art/Glyph';
import { Icon } from '../../shared/art/Icon';
import { Photo } from '../../shared/art/Photo';
import { number } from '../../shared/format/number';
import { usdc, usdcValue } from '../../shared/format/money';
import { cardMotion } from '../../shared/motion/presets';
import { Badge } from '../../shared/ui/Badge';
import { CarbonFunnel } from '../../shared/ui/CarbonFunnel';
import { FundingRow } from '../../shared/ui/FundingRow';
import { HEALTH, HealthForest, type RenderGlyph } from '../../shared/ui/HealthForest';
import { Lorem } from '../../shared/ui/Lorem';
import { PayoutGauge } from '../../shared/ui/PayoutGauge';
import { artForSpecies } from '../campaigns/art';
import { STATUS_LABEL } from '../campaigns/campaigns.copy';
import type { DonorCard } from './donor.api';
import {
  BUDGET_OF,
  CAMPAIGN_FUNDING,
  CARBON,
  CARBON_NOTE,
  FUNDS,
  IMPACT_REPORT,
  NOT_ESTIMATED,
  NOT_PLANTED,
  NO_CARBON,
  RAISED,
  REFUNDED,
  RELEASED,
  TREE_HEALTH,
  UNTITLED,
  USDC,
  VIEW_CAMPAIGN,
  YOUR_CONTRIBUTION,
  healthScale,
  ofTarget,
  planned,
  plantedOfTotal,
  shareLine,
  viewCampaignLabel,
} from './donor.copy';
import {
  carbonRows,
  carbonText,
  fundedPercent,
  hasNoCarbon,
  healthCounts,
  plantedShare,
  shareText,
  treesPerGlyph,
} from './donor.rules';

const PIN_ICON = 13;
const OPEN_ICON = 17;
const TREE_ICON = 16;
const SECTION_ICON = 16;
const LINK_ICON = 15;
const PERCENT = 100;
const LEGEND_SCALE = 0.9;

const glyph: RenderGlyph = ({ kind, x, y, s }) => <Glyph kind={kind} x={x} y={y} scale={s ?? 1} />;

type CardProps = { card: DonorCard };

function Heading({ card }: CardProps) {
  const { campaign } = card;
  const to = `/campaigns/${campaign.address}`;
  const title = campaign.title ?? UNTITLED;

  return (
    <header className="pc-heading">
      <Link className="pc-photo" to={to} tabIndex={-1} aria-hidden="true">
        <Photo kind={artForSpecies(campaign.species?.code)} />
      </Link>
      <div className="pc-identity">
        <div className="pc-category">
          <Badge status={STATUS_LABEL[campaign.status]} />
          {campaign.species !== null && <span>{campaign.species.name}</span>}
        </div>
        <h3>
          <Link className="clamp-2" to={to} title={title}>
            {campaign.title ?? <Lorem id="COPY-157" kind="label" />}
          </Link>
        </h3>
        {campaign.region !== null && (
          <span className="location">
            <Icon name="pin" size={PIN_ICON} />
            {campaign.region.name}
          </span>
        )}
      </div>
      <Link className="pc-open" to={to} aria-label={viewCampaignLabel(title)}>
        <span>{VIEW_CAMPAIGN}</span>
        <Icon name="arrow" size={OPEN_ICON} />
      </Link>
    </header>
  );
}

function PlantingLine({ card }: CardProps) {
  const { trees, campaign } = card;

  return (
    <div className="pc-planting">
      <Icon name="tree" size={TREE_ICON} />
      <span>
        {trees.planted > 0 ? (
          <>
            <strong>{number(trees.planted)}</strong>
            {plantedOfTotal(number(campaign.treeTarget))}
          </>
        ) : (
          <>
            {planned(number(campaign.treeTarget))} <span className="pc-separator">·</span>{' '}
            {NOT_PLANTED}
          </>
        )}
      </span>
    </div>
  );
}

function Summary({ card }: CardProps) {
  const { campaign } = card;
  const funded = fundedPercent(campaign.progressBps);

  return (
    <div className="pc-summary">
      <div className="pc-personal">
        <span className="pc-label">{YOUR_CONTRIBUTION}</span>
        <strong>
          {usdc(card.contributedAmount)}
          <small>{USDC}</small>
        </strong>
        <span className="pc-share">{shareLine(shareText(card.fundingShareBps))}</span>
      </div>
      <div className="pc-campaign-progress">
        <div className="pc-progress-heading">
          <span className="pc-label">{CAMPAIGN_FUNDING}</span>
          <strong>{funded}%</strong>
        </div>
        <div
          role="progressbar"
          aria-label={CAMPAIGN_FUNDING}
          aria-valuenow={funded}
          aria-valuemin={0}
          aria-valuemax={PERCENT}
        >
          <FundingRow
            funded={funded / PERCENT}
            planted={plantedShare(card.trees, campaign.treeTarget)}
            glyph={glyph}
          />
        </div>
        <div className="pc-progress-caption">
          <strong>
            {usdc(campaign.fundedAmount)} <small>{RAISED}</small>
          </strong>
          <span>{ofTarget(usdc(campaign.fundingTarget))}</span>
        </div>
        <PlantingLine card={card} />
      </div>
    </div>
  );
}

function Health({ card }: CardProps) {
  const counts = healthCounts(card.trees);

  return (
    <section className="pc-health">
      <h4>
        {TREE_HEALTH} <span>{healthScale(treesPerGlyph(card.trees.planted))}</span>
      </h4>
      <HealthForest counts={counts} glyph={glyph} />
      <dl>
        {HEALTH.map(([kind, label], index) => (
          <div key={kind} className={kind}>
            <dt>
              <svg viewBox="-10 -22 20 24" aria-hidden="true">
                <Glyph kind={kind} x={0} y={0} scale={LEGEND_SCALE} />
              </svg>
              {label}
            </dt>
            <dd>{number(counts[index] ?? 0)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Funds({ card }: CardProps) {
  return (
    <section>
      <h4>
        <Icon name="wallet" size={SECTION_ICON} />
        {FUNDS}
      </h4>
      <div className="pc-funds">
        <PayoutGauge
          paid={usdcValue(card.payoutsReleased)}
          budget={usdcValue(card.planterBudget)}
        />
        <span>
          {BUDGET_OF}
          <br />
          <strong>{usdc(card.payoutsReleased)}</strong> / {usdc(card.planterBudget)} {USDC}
        </span>
      </div>
      <dl>
        <div>
          <dt>{RELEASED}</dt>
          <dd>
            {usdc(card.payoutsReleased)} <small>{USDC}</small>
          </dd>
        </div>
        <div>
          <dt>{REFUNDED}</dt>
          <dd>
            {usdc(card.refundedAmount)} <small>{USDC}</small>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Carbon({ card }: CardProps) {
  const rows = carbonRows(card);

  return (
    <section>
      <h4>
        <Icon name="carbon" size={SECTION_ICON} />
        {CARBON}
      </h4>
      {hasNoCarbon(card) ? (
        <div className="pc-carbon-empty">
          <strong>{NOT_ESTIMATED}</strong>
          <span>{NO_CARBON}</span>
        </div>
      ) : (
        <>
          <CarbonFunnel rows={rows} />
          <dl>
            {rows.map(([label, units], index) => (
              <div key={label}>
                <dt>
                  <i className={`pc-key k${index}`} />
                  {label}
                </dt>
                <dd>{carbonText(units)}</dd>
              </div>
            ))}
          </dl>
          <p>{CARBON_NOTE}</p>
        </>
      )}
    </section>
  );
}

export function SupportedCampaign({ card, index }: CardProps & { index: number }) {
  return (
    <motion.article className="portfolio-card" {...cardMotion(index, false)}>
      <Heading card={card} />
      <Summary card={card} />
      <div className="pc-detail-content">
        {card.trees.planted > 0 && <Health card={card} />}
        <div className="pc-ledgers">
          <Funds card={card} />
          <Carbon card={card} />
        </div>
      </div>
      <Link className="pc-report-link" to={`/campaigns/${card.campaign.address}/report`}>
        {IMPACT_REPORT}
        <Icon name="arrow" size={LINK_ICON} />
      </Link>
    </motion.article>
  );
}
