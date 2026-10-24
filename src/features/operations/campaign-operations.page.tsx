// S27 Campaign operations (s27-campaign-operations.md): one campaign's four operator tabs — anchor assignment, estimate, mirror
// issuance, inventory price — each ending in a queued job, plus the way into S28. No optimistic UI: a 202 shows its job, and
// the slots, estimate, batch and price show only what the read model returns once the indexer has mirrored the event.
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useNavigate, useParams } from 'react-router';
import { useOnline } from '../../app/states/use-online';
import { ErrorView, NotFoundState } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { Tag } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Field } from '../../shared/ui/Field';
import { Panel } from '../../shared/ui/Panel';
import { Skeleton } from '../../shared/ui/Skeleton';
import { JobCallout } from './operations.action';
import { useOperatorCampaign, type OperatorCampaign } from './operations.api';
import * as copy from './operations.copy';
import { walletOk } from './operations.rules';
import { AnchorTab, EstimateTab, IssuanceTab, PriceTab, type TabProps } from './operations.tabs';

type Tab = (typeof copy.OPS_TABS)[number];

const BODY: Readonly<Record<Tab, (props: TabProps) => ReactNode>> = {
  'Anchor assignment': AnchorTab,
  'Carbon estimate': EstimateTab,
  'Mirror issuance': IssuanceTab,
  'Inventory price': PriceTab,
};

/** The job kinds each tab owns (s27 §2.1 `queuedJobs[].kind`). */
const KINDS: Readonly<Record<Tab, string>> = {
  'Anchor assignment': 'anchor_assign',
  'Carbon estimate': 'estimate',
  'Mirror issuance': 'issue',
  'Inventory price': 'set_price',
};

const ICON: Readonly<Record<Tab, 'tree' | 'carbon'>> = {
  'Anchor assignment': 'tree',
  'Carbon estimate': 'carbon',
  'Mirror issuance': 'carbon',
  'Inventory price': 'carbon',
};

function KnownSubmission({ online }: { online: boolean }) {
  const [reviewId, setReviewId] = useState('');
  const navigate = useNavigate();
  const open = (event: FormEvent): void => {
    event.preventDefault();
    void navigate(`/app/operator/submissions/${encodeURIComponent(reviewId.trim())}`);
  };

  return (
    <Panel title={copy.KNOWN_SUBMISSION} icon="check">
      <form onSubmit={open}>
        <Field label={copy.SUBMISSION_ID}>
          <input required value={reviewId} onChange={(event) => setReviewId(event.target.value)} />
        </Field>
        <Button variant="outline" type="submit" disabled={!online || reviewId.trim() === ''}>
          {copy.OPEN_REVIEW}
        </Button>
      </form>
      <p className="ws-note">{copy.OPEN_BY_ID}</p>
    </Panel>
  );
}

type OperationsProps = { data: OperatorCampaign; refreshing: boolean; refresh: () => void };

function Operations({ data, refreshing, refresh }: OperationsProps) {
  const [tab, setTab] = useState<Tab>('Anchor assignment');
  const [tracked, setTracked] = useState<string | null>(null);
  const online = useOnline();
  const Body = BODY[tab];
  const { address, title, status } = data.campaign;
  const queued = data.queuedJobs.filter(({ kind, id }) => kind === KINDS[tab] && id !== tracked);

  return (
    <>
      <div className="ws-intro">
        <span>{copy.OPS_EYEBROW}</span>
        <h1 className="wrap-any">{title}</h1>
        <Tag>{status}</Tag>
      </div>
      <div className="ws-actions">
        <Link to={`/campaigns/${address}`}>{copy.LINK_CAMPAIGN}</Link>
        <Link to={`/campaigns/${address}/report`}>{copy.LINK_REPORT}</Link>
      </div>
      <div className="ws-filters">
        {copy.OPS_TABS.map((name) => (
          <button key={name} type="button" aria-pressed={name === tab} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>
      <Panel key={tab} title={tab} icon={ICON[tab]}>
        <div
          className={refreshing ? 'is-refreshing' : undefined}
          aria-busy={refreshing || undefined}
        >
          <Body data={data} online={online} onQueued={setTracked} onRefetch={refresh} />
          {tracked !== null && <JobCallout id={tracked} onConfirmed={refresh} />}
          {queued.map(({ id }) => (
            <JobCallout key={id} id={id} onConfirmed={refresh} />
          ))}
        </div>
      </Panel>
      <KnownSubmission online={online} />
    </>
  );
}

export function Component() {
  const { address = '' } = useParams();
  const valid = walletOk(address);
  const query = useOperatorCampaign(address, valid);
  const queryClient = useQueryClient();
  // every operator read of this page: the read model and the batches
  const refresh = (): void =>
    void queryClient.invalidateQueries({
      predicate: ({ queryKey }) => queryKey.includes('operator'),
    });

  if (!valid) {
    return <NotFoundState title={copy.CAMPAIGN_NOT_FOUND} />;
  }

  if (query.isError && query.data === undefined) {
    return (
      <ErrorView
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle={copy.CAMPAIGN_NOT_FOUND}
      />
    );
  }

  if (query.data === undefined) {
    return <Skeleton shape="panel" label={LOADING} />;
  }

  return (
    <Operations
      data={query.data}
      refreshing={query.isFetching && query.data.queuedJobs.length === 0}
      refresh={refresh}
    />
  );
}
