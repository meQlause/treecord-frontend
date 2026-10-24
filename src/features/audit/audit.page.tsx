// S23 Open audit (s23-open-audit.md): open a session on one campaign with a sample size, and list every session the auditor
// opened on any device, newest first, filtered by status (`?status=`). The role gate (auditor) is the route's. No optimistic
// card: a session shows only after the 201.
import { AnimatePresence } from 'motion/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useSearchParams } from 'react-router';
import { useOnline } from '../../app/states/use-online';
import { Banner } from '../../shared/ui/Banner';
import { CatalogSection } from '../../shared/ui/CatalogSection';
import { EmptyState } from '../../shared/ui/EmptyState';
import { LoadMore } from '../../shared/ui/LoadMore';
import { Lorem } from '../../shared/ui/Lorem';
import { PageHead } from '../../shared/ui/PageHead';
import { Button } from '../../shared/ui/Button';
import { FlowArt, SampleArt } from './audit.art';
import { useSessions, type SessionItem, type SessionStatus } from './audit.api';
import * as copy from './audit.copy';
import { Duo, ListSkeleton, SessionCard } from './audit.parts';

const [ALL, OPEN, CLOSED] = copy.STATUS_FILTERS;

// FR-184's fixed example, never the auditor's own sessions: block 0x39e4…a4cd, population and sample as published
const EXAMPLE_HASH = '0x39e41cfd9e316d39bb6ad8058c9cfbbb2d19fa7938c68e1e32009e56e735a4cd';
const EXAMPLE_POPULATION = ['3001', '3020', '3021', '3091', '3092', '3103', '3104'];
const EXAMPLE_SAMPLE = ['3001', '3091', '3104'];

const statusOf = (param: string | null): SessionStatus => {
  if (param === 'open' || param === 'closed') {
    return param;
  }

  return undefined;
};

const filterOf = (status: SessionStatus): string => {
  if (status === undefined) {
    return ALL;
  }

  return status === 'open' ? OPEN : CLOSED;
};

type Query = ReturnType<typeof useSessions>;

function NoSessions({ status }: { status: SessionStatus }) {
  const [, setParams] = useSearchParams();

  return status === undefined ? (
    <EmptyState variant="compact" title={copy.NO_SESSIONS}>
      <p>{copy.NO_SESSIONS_BODY}</p>
    </EmptyState>
  ) : (
    <EmptyState variant="compact" title={<Lorem id={copy.FILTER_EMPTY_COPY} kind="label" />}>
      <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
        {copy.CLEAR_FILTERS}
      </Button>
    </EmptyState>
  );
}

type MoreProps = { query: Query; shown: number; total: number; online: boolean };

function MoreSessions({ query, shown, total, online }: MoreProps) {
  return (
    <LoadMore
      shown={shown}
      total={total}
      label={<Lorem id={copy.LOAD_MORE_COPY} kind="label" />}
      loading={query.isFetchingNextPage || !online}
      {...(query.isFetchNextPageError ? { failed: <Lorem id={copy.LOAD_MORE_FAILED_COPY} /> } : {})}
      onMore={() => void query.fetchNextPage()}
    />
  );
}

function SessionGrid({ items, refreshing }: { items: SessionItem[]; refreshing: boolean }) {
  return (
    <div
      className={refreshing ? 'campaign-grid is-refreshing' : 'campaign-grid'}
      aria-busy={refreshing || undefined}
    >
      <AnimatePresence mode="popLayout">
        {items.map((session, index) => (
          <SessionCard key={session.id} session={session} index={index} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Cards({
  query,
  status,
  online,
}: {
  query: Query;
  status: SessionStatus;
  online: boolean;
}) {
  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const total = pages.at(-1)?.total ?? 0;

  if (items.length === 0) {
    return <NoSessions status={status} />;
  }

  return (
    <>
      <SessionGrid items={items} refreshing={query.isPlaceholderData} />
      {query.hasNextPage && (
        <MoreSessions query={query} shown={items.length} total={total} online={online} />
      )}
    </>
  );
}

function SessionsBody({
  query,
  status,
  online,
}: {
  query: Query;
  status: SessionStatus;
  online: boolean;
}) {
  if (query.isError && query.data === undefined) {
    return (
      <Banner tone="error" action={copy.TRY_AGAIN} onAction={() => void query.refetch()}>
        {copy.UNAVAILABLE}
      </Banner>
    );
  }

  return query.data === undefined ? (
    <ListSkeleton />
  ) : (
    <Cards query={query} status={status} online={online} />
  );
}

function Sessions({ status, online }: { status: SessionStatus; online: boolean }) {
  const query = useSessions(status);
  const [, setParams] = useSearchParams();
  const total = query.data?.pages.at(-1)?.total;

  return (
    <CatalogSection
      title={copy.SESSIONS}
      kicker={copy.SESSIONS_KICKER}
      filters={copy.STATUS_FILTERS}
      filtersLabel={copy.STATUS_LABEL}
      value={filterOf(status)}
      onChange={(next) =>
        setParams(next === ALL ? {} : { status: next.toLowerCase() }, { replace: true })
      }
      {...(total === undefined ? {} : { meta: copy.sessionsMeta(total) })}
      aside={<span className="newest-label">{copy.NEWEST_FIRST}</span>}
    >
      <SessionsBody query={query} status={status} online={online} />
    </CatalogSection>
  );
}

export function Component() {
  const [params] = useSearchParams();
  const online = useOnline();

  return (
    <>
      <PageHead
        eyebrow={copy.OPEN_EYEBROW}
        title={copy.OPEN_TITLE}
        em={copy.OPEN_EM}
        art={
          <SampleArt
            population={EXAMPLE_POPULATION}
            samples={EXAMPLE_SAMPLE}
            blockHash={EXAMPLE_HASH}
          />
        }
        coord={copy.OPEN_COORD}
      />
      <Duo online={online} art={<FlowArt />} />
      <Sessions status={statusOf(params.get('status'))} online={online} />
    </>
  );
}
