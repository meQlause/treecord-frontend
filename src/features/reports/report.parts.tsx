// The upper half of the report (s06-report.md §1): heading, snapshot, overview scenes, tree health, funding and planter
// incentives. Each part gets plain props; the page fetches. Mockup report.jsx:15-51.
import type { ReactNode } from 'react';
import { Glyph } from '../../shared/art/Glyph';
import { GivingScene } from '../../shared/art/GivingScene';
import { Icon, type IconName } from '../../shared/art/Icon';
import { TreesScene } from '../../shared/art/TreesScene';
import { number } from '../../shared/format/number';
import { utcDate } from '../../shared/format/datetime';
import { usdc, usdcValue } from '../../shared/format/money';
import { Badge } from '../../shared/ui/Badge';
import { EmptyState } from '../../shared/ui/EmptyState';
import { FundingRow } from '../../shared/ui/FundingRow';
import { HEALTH, HealthForest, type RenderGlyph } from '../../shared/ui/HealthForest';
import { Lorem } from '../../shared/ui/Lorem';
import { PayoutGauge } from '../../shared/ui/PayoutGauge';
import { MilestoneBars, ReportArt, StatArt, type StatKind } from './report.art';
import * as copy from './report.copy';
import type { Report } from './report.api';
import {
  healthCounts,
  plantedShare,
  share,
  statusLabel,
  survivalPercent,
  wholePercent,
} from './report.rules';
import { untitledCampaign } from '../../shared/ui/approved-copy';

const ICON_SIZE = 20;
const PIN_SIZE = 16;
const CLOCK_SIZE = 15;
const GLYPH_SCALE = 0.9;
const BASIS_POINTS = 10_000;
const PROGRESS_MAX = 100;
const PLOTS = 3;

/** A placeholder `{ copyId }` shows as lorem, a written sentence as itself. */
export function Say({ message }: { message: copy.Message }) {
  return typeof message === 'string' ? message : <Lorem id={message.copyId} kind="label" />;
}

const glyph: RenderGlyph = ({ kind, x, y, s }) => <Glyph kind={kind} x={x} y={y} scale={s ?? 1} />;

export function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rp-metric">
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  );
}

export function Heading({
  icon,
  note,
  children,
}: {
  icon: IconName;
  note?: string;
  children: string;
}) {
  return (
    <div className="rp-section-title">
      <h2>
        <span className="rp-icon">
          <Icon name={icon} size={ICON_SIZE} />
        </span>
        {children}
      </h2>
      {note !== undefined && <span>{note}</span>}
    </div>
  );
}

/** An empty section with its own small scene instead of a flat grey box. */
export function Empty({ kind, children }: { kind: StatKind; children: ReactNode }) {
  return (
    <EmptyState variant="inline" art={<StatArt kind={kind} />}>
      {children}
    </EmptyState>
  );
}

export function ReportHead({ report }: { report: Report }) {
  const { campaign } = report;

  return (
    <header className="page-heading rp-heading">
      <div>
        <div className="rp-eyebrow-row">
          <div className="eyebrow">
            <span className="tiny-line" />
            {copy.EYEBROW}
          </div>
          <Badge status={statusLabel(campaign.status)} />
        </div>
        <h1 className="wrap-any">{campaign.title ?? untitledCampaign(campaign.address)}</h1>
        <p className="wrap-any">
          <Icon name="pin" size={PIN_SIZE} />
          {campaign.region.name} <span>·</span> {campaign.species.name}
        </p>
      </div>
      <div className="heading-art">
        <ReportArt />
        <span className="hero-coordinate">{copy.COORDINATE}</span>
      </div>
    </header>
  );
}

export function Snapshot({ generatedAt }: { generatedAt: string }) {
  return (
    <div className="rp-snapshot">
      <span>
        <Icon name="clock" size={CLOCK_SIZE} />
        {copy.AS_OF} {utcDate(generatedAt)}
      </span>
      <span>{copy.CAMPAIGN_WIDE}</span>
    </div>
  );
}

function Half({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: readonly [string, string];
  children: ReactNode;
}) {
  return (
    <div className="duo-half">
      <span className="action-text">
        <span className="action-kicker">{kicker}</span>
        <strong>
          {title[0]}
          <br />
          <em>{title[1]}</em>
        </strong>
      </span>
      {children}
    </div>
  );
}

export function Overview({ report }: { report: Report }) {
  const { trees, funding, incentives, campaign } = report;
  const survival = survivalPercent(trees.survivalRateBps);
  const raised = usdc(funding.fundedAmount);
  const paid = usdc(incentives.paidAmount);

  return (
    <section className="donor-duo rp-duo" aria-label={copy.OVERVIEW_LABEL}>
      <Half kicker={copy.PLANTING_KICKER} title={copy.TREES_TITLE}>
        <TreesScene
          totals={{ planted: trees.planted, survival, flags: trees.flagged }}
          captions={[
            copy.plantedCaption(campaign.treeTarget),
            copy.SURVIVAL_CAPTION,
            copy.FLAGGED_CAPTION,
          ]}
          label={copy.treesLabel(
            trees.planted,
            survival === null ? copy.NO_SURVIVAL : `${survival}%`,
            trees.flagged,
          )}
        />
      </Half>
      <Half kicker={copy.MONEY_KICKER} title={copy.MONEY_TITLE}>
        <GivingScene
          values={[
            usdcValue(funding.fundedAmount),
            funding.contributors,
            usdcValue(incentives.paidAmount),
          ]}
          captions={copy.MONEY_CAPTIONS}
          plots={PLOTS}
          label={copy.moneyLabel(raised, funding.contributors, paid)}
        />
      </Half>
    </section>
  );
}

export function Health({ trees }: { trees: Report['trees'] }) {
  const counts = healthCounts(trees);
  const note =
    trees.averageAgeDays === null ? copy.NO_AGE_NOTE : copy.averageAge(trees.averageAgeDays);

  return (
    <section className="rp-section">
      <Heading icon="tree" note={note}>
        {copy.HEALTH_TITLE}
      </Heading>
      <div className="pc-health rp-forest">
        {trees.planted > 0 && <HealthForest counts={counts} glyph={glyph} />}
        <dl>
          {HEALTH.map(([kind, label], index) => (
            <div key={kind} className={kind}>
              <dt>
                <svg viewBox="-10 -22 20 24" aria-hidden="true">
                  <Glyph kind={kind} x={0} y={0} scale={GLYPH_SCALE} />
                </svg>
                {label}
              </dt>
              <dd>{number(counts[index] ?? 0)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="rp-note">{copy.HEALTH_NOTE}</p>
    </section>
  );
}

export function Funding({ report }: { report: Report }) {
  const { funding, campaign, trees } = report;

  return (
    <section className="rp-section">
      <Heading icon="wallet">{copy.FUNDING_TITLE}</Heading>
      <Metric label={copy.TOTAL_RAISED} value={usdc(funding.fundedAmount)} unit={copy.USDC} />
      <div
        role="progressbar"
        aria-label={copy.FUNDING_LABEL}
        aria-valuenow={wholePercent(funding.progressBps)}
        aria-valuemin={0}
        aria-valuemax={PROGRESS_MAX}
      >
        <FundingRow
          funded={share(funding.progressBps)}
          planted={plantedShare(trees.planted, campaign.treeTarget)}
          glyph={glyph}
        />
      </div>
      <dl className="rp-ledger">
        {[
          [copy.LEDGER.target, `${usdc(funding.fundingTarget)} ${copy.USDC}`],
          [copy.LEDGER.contributors, number(funding.contributors)],
          [copy.LEDGER.refunded, `${usdc(funding.refundedAmount)} ${copy.USDC}`],
          [copy.LEDGER.commitment, copy.months(campaign.commitmentUnits)],
          [copy.LEDGER.radius, copy.meters(campaign.region.radiusM)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Incentives({ incentives }: { incentives: Report['incentives'] }) {
  const rows = incentives.byMilestone.map((row) => ({
    month: row.month,
    payouts: row.payouts,
    amount: usdc(row.amount),
    value: usdcValue(row.amount),
  }));

  return (
    <section className="rp-section">
      <Heading icon="payout">{copy.INCENTIVES_TITLE}</Heading>
      <div className="rp-incentives rp-gauge-row">
        <PayoutGauge paid={incentives.paidBps ?? 0} budget={BASIS_POINTS} />
        <Metric label={copy.PAID} value={usdc(incentives.paidAmount)} unit={copy.USDC} />
        <Metric label={copy.FORFEITED} value={usdc(incentives.forfeitedAmount)} unit={copy.USDC} />
      </div>
      {incentives.chainlinkEnforced > 0 && (
        <p className="rp-note">{copy.enforced(number(incentives.chainlinkEnforced))}</p>
      )}
      {rows.some((row) => row.payouts > 0) ? (
        <MilestoneBars rows={rows} />
      ) : (
        <Empty kind="payout">{copy.NO_PAYOUTS}</Empty>
      )}
    </section>
  );
}
