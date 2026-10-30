// S16's pieces (s16-my-trees.md §1): the two overview scenes and the tree card. Each takes plain props; the page decides
// what to show. Amounts are only formatted here, never added or compared (REG-001).
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { GivingScene } from '../../shared/art/GivingScene';
import { Icon } from '../../shared/art/Icon';
import { TreeCardArt } from '../../shared/art/TreeCardArt';
import { TreesScene } from '../../shared/art/TreesScene';
import { number } from '../../shared/format/number';
import { usdcValue } from '../../shared/format/money';
import { Tag } from '../../shared/ui/Badge';
import { CatalogCard } from '../../shared/ui/CatalogCard';
import { Progress } from '../../shared/ui/Progress';
import type { PlanterTree, TreesSummary } from './planter.api';
import {
  INCENTIVES_CAPTIONS,
  INCENTIVES_EM,
  INCENTIVES_KICKER,
  INCENTIVES_TITLE,
  MILESTONES_PAID,
  OVERVIEW_LABEL,
  REPORT_DEAD,
  STATUS_BADGE,
  STATUS_LABEL,
  ENFORCED,
  TREES_CAPTIONS,
  TREES_KICKER,
  TREES_TITLE,
  TREES_TITLE_EM,
  incentivesLabel,
  treeNumber,
} from './planter.copy';
import {
  dotsOf,
  fundingRow,
  metaLine,
  percentPaid,
  primaryAction,
  reportDeadLink,
} from './planter.rules';

const TREE_ICON = 17;
const SCENE_PLOTS = 3;
const DECIMALS = 2;

/** Whole or two-decimal USDC for a scene (a display number from the string, never summed): 84 and 25.2. */
const usd = (value: number): string => number(Number(value.toFixed(DECIMALS)));

/** The overview as one card in two halves: the trees in care, and the incentives set aside and paid. */
export function Overview({ summary }: { summary: TreesSummary }) {
  const setAside = usdcValue(summary.setAsideAmount);
  const paid = usdcValue(summary.paidAmount);

  return (
    <section className="donor-duo pl-duo" aria-label={OVERVIEW_LABEL}>
      <div className="duo-half">
        <span className="action-text">
          <span className="action-kicker">{TREES_KICKER}</span>
          <strong>
            {TREES_TITLE}
            <br />
            <em>{TREES_TITLE_EM}</em>
          </strong>
        </span>
        <TreesScene
          totals={{
            planted: summary.treeCount,
            survival: summary.survivalPct,
            flags: summary.flaggedCount,
          }}
          captions={TREES_CAPTIONS}
          label={`${summary.treeCount} trees in your care`}
        />
      </div>
      <div className="duo-half">
        <span className="action-text">
          <span className="action-kicker">{INCENTIVES_KICKER}</span>
          <strong>
            {INCENTIVES_TITLE}
            <br />
            <em>{INCENTIVES_EM}</em>
          </strong>
        </span>
        <GivingScene
          values={[setAside, summary.treeCount, paid]}
          captions={INCENTIVES_CAPTIONS}
          plots={SCENE_PLOTS}
          format={usd}
          label={incentivesLabel(usd(setAside), summary.treeCount, usd(paid))}
        />
      </div>
    </section>
  );
}

type CardProps = { tree: PlanterTree; localDeviceId: string | null; index: number };

/** One tree: its state and place, the next payout, the milestones paid, one primary action and "Report dead". */
export function TreeCard({ tree, localDeviceId, index }: CardProps) {
  const { campaign, status, treeId } = tree;
  const funding = fundingRow(tree);
  const paid = percentPaid(tree);
  const action = primaryAction(tree);
  const dead = reportDeadLink(tree);

  return (
    <CatalogCard
      index={index}
      to={`/trees/${treeId}`}
      art={<TreeCardArt kind={status} milestones={dotsOf(tree)} seed={Number(treeId)} />}
      tags={
        <>
          <span className={`badge ${STATUS_BADGE[status]}`}>
            <span />
            {STATUS_LABEL[status]}
          </span>
          {tree.enforcedByChainlink && <Tag>{ENFORCED}</Tag>}
          <span className="species-label">{campaign.speciesName}</span>
        </>
      }
      location={campaign.regionName}
      title={treeNumber(treeId)}
      cta={action.label}
      ctaLabel={action.label}
      ctaTo={action.to}
      ctaIcon={action.icon}
    >
      <div className="tree-target">
        <Icon name="tree" size={TREE_ICON} />
        <span className="clamp-2" title={campaign.title}>
          {campaign.title}
        </span>
      </div>
      <div className="funding-row">
        <span>
          <strong>{funding.title}</strong> <small>{funding.caption}</small>
        </span>
        <span>{paid}%</span>
      </div>
      <Progress label={MILESTONES_PAID} percent={paid} />
      <div className="card-meta">
        <span>{metaLine(tree, localDeviceId)}</span>
        {dead !== null && (
          <Link className="pl-alt" to={dead}>
            {REPORT_DEAD}
          </Link>
        )}
      </div>
    </CatalogCard>
  );
}
