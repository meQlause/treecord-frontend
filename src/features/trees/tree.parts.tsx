// The read parts of S05 (s05-tree.md §1): provenance, timeline, milestone schedule, payouts, flags, the lifecycle card
// and the tree record. The page fetches; each part gets plain props. Mockup shared-pages.jsx:226-262.
import { useState, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { useOnline } from '../../app/states/use-online';
import { Icon } from '../../shared/art/Icon';
import { Photo } from '../../shared/art/Photo';
import { PrintQR } from '../../shared/art/QR';
import { localDate } from '../../shared/format/datetime';
import { txUrl } from '../../shared/format/explorer';
import { usdc } from '../../shared/format/money';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { Tag } from '../../shared/ui/Badge';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Facts } from '../../shared/ui/Facts';
import { Lorem } from '../../shared/ui/Lorem';
import { Panel } from '../../shared/ui/Panel';
import { StockCard } from '../../shared/ui/StockCard';
import { artForSpecies } from '../campaigns/art';
import type { Flag, Milestone, TimelineEvent, TreeDetail } from './tree.api';
import { FlagForm } from './tree.flag';
import * as copy from './tree.copy';
import {
  amountText,
  flagFacts,
  growth,
  isLongProse,
  label,
  locationText,
  payoutFacts,
  planterActions,
  shownMonth,
  timelineNote,
  timelineTitle,
  windowText,
  type Row,
} from './tree.rules';

const ICON = 16;
const SMALL_ICON = 15;
const PIN_SIZE = 14;
const RECORD_ICON = 22;
const SHORT_HASH_HEAD = 6;
const SHORT_HASH_TAIL = 4;

/** A placeholder `{ copyId }` shows as lorem, a written sentence as itself. */
function Say({ message }: { message: copy.Message }) {
  return typeof message === 'string' ? message : <Lorem id={message.copyId} kind="label" />;
}

/** A long prose value (a flag reason) reads left-aligned under its label. */
const prose = (text: string) =>
  isLongProse(text) ? <span className="tr-prose">{text}</span> : text;

const rows = (facts: readonly Row[]) =>
  facts.map(([name, value]): [string, ReactNode] => [name, prose(value)]);

export function Provenance({ data }: { data: TreeDetail }) {
  const { status, campaign, plantedAt } = data.tree;

  return (
    <Link className="cb-provenance rc-where tr-hero" to={`/campaigns/${campaign.address}`}>
      <div>
        <Tag>{label(status)}</Tag>
        <h2 className="wrap-any">{campaign.title ?? <Say message={copy.UNTITLED} />}</h2>
        <span className="location wrap-any">
          <Icon name="pin" size={PIN_SIZE} />
          {campaign.region.name}
        </span>
        <span className="cb-prov-meta">
          {copy.provenance(campaign.species.name, localDate(plantedAt))}
        </span>
        <span className="tr-go">
          {copy.VIEW_CAMPAIGN}
          <span className="arrow-circle">
            <Icon name="arrow" size={ICON} />
          </span>
        </span>
      </div>
      <div className="cb-prov-art">
        <Photo kind={artForSpecies(campaign.species.code)} />
      </div>
    </Link>
  );
}

/** TL-8 / TL-9: thumbnail (removed when it fails to load), score, short evidence hash, transaction link. */
function EvidenceDetails({
  event,
  onThumbError,
}: {
  event: TimelineEvent;
  onThumbError: () => void;
}) {
  const [thumbnail, setThumbnail] = useState(true);
  const { evidence, evidenceHash, txHash } = event;
  const url = txUrl(txHash);
  const thumbUrl = evidence?.thumbnailUrl ?? null;

  if (evidenceHash === null) {
    return null;
  }

  return (
    <div className="tl-evidence">
      {thumbnail && thumbUrl !== null && (
        <img
          className="ev-thumb"
          src={thumbUrl}
          alt={copy.THUMBNAIL_ALT}
          data-copy="COPY-164"
          loading="lazy"
          onError={() => {
            setThumbnail(false);
            onThumbError();
          }}
        />
      )}
      <div className="tl-ev-facts">
        {evidence !== null && (
          <span>
            <Say message={copy.SCORE_LABEL} /> {evidence.score}
          </span>
        )}
        <span>
          <Say message={copy.HASH_LABEL} />{' '}
          <code>{`${evidenceHash.slice(0, SHORT_HASH_HEAD)}…${evidenceHash.slice(-SHORT_HASH_TAIL)}`}</code>
        </span>
        {url !== null && (
          <a href={url} target="_blank" rel="noreferrer">
            <Say message={copy.TX_LABEL} />
            <Icon name="arrow" size={SMALL_ICON} />
          </a>
        )}
      </div>
    </div>
  );
}

export function Timeline({
  events,
  onThumbError,
}: {
  events: readonly TimelineEvent[];
  onThumbError: () => void;
}) {
  return (
    <Panel title={copy.TIMELINE_TITLE} icon="check">
      {events.length === 0 ? (
        <EmptyState variant="compact" title={copy.NO_EVENTS} />
      ) : (
        <ol className="ws-timeline">
          {events.map((event) => (
            <li key={`${event.kind}-${event.at}-${event.txHash}`}>
              <span>{localDate(event.at)}</span>
              <h3>
                <Say message={timelineTitle(event)} />
              </h3>
              <p>{timelineNote(event.kind)}</p>
              <EvidenceDetails event={event} onThumbError={onThumbError} />
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function ScheduleRow({ milestone }: { milestone: Milestone }) {
  return (
    <tr>
      <td>{copy.month(milestone.month)}</td>
      <td>{windowText(milestone)}</td>
      <td>{amountText(milestone.amount)}</td>
      <td>
        <Tag>{label(milestone.status)}</Tag>
      </td>
    </tr>
  );
}

export function Schedule({
  milestones,
  signedIn,
}: {
  milestones: readonly Milestone[];
  signedIn: boolean;
}) {
  return (
    <Panel title={copy.SCHEDULE_TITLE} icon="clock">
      <div className="ws-table">
        <table>
          <thead>
            <tr>
              {copy.SCHEDULE_HEADERS.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone) => (
              <ScheduleRow key={milestone.month} milestone={milestone} />
            ))}
          </tbody>
        </table>
      </div>
      {signedIn && <p className="ws-note">{copy.SIGNED_IN_NOTE}</p>}
    </Panel>
  );
}

export function Payouts({ data }: { data: TreeDetail }) {
  return (
    <Panel title={copy.PAYOUTS_TITLE} icon="payout">
      <Facts rows={payoutFacts(data)} />
    </Panel>
  );
}

function FlagBlock({ flag, treeId, operator }: { flag: Flag; treeId: string; operator: boolean }) {
  return (
    <>
      <Facts rows={rows(flagFacts(flag))} />
      {operator && flag.status === 'open' && (
        <ArrowLink to={`/app/operator/trees/${treeId}/flags/${flag.id}`}>
          {copy.RESOLVE_FLAG}
        </ArrowLink>
      )}
    </>
  );
}

type FlagsProps = { data: TreeDetail; operator: boolean };

export function Flags({ data, operator }: FlagsProps) {
  const pending = data.viewer?.pendingFlag ?? null;
  const reason =
    pending !== null && ['alive', 'dead'].includes(data.tree.status) ? pending.reasonText : null;

  return (
    <Panel title={copy.FLAGS_TITLE} icon="flag">
      {data.flags.length === 0 ? (
        <p>{copy.NO_FLAGS}</p>
      ) : (
        data.flags.map((flag) => (
          <FlagBlock key={flag.id} flag={flag} treeId={data.tree.treeId} operator={operator} />
        ))
      )}
      {reason !== null && <p className="ws-callout wrap-any">{copy.pending(reason)}</p>}
      <FlagForm data={data} />
    </Panel>
  );
}

export function Lifecycle({ data }: { data: TreeDetail }) {
  const { summary, tree } = data;
  const perTree = summary.perTreeIncentive === null ? '—' : usdc(summary.perTreeIncentive);

  return (
    <StockCard
      label={copy.LIFECYCLE.label}
      icon="tree"
      caption={copy.LIFECYCLE.caption}
      value={`${summary.milestonesPaid}/${copy.TOTAL_MILESTONES}`}
      unit={copy.LIFECYCLE.unit}
      sub={{ label: copy.LIFECYCLE.sub, value: usdc(summary.paidAmount), unit: copy.AMOUNT_UNIT }}
      share={growth(data)}
      shareLabel={copy.LIFECYCLE.share}
      shareNote={copy.shareNote(label(tree.status), shownMonth(data))}
      note={copy.lifecycleNote(perTree, tree.status === 'flagged')}
    />
  );
}

function Tagged({ data }: { data: TreeDetail }) {
  const online = useOnline();
  const { tag, treeId, campaign } = data.tree;

  if (tag === null) {
    return copy.NO_TAG;
  }

  const line = copy.reprintLine(treeId, campaign.title ?? copy.UNTITLED_LINE);

  return (
    <>
      {tag}
      {data.viewer?.isPlanter === true && (
        <>
          {' · '}
          {online ? (
            <PrintQR text={tag} line={line}>
              {copy.REPRINT}
            </PrintQR>
          ) : (
            <span aria-disabled="true">{copy.REPRINT}</span>
          )}
        </>
      )}
    </>
  );
}

function Actions({ data, now }: { data: TreeDetail; now: number }) {
  const actions = planterActions(data, now);

  return (
    <div className="tr-actions">
      {actions.map((action) => (
        <Link key={action.key} className={action.className} to={action.to}>
          {action.text}
          <Icon name={action.icon} size={ICON} />
        </Link>
      ))}
      <Link className="button outline" to={`/campaigns/${data.tree.campaign.address}/report`}>
        {copy.IMPACT_REPORT}
        <Icon name="arrow" size={ICON} />
      </Link>
    </div>
  );
}

/** `now` is when the page opened: A-3 compares the replant deadline with it. */
export function TreeRecord({ data, now }: { data: TreeDetail; now: number }) {
  const { tree } = data;
  const deadline =
    tree.status === 'dead' && tree.replantDeadline !== null
      ? localDate(tree.replantDeadline)
      : null;

  return (
    <aside className="cb-buy tr-panel">
      <div className="cb-buy-heading">
        <h2>{copy.RECORD.title}</h2>
        <Icon name="pin" size={RECORD_ICON} />
      </div>
      <span className="eyebrow">{copy.RECORD.eyebrow}</span>
      <Facts
        rows={[
          [copy.RECORD.location, locationText(tree.location)],
          [copy.RECORD.region, tree.campaign.region.name],
          [copy.RECORD.planted, localDate(tree.plantedAt)],
          [copy.RECORD.tag, <Tagged key="tag" data={data} />],
          [copy.RECORD.replant, deadline],
          [copy.RECORD.clock, tree.status === 'flagged' ? copy.CLOCK_PAUSED : copy.CLOCK_WINDOWS],
        ]}
      />
      <Actions data={data} now={now} />
      <div className="cb-buy-note">
        <Icon name="pin" size={ICON} />
        <span>{copy.LOCATION_NOTE}</span>
      </div>
    </aside>
  );
}
