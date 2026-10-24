// S13's right column (s13-donor-home.md §1, mockup donor.jsx:78-129): "Your carbon" and the flags rail. Sticky below the
// header, never past the columns it sits in; below the cards on a phone.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { tonnes } from '../../shared/format/carbon';
import { useStickyFit } from '../../shared/ui/useStickyFit';
import type { Dashboard, DonorFlag } from './donor.api';
import {
  FLAGS,
  FLAGS_FOOT,
  FLAG_BADGE,
  ISSUED_BALANCE,
  NOT_ISSUED,
  NO_FLAGS,
  PAUSE_LINE,
  PRE_CERTIFICATION,
  RAIL_LABEL,
  TOTAL_ALLOCATED,
  UNFILLED,
  UNIT,
  VIEW_TREE,
  YOUR_CARBON,
  openCount,
  pendingCount,
  treeNumber,
} from './donor.copy';
import { untitledCampaign } from '../../shared/ui/approved-copy';

const EMBLEM_ICON = 24;
const CHECK_ICON = 14;
const LEAF_ICON = 20;
const FLAG_ICON = 18;
const ITEM_ICON = 18;
const CHEVRON_ICON = 12;
const LINK_ICON = 14;
const FOOT_ICON = 14;
const RAIL_GAP = 20;
const RAIL_OFFSET = 100;

function CarbonWallet({ carbon }: { carbon: Dashboard['carbon'] }) {
  return (
    <section className="carbon-wallet" aria-labelledby="carbon-heading">
      <div className="cw-issued">
        <div className="cw-header">
          <h2 id="carbon-heading">{YOUR_CARBON}</h2>
          <span className="cw-emblem">
            <Icon name="carbon" size={EMBLEM_ICON} />
          </span>
        </div>
        <span className="cw-label">{ISSUED_BALANCE}</span>
        <div className="cw-balance">
          <strong>{tonnes(carbon.issued.issuedAmount)}</strong>
          <span>{UNIT}</span>
        </div>
        <div className="cw-allocation">
          <span>
            <Icon name="check" size={CHECK_ICON} />
            {TOTAL_ALLOCATED}
          </span>
          <strong>
            {tonnes(carbon.issued.allocatedAmount)} <small>{UNIT}</small>
          </strong>
        </div>
      </div>
      <div className="cw-reservation">
        <div className="cw-reservation-icon">
          <Icon name="leaf" size={LEAF_ICON} />
        </div>
        <div>
          <span>{UNFILLED}</span>
          <small>{PRE_CERTIFICATION}</small>
        </div>
        <strong>
          {tonnes(carbon.unfilled.unfilledAmount)}
          <small>{UNIT}</small>
        </strong>
      </div>
      <p className="cw-note">{NOT_ISSUED}</p>
    </section>
  );
}

function FlagItem({ flag }: { flag: DonorFlag }) {
  return (
    <details className={`fi-item ${flag.status}`}>
      <summary>
        <span className="fi-tree-icon">
          <Icon name={flag.status === 'pending' ? 'clock' : 'tree'} size={ITEM_ICON} />
        </span>
        <span className="fi-identity">
          <strong>{treeNumber(flag.treeId)}</strong>
          <small>{flag.campaign.title ?? untitledCampaign(flag.campaign.address)}</small>
        </span>
        <span className="fi-badge">{FLAG_BADGE[flag.status]}</span>
        <Icon name="down" size={CHEVRON_ICON} />
      </summary>
      <div className="fi-body">
        <p className="wrap-any">{flag.reasonText}</p>
        <span>{PAUSE_LINE[flag.status]}</span>
        <Link to={`/trees/${flag.treeId}`}>
          {VIEW_TREE}
          <Icon name="arrow" size={LINK_ICON} />
        </Link>
      </div>
    </details>
  );
}

function FlagInbox({ flags }: { flags: Dashboard['flags'] }) {
  return (
    <section className="flag-inbox" aria-labelledby="flags-heading">
      <div className="fi-header">
        <h2 id="flags-heading">
          {FLAGS} <span>{flags.total}</span>
        </h2>
        <Icon name="flag" size={FLAG_ICON} />
      </div>
      <div className="fi-counts">
        <span>
          <i />
          {openCount(flags.open)}
        </span>
        <span>
          <i />
          {pendingCount(flags.pending)}
        </span>
      </div>
      <div className="fi-list">
        {flags.items.map((flag) => (
          <FlagItem key={flag.id} flag={flag} />
        ))}
      </div>
      {flags.total === 0 && (
        <div className="fi-empty">
          <Icon name="check" size={ITEM_ICON} />
          <span>{NO_FLAGS}</span>
        </div>
      )}
      <p className="fi-foot">
        <Icon name="flag" size={FOOT_ICON} />
        <span>{FLAGS_FOOT}</span>
      </p>
    </section>
  );
}

export function DonorInsights({ dashboard }: { dashboard: Dashboard }) {
  const ref = useStickyFit<HTMLElement>({
    roomVar: '--rail-room',
    topVar: '--rail-top',
    top: RAIL_OFFSET,
    gap: RAIL_GAP,
  });

  return (
    <aside className="donor-insights" ref={ref} aria-label={RAIL_LABEL}>
      <CarbonWallet carbon={dashboard.carbon} />
      <FlagInbox flags={dashboard.flags} />
    </aside>
  );
}
