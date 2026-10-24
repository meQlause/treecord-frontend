// The lower half of the report (s06-report.md §1): carbon, evidence and the foot. Mockup report.jsx:41-48.
import type { ReactNode } from 'react';
import { localDateTime } from '../../shared/format/datetime';
import { blockUrl, txUrl } from '../../shared/format/explorer';
import { shortAddress } from '../../shared/format/address';
import { tonnes, unitCount } from '../../shared/format/carbon';
import { CarbonFunnel } from '../../shared/ui/CarbonFunnel';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { LoadMore } from '../../shared/ui/LoadMore';
import { Lorem } from '../../shared/ui/Lorem';
import type { Batch, EvidenceItem, Report } from './report.api';
import * as copy from './report.copy';
import { Empty, Heading, Metric, Say } from './report.parts';
import { eventLabel } from './report.rules';

/** A hash or block that links to the explorer, or plain text on a chain that has none. */
function ExplorerLink({ href, children }: { href: string | null; children: ReactNode }) {
  return href === null ? (
    children
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function BatchRow({ batch }: { batch: Batch }) {
  return (
    <tr>
      <td>
        <ArrowLink to={`/carbon/${batch.batchId}`}>
          #{batch.batchId} · {batch.registry}
        </ArrowLink>
      </td>
      <td>{batch.vintage}</td>
      <td className="rp-serial">
        {batch.serialStart}
        <span className="sr-only"> / </span>
        <br />
        {batch.serialEnd}
      </td>
      <td>{tonnes(batch.issuedAmount)}</td>
      <td>
        {batch.issuedTxHash === null ? (
          '—'
        ) : (
          <ExplorerLink href={txUrl(batch.issuedTxHash)}>
            {shortAddress(batch.issuedTxHash)}
          </ExplorerLink>
        )}
      </td>
    </tr>
  );
}

function Batches({ batches }: { batches: readonly Batch[] }) {
  return (
    <div className="rp-table-wrap">
      <table>
        <caption>{copy.BATCHES_CAPTION}</caption>
        <thead>
          <tr>
            {copy.BATCH_HEADERS.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <BatchRow key={batch.batchId} batch={batch} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Estimate({ estimate }: { estimate: Report['carbon']['estimate'] }) {
  const amount = estimate.estimatedAmount;

  return (
    <div>
      <span className="eyebrow">{copy.PRE_CERTIFICATION}</span>
      <Metric
        label={copy.ESTIMATE}
        value={amount === null ? copy.NOT_ESTIMATED : tonnes(amount)}
        unit={amount === null ? '' : copy.TONNES}
      />
      {amount !== null && estimate.method !== null && (
        <p className="rp-note">
          <Say message={copy.METHOD_LABEL} /> · {estimate.method.model}
        </p>
      )}
      <p className="rp-note">
        {amount === null ? copy.NO_ESTIMATE_NOTE : copy.estimateNote(unitCount(amount))}
      </p>
    </div>
  );
}

function Funnel({ estimate, issued }: { estimate: string; issued: Report['carbon']['issued'] }) {
  const rows = [
    [copy.FUNNEL_KEYS[0], Number(estimate)],
    [copy.FUNNEL_KEYS[1], Number(issued.issuedAmount)],
    [copy.FUNNEL_KEYS[2], Number(issued.retiredAmount)],
  ] as const;

  return (
    <div className="rp-funnel">
      <CarbonFunnel rows={rows} />
      <span>
        {copy.FUNNEL_KEYS.map((key, index) => (
          <span key={key}>
            <i className={`pc-key k${index}`} />
            {key}
          </span>
        ))}
      </span>
    </div>
  );
}

export function Carbon({ carbon }: { carbon: Report['carbon'] }) {
  const { estimate, issued } = carbon;

  return (
    <section className="rp-section">
      <Heading icon="carbon">{copy.CARBON_TITLE}</Heading>
      <div className="rp-carbon">
        <Estimate estimate={estimate} />
        <div>
          <span className="eyebrow">{copy.ISSUED_CREDITS}</span>
          <div className="rp-incentives">
            <Metric
              label={copy.TOTAL_ISSUED}
              value={tonnes(issued.issuedAmount)}
              unit={copy.TONNES}
            />
            <Metric label={copy.RETIRED} value={tonnes(issued.retiredAmount)} unit={copy.TONNES} />
          </div>
          <p className="rp-note">
            {copy.issuedNote(unitCount(issued.issuedAmount), unitCount(issued.retiredAmount))}
          </p>
        </div>
      </div>
      {estimate.estimatedAmount !== null && Number(issued.issuedAmount) > 0 && (
        <Funnel estimate={estimate.estimatedAmount} issued={issued} />
      )}
      {issued.batches.length > 0 ? (
        <Batches batches={issued.batches} />
      ) : (
        <Empty kind="carbon">{copy.NO_ISSUANCE}</Empty>
      )}
    </section>
  );
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  return (
    <tr>
      <td>
        <ArrowLink to={`/trees/${item.treeId}`}>#{item.treeId}</ArrowLink>
      </td>
      <td>
        <Say message={eventLabel(item.kind, item.month)} />
      </td>
      <td>{localDateTime(item.at)}</td>
      <td>
        <code>{shortAddress(item.evidenceHash)}</code>
      </td>
      <td>
        <ExplorerLink href={blockUrl(item.blockNumber)}>{item.blockNumber}</ExplorerLink>
        {' / '}
        <ExplorerLink href={txUrl(item.txHash)}>{shortAddress(item.txHash)}</ExplorerLink>
      </td>
    </tr>
  );
}

function EvidenceTable({ items }: { items: readonly EvidenceItem[] }) {
  return (
    <div className="rp-table-wrap">
      <table>
        <caption>{copy.EVIDENCE_CAPTION}</caption>
        <thead>
          <tr>
            {copy.EVIDENCE_HEADERS.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <EvidenceRow key={`${item.treeId}-${item.txHash}-${item.evidenceHash}`} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type MoreEvidence = {
  hasMore: boolean;
  total: number;
  loading: boolean;
  failed: boolean;
  onMore: () => void;
};

type EvidenceProps = { items: readonly EvidenceItem[]; signedIn: boolean; more: MoreEvidence };

/** E-1…E-6: the table, the roster note when signed in, and the load-more row under the table wrapper. */
export function Evidence({ items, signedIn, more }: EvidenceProps) {
  return (
    <section className="rp-section">
      <Heading icon="check" note={copy.EVIDENCE_NOTE}>
        {copy.EVIDENCE_TITLE}
      </Heading>
      {signedIn && <p className="rp-note">{copy.ROSTER_NOTE}</p>}
      {items.length === 0 ? (
        <Empty kind="evidence">{copy.NO_EVIDENCE}</Empty>
      ) : (
        <>
          <EvidenceTable items={items} />
          {(more.hasMore || more.failed) && (
            <LoadMore
              shown={items.length}
              total={more.hasMore ? Math.max(more.total, items.length + 1) : items.length}
              label={<Lorem id={copy.MORE_LABEL.copyId} kind="label" />}
              loading={more.loading}
              failed={more.failed ? <Lorem id={copy.MORE_FAILED.copyId} /> : undefined}
              onMore={more.onMore}
              testId="evidence-more"
            />
          )}
        </>
      )}
    </section>
  );
}

export function Foot({ address }: { address: string }) {
  return (
    <div className="rp-foot">
      <span>{copy.CAMPAIGN_ADDRESS}</span>
      <code>{address}</code>
    </div>
  );
}
