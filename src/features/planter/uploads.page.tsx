// S20 Uploads (s20-uploads.md): the recordings on this phone waiting to be sent (IndexedDB queue) and the submissions this
// account sent (server list), newest first, with a filter, why a rejected one was turned back, "Upload now" for a queued
// one and a confirmed "Discard". Queued cards are client data; every other card shows the server's status. It lives in the
// workspace frame, so the shell's offline callout wraps it.
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useSearchParams } from 'react-router';
import { useSession } from '../../app/session/session';
import { ErrorView } from '../../app/states/states';
import { ERROR_BODY, ERROR_TITLE, LOADING } from '../../app/states/states.copy';
import { useOnline } from '../../app/states/use-online';
import { ApiError } from '../../shared/api/errors';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { CatalogSection } from '../../shared/ui/CatalogSection';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Grid } from '../../shared/ui/Grid';
import { LoadMore } from '../../shared/ui/LoadMore';
import { Lorem } from '../../shared/ui/Lorem';
import { PageHead } from '../../shared/ui/PageHead';
import { Skeleton } from '../../shared/ui/Skeleton';
import { usePlanterUploads } from './planter.api';
import { CLEAR_FILTERS, LOAD_MORE_COPY, LOAD_MORE_FAILED_COPY, TRY_AGAIN } from './planter.copy';
import * as copy from './uploads.copy';
import { QueuedCard, SentCard, StatusLine } from './uploads.parts';
import { UploadArt } from './uploads.art';
import {
  flattenUploads,
  isExpired,
  paramOf,
  parseFilter,
  serverFilterOf,
  shownTotal,
  withoutSent,
  type Filter,
} from './uploads.rules';
import { FADE_AFTER_MS, useFadeAfter } from './use-fade-after';
import { useNow } from './use-now';
import { useLocalQueue, useQueueActions } from './use-uploads';

// COPY-200 and COPY-201 name the list by the word this page already uses for it
const NOUN = 'recordings';

function useUploads(profileId: string) {
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get('filter'));
  const { filter: listed, asks } = serverFilterOf(filter);
  const query = usePlanterUploads(listed, asks);
  const queue = useLocalQueue(profileId);
  const { items, total, summary } = flattenUploads(query.data?.pages);
  const showsLocal = filter === 'All' || filter === 'Waiting';
  const rows = showsLocal ? withoutSent(queue.data ?? [], items) : [];

  return {
    filter,
    asks,
    query,
    rows,
    items: filter === 'Waiting' ? [] : items,
    total,
    summary,
    local: withoutSent(queue.data ?? [], items).length,
    pick: (next: Filter) => {
      const param = paramOf(next);

      setParams(param === undefined ? {} : { filter: param }, { replace: true });
    },
  };
}

type Uploads = ReturnType<typeof useUploads>;

function Empty({ uploads }: { uploads: Uploads }) {
  const { filter, local, summary } = uploads;

  if (filter !== 'All' && (local > 0 || (summary?.all ?? 0) > 0)) {
    return (
      <EmptyState
        variant="compact"
        icon="tree"
        title={<Lorem id={copy.NO_MATCH_COPY} kind="label" />}
      >
        <Button variant="outline" onClick={() => uploads.pick('All')}>
          {CLEAR_FILTERS}
        </Button>
      </EmptyState>
    );
  }

  return (
    <EmptyState variant="compact" icon="tree" title={copy.NO_RECORDINGS}>
      <Link to="/app/planter/trees">{copy.GO_TO_TREES}</Link>
    </EmptyState>
  );
}

/** Nothing to list: no local row, no server item, and no server list still on its way. */
const isEmpty = ({ rows, items, asks, query }: Uploads): boolean =>
  rows.length === 0 && items.length === 0 && !(asks && query.isPending);

/** "Load more" while the server has another page; a failed page keeps the loaded cards and offers the same cursor again. */
function MoreRow({ uploads }: { uploads: Uploads }) {
  const { query, items, total } = uploads;

  if (!query.hasNextPage) {
    return null;
  }

  return (
    <LoadMore
      shown={items.length}
      total={total}
      label={<Lorem id={LOAD_MORE_COPY} values={{ noun: NOUN }} />}
      loading={query.isFetchingNextPage}
      {...(query.isFetchNextPageError
        ? { failed: <Lorem id={LOAD_MORE_FAILED_COPY} values={{ noun: NOUN }} /> }
        : {})}
      onMore={() => void query.fetchNextPage()}
    />
  );
}

function Cards({ uploads }: { uploads: Uploads }) {
  const { query, rows, items } = uploads;
  const actions = useQueueActions();
  const online = useOnline();
  const now = useNow();
  const fading = useFadeAfter(query.isPlaceholderData, FADE_AFTER_MS);

  if (isEmpty(uploads)) {
    return <Empty uploads={uploads} />;
  }

  return (
    <>
      <div
        className={query.isPlaceholderData && fading ? 'is-refreshing' : undefined}
        aria-busy={query.isPlaceholderData || undefined}
      >
        <Grid>
          <AnimatePresence mode="popLayout">
            {rows.map((row, index) => (
              <QueuedCard
                key={row.id}
                row={row}
                index={index}
                expired={isExpired(row, now)}
                online={online}
                sending={actions.sendingId === row.id}
                otherSending={actions.sendingId !== null}
                confirming={actions.confirmingId === row.id}
                failure={actions.failures[row.id] ?? null}
                onSend={() => void actions.upload(row)}
                onAskDiscard={() => actions.confirm(row.id)}
                onDiscard={() => void actions.discard(row.id)}
                onKeep={() => actions.confirm(null)}
              />
            ))}
            {items.map((item, index) => (
              <SentCard key={item.id} item={item} index={rows.length + index} />
            ))}
          </AnimatePresence>
        </Grid>
      </div>
      {uploads.asks && query.isPending && <Skeleton shape="cards" label={LOADING} />}
      <MoreRow uploads={uploads} />
    </>
  );
}

/** The server list failed: the local cards stay usable, the failure sits under them with "Try again". */
function ListFailed() {
  const queryClient = useQueryClient();

  return (
    <Banner
      tone="error"
      action={TRY_AGAIN}
      onAction={() => void queryClient.invalidateQueries({ queryKey: ['planter', 'uploads'] })}
    >
      <strong>{ERROR_TITLE}</strong> {ERROR_BODY}
    </Banner>
  );
}

function Page({ profileId }: { profileId: string }) {
  const uploads = useUploads(profileId);
  const { query, filter, local, summary } = uploads;
  const online = useOnline();
  const forbidden = query.error instanceof ApiError && query.error.code === 'forbidden_role';

  if (forbidden) {
    return <ErrorView error={query.error} onRetry={() => void query.refetch()} />;
  }

  const total = shownTotal(filter, local, summary);

  return (
    <>
      <PageHead
        className="pl-heading"
        eyebrow={copy.UPLOADS_EYEBROW}
        title={copy.UPLOADS_LINE}
        em={copy.UPLOADS_EM}
        art={<UploadArt />}
        coord={copy.UPLOADS_COORD}
      >
        <StatusLine online={online} />
      </PageHead>
      <CatalogSection
        className="pl-catalog"
        title={copy.UPLOADS_CATALOG}
        kicker={copy.UPLOADS_KICKER}
        filters={copy.UPLOAD_FILTERS}
        filtersLabel={copy.UPLOAD_FILTERS_LABEL}
        value={filter}
        onChange={(next) => uploads.pick(next as Filter)}
        {...(total === null
          ? {}
          : {
              meta: copy.uploadsMeta(total, summary === undefined ? null : local + summary.all),
              aside: <span className="newest-label">{copy.waitingNote(local)}</span>,
            })}
      >
        <Cards uploads={uploads} />
        {query.isError && <ListFailed />}
      </CatalogSection>
    </>
  );
}

export function Component() {
  const session = useSession();

  return session.phase === 'ready' ? <Page profileId={session.profile.id} /> : null;
}
