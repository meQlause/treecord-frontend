// S13's pieces (s13-donor-home.md §1): the heading with its two action cards, the overview scenes, the loading shape,
// the tabs and the empty / failed states. Each takes plain props; the page decides what to show.
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { GivingScene } from '../../shared/art/GivingScene';
import { Icon, type IconName } from '../../shared/art/Icon';
import { TreesScene } from '../../shared/art/TreesScene';
import { number } from '../../shared/format/number';
import { usdcValue } from '../../shared/format/money';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { useAfter } from '../../shared/ui/Skeleton';
import type { Dashboard } from './donor.api';
import { CreateArt, ExploreArt } from './donor.art';
import {
  CREATE_EM,
  CREATE_KICKER,
  CREATE_TITLE,
  EMPTY_BODY,
  EMPTY_EYEBROW,
  EMPTY_TITLE,
  EXPLORE_CAMPAIGNS,
  EXPLORE_EM,
  EXPLORE_KICKER,
  EXPLORE_TITLE,
  FAILED_BODY,
  FAILED_TITLE,
  GIVING_CAPTIONS,
  GIVING_EM,
  GIVING_KICKER,
  GIVING_TITLE,
  HOME_EYEBROW,
  HOME_LINE_ONE,
  HOME_LINE_TWO,
  LOADING,
  OVERVIEW_LABEL,
  SHOW_ALL,
  TABS,
  TABS_LABEL,
  TREES_CAPTIONS,
  TREES_EM,
  TREES_KICKER,
  TREES_TITLE,
  TRY_AGAIN,
  givingLabel,
  noCampaigns,
  treesLabel,
} from './donor.copy';
import { survivalPercent } from './donor.rules';

const GO_ICON = 16;
const EMPTY_ICON = 42;
const NO_RESULTS_ICON = 30;
const LINK_ICON = 15;
const BUTTON_ICON = 17;
const SURVIVAL_NONE = '—';

type ActionProps = {
  to: string;
  kicker: string;
  title: string;
  em: string;
  icon: IconName;
  art: ReactNode;
};

function ActionCard({ to, kicker, title, em, icon, art }: ActionProps) {
  return (
    <Link className="action-card" to={to}>
      <span className="action-text">
        <span className="action-kicker">{kicker}</span>
        <strong>
          {title}
          <br />
          <em>{em}</em>
        </strong>
      </span>
      <span className="action-go">
        <Icon name={icon} size={GO_ICON} />
      </span>
      {art}
    </Link>
  );
}

/** The eyebrow, the title and the two things a donor does from here. */
export function DonorHeading() {
  return (
    <div className="donor-heading">
      <div>
        <div className="eyebrow">
          <span className="tiny-line" />
          {HOME_EYEBROW}
        </div>
        <h1>
          {HOME_LINE_ONE}
          <br />
          <em>{HOME_LINE_TWO}</em>
        </h1>
      </div>
      <div className="donor-actions">
        <ActionCard
          to="/campaigns"
          kicker={EXPLORE_KICKER}
          title={EXPLORE_TITLE}
          em={EXPLORE_EM}
          icon="arrow"
          art={<ExploreArt />}
        />
        <ActionCard
          to="/app/campaigns/new"
          kicker={CREATE_KICKER}
          title={CREATE_TITLE}
          em={CREATE_EM}
          icon="plus"
          art={<CreateArt />}
        />
      </div>
    </div>
  );
}

/** The overview as one card in two halves: where the giving went, how the trees are growing. */
export function Overview({ totals }: { totals: Dashboard['totals'] }) {
  const contributed = usdcValue(totals.contributedAmount);
  const paid = usdcValue(totals.payoutsReleased);
  const survival = survivalPercent(totals.survivalRateBps);

  return (
    <section className="donor-duo" aria-label={OVERVIEW_LABEL}>
      <div className="duo-half">
        <span className="action-text">
          <span className="action-kicker">{GIVING_KICKER}</span>
          <strong>
            {GIVING_TITLE}
            <br />
            <em>{GIVING_EM}</em>
          </strong>
        </span>
        <GivingScene
          values={[contributed, totals.campaigns, paid]}
          captions={GIVING_CAPTIONS}
          label={givingLabel(number(contributed), totals.campaigns, number(paid))}
        />
      </div>
      <div className="duo-half">
        <span className="action-text">
          <span className="action-kicker">{TREES_KICKER}</span>
          <strong>
            {TREES_TITLE}
            <br />
            <em>{TREES_EM}</em>
          </strong>
        </span>
        <TreesScene
          totals={{ planted: totals.treesPlanted, survival, flags: totals.openFlags }}
          captions={TREES_CAPTIONS}
          label={treesLabel(
            number(totals.treesPlanted),
            survival === null ? SURVIVAL_NONE : `${survival}%`,
            totals.openFlags,
          )}
        />
      </div>
    </section>
  );
}

/** S-1: the loading line at once, the page-shaped blocks after 300 ms (a fast answer never flashes). */
export function DonorLoading() {
  const shown = useAfter();

  return (
    <div className="donor-loading" role="status" aria-busy="true">
      <span className="eyebrow">{LOADING}</span>
      {shown && (
        <div aria-hidden="true">
          <div className="skeleton donor-skel-duo" />
          <div className="donor-columns">
            <div>
              <div className="skeleton title donor-skel-heading" />
              <div className="skeleton donor-list-skeleton" />
            </div>
            <div className="skeleton donor-skel-rail" />
          </div>
        </div>
      )}
    </div>
  );
}

/** S-2: nothing could be read and nothing is cached; never zero totals. */
export function DonorFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState tone="error" title={FAILED_TITLE} description={FAILED_BODY}>
      <Button icon="retry" onClick={onRetry}>
        {TRY_AGAIN}
      </Button>
    </EmptyState>
  );
}

/** S-5: no campaign supported yet. */
export function DonorEmpty() {
  return (
    <div className="empty-state donor-empty">
      <span className="empty-icon">
        <Icon name="tree" size={EMPTY_ICON} />
      </span>
      <span className="eyebrow">{EMPTY_EYEBROW}</span>
      <h2>{EMPTY_TITLE}</h2>
      <p>{EMPTY_BODY}</p>
      <Link className="button primary" to="/campaigns">
        {EXPLORE_CAMPAIGNS}
        <Icon name="arrow" size={BUTTON_ICON} />
      </Link>
    </div>
  );
}

type TabsProps = { value: string; onChange: (tab: string) => void };

/** The status tabs of "My campaigns". */
export function DonorTabs({ value, onChange }: TabsProps) {
  return (
    <div className="status-filters donor-tabs" role="group" aria-label={TABS_LABEL}>
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={value === tab}
          className={value === tab ? 'selected' : ''}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

/** S-7: a tab with nothing in it. */
export function TabEmpty({ tab, onShowAll }: { tab: string; onShowAll: () => void }) {
  return (
    <div className="donor-no-results">
      <Icon name="tree" size={NO_RESULTS_ICON} />
      <h3>{noCampaigns(tab)}</h3>
      <button type="button" className="text-button" onClick={onShowAll}>
        {SHOW_ALL}
        <Icon name="arrow" size={LINK_ICON} />
      </button>
    </div>
  );
}
