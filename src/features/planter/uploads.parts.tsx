// S20's cards (s20-uploads.md §1): a queued recording is client data, with "Upload now" and a confirmed "Discard"; a sent
// one shows the server's status and links to S21. Both share the card shell and the facts. Plain props; the page owns the
// queue, the list and the one send that may run.
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { Button } from '../../shared/ui/Button';
import { Facts } from '../../shared/ui/Facts';
import { fillCopy } from '../../shared/ui/approved-copy';
import { Lorem } from '../../shared/ui/Lorem';
import { cardMotion } from '../../shared/motion/presets';
import { localDateTime } from '../../shared/format/datetime';
import type { QueuedRecording } from '../evidence/queue';
import { REASON_TEXT } from './planter.copy';
import type { UploadItem } from './planter.api';
import type { SendFailure } from './record.api';
import { SendAlert } from './record.parts';
import { UploadCardArt } from './uploads.art';
import * as copy from './uploads.copy';
import { factsOf, rejectedLine, stepOf, titleOf } from './uploads.rules';

const PIN_ICON = 14;
const TREE_ICON = 17;
const WARN_ICON = 15;
const ARROW_ICON = 16;

type ShellProps = {
  index: number;
  art: ReactNode;
  artTo?: string;
  badge: ReactNode;
  kind: string;
  region?: string;
  title: ReactNode;
  campaign: string;
  facts: [string, string][];
  children: ReactNode;
};

/** The card both kinds share: picture, badge and kind, region, title, the campaign, the four facts, then the foot. */
function CardShell({
  index,
  art,
  artTo,
  badge,
  kind,
  region,
  title,
  campaign,
  facts,
  children,
}: ShellProps) {
  return (
    <motion.article className="campaign-card pl-up" {...cardMotion(index)}>
      {artTo === undefined ? (
        <div className="card-art-link" aria-hidden="true">
          {art}
        </div>
      ) : (
        <Link className="card-art-link" to={artTo} tabIndex={-1} aria-hidden="true">
          {art}
        </Link>
      )}
      <div className="art-tags">
        {badge}
        <span className="species-label">{kind}</span>
      </div>
      <div className="card-body">
        {region !== undefined && (
          <span className="location">
            <Icon name="pin" size={PIN_ICON} />
            <span className="wrap-any">{region}</span>
          </span>
        )}
        <h2>{title}</h2>
        <div className="tree-target">
          <Icon name="tree" size={TREE_ICON} />
          <span className="clamp-2" title={campaign}>
            {campaign}
          </span>
        </div>
        <dl className="pl-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {children}
      </div>
    </motion.article>
  );
}

const badgeOf = (label: ReactNode, tone: string): ReactNode => (
  <span className={`badge ${tone}`}>
    <span />
    {label}
  </span>
);

function Reason({ children }: { children: ReactNode }) {
  return (
    <p className="pl-reason">
      <Icon name="warning" size={WARN_ICON} />
      <span className="wrap-any">{children}</span>
    </p>
  );
}

/** A sent submission: the server's badge and picture, the reason of a rejection, and the way to S21. */
export function SentCard({ item, index }: { item: UploadItem; index: number }) {
  const to = `/app/evidence/${item.id}`;
  const line = item.status === 'rejected' ? rejectedLine(item) : null;
  const rejected = item.status === 'rejected' || item.status === 'failed';

  return (
    <CardShell
      index={index}
      artTo={to}
      art={
        <UploadCardArt
          kind={item.kind}
          status={item.status}
          queued={false}
          at={stepOf(item)}
          index={index}
        />
      }
      badge={badgeOf(
        copy.BADGE_LABEL[item.status] ?? item.status,
        copy.BADGE_CLASS[item.status] ?? 'completed',
      )}
      kind={copy.kindLabel(item.kind, item.month)}
      region={item.campaign.regionName}
      title={<Link to={to}>{titleOf(item)}</Link>}
      campaign={item.campaign.title}
      facts={factsOf(item.capturedAt, item.durationSec, item.accM)}
    >
      {rejected && line !== null && <Reason>{line}</Reason>}
      <Link className="card-bottom" to={to}>
        <span>{copy.VIEW_SUBMISSION}</span>
        <span className="arrow-circle">
          <Icon name="arrow" size={ARROW_ICON} />
        </span>
      </Link>
    </CardShell>
  );
}

type DiscardProps = { row: QueuedRecording; onDiscard: () => void; onKeep: () => void };

/** The inline confirmation: it names the recording first, then asks (pattern 11). */
function ConfirmDiscard({ row, onDiscard, onKeep }: DiscardProps) {
  return (
    <>
      <Facts
        rows={[
          [titleOf(row), copy.kindLabel(row.kind, row.month)],
          [copy.FACT_RECORDED, localDateTime(row.capturedAt)],
        ]}
      />
      <p className="pl-reason" role="alert">
        <Icon name="warning" size={WARN_ICON} />
        <span>{copy.DISCARD_QUESTION}</span>
      </p>
      <div className="pl-actions">
        <Button onClick={onDiscard}>{copy.DISCARD}</Button>
        <Button variant="outline" onClick={onKeep}>
          {copy.KEEP_IT}
        </Button>
      </div>
    </>
  );
}

type QueuedProps = {
  row: QueuedRecording;
  index: number;
  expired: boolean;
  online: boolean;
  sending: boolean;
  /** Another card is sending: this one's "Upload now" waits. */
  otherSending: boolean;
  confirming: boolean;
  failure: SendFailure | null;
  onSend: () => void;
  onAskDiscard: () => void;
  onDiscard: () => void;
  onKeep: () => void;
};

/** A recording on this device: "Waiting", or marked expired past the upload window; never a link. */
export function QueuedCard(props: QueuedProps) {
  const { row, index, expired, online, sending, otherSending, confirming, failure } = props;

  return (
    <CardShell
      index={index}
      art={<UploadCardArt kind={row.kind} status="queued" queued at={-1} index={index} />}
      badge={
        expired
          ? badgeOf(<Lorem id={copy.EXPIRED_COPY} kind="label" />, 'refunding')
          : badgeOf(copy.WAITING, 'funding')
      }
      kind={copy.kindLabel(row.kind, row.month)}
      {...(row.campaign.regionName === undefined ? {} : { region: row.campaign.regionName })}
      title={titleOf(row)}
      campaign={row.campaign.title}
      facts={factsOf(row.capturedAt, row.durationSec, row.payload.acc)}
    >
      {expired && <Reason>{REASON_TEXT.stale_capture}</Reason>}
      {confirming ? (
        <ConfirmDiscard row={row} onDiscard={props.onDiscard} onKeep={props.onKeep} />
      ) : (
        <>
          {failure !== null && <SendAlert failure={failure} />}
          <div className="pl-actions">
            <Button
              busy={sending}
              busyLabel={fillCopy('COPY-203')}
              disabled={!online || expired || otherSending}
              onClick={props.onSend}
            >
              {copy.UPLOAD_NOW}
            </Button>
            <Button variant="text" disabled={sending} onClick={props.onAskDiscard}>
              {copy.DISCARD}
            </Button>
          </div>
        </>
      )}
    </CardShell>
  );
}

/** "Online · upload within 72 hours of recording; …", with the dot lit when online. */
export function StatusLine({ online }: { online: boolean }) {
  return (
    <p className="pl-status">
      <span className={`pl-dot ${online ? 'on' : ''}`.trim()} />
      {online ? copy.ONLINE : copy.OFFLINE_WORD} · {copy.STATUS_LINE}
    </p>
  );
}
