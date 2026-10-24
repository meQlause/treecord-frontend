// S16 My trees (s16-my-trees.md): the planter's trees as cards — the overview totals, a status filter in the URL, six
// milestone dots, the next payout and exactly one primary action per tree, chosen from the server's capture blocks. The
// page never decides eligibility. It lives in the workspace frame, so the shell's offline callout wraps it.
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useSearchParams } from 'react-router';
import { useSession } from '../../app/session/session';
import { ErrorView } from '../../app/states/states';
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
import { LOADING } from '../../app/states/states.copy';
import { useLocalDeviceId } from './device.store';
import { Overview, TreeCard } from './my-trees.parts';
import { usePlanterTrees, type PlanterTree } from './planter.api';
import { TreesArt } from './planter.art';
import {
  CLEAR_FILTERS,
  LOAD_MORE_COPY,
  LOAD_MORE_FAILED_COPY,
  NO_MATCHING_TREES,
  TREES_CATALOG,
  TREES_COORD,
  TREES_EM,
  TREES_EYEBROW,
  TREES_KICKER_LINE,
  TREES_LINE,
  TREE_FILTERS,
  TREE_FILTERS_LABEL,
  TRY_AGAIN,
  VIEW_SLOTS,
  WALLET_WAIT,
  openNote,
  treeCount,
} from './planter.copy';
import { filterOf, flattenTrees, parseStatus, statusOfFilter } from './planter.rules';

const FADE_AFTER_MS = 300;

/** True once `active` has held for `delay` ms: the cards of a filter that is loading fade only if it takes a while. */
function useFadeAfter(active: boolean, delay: number): boolean {
  const [late, setLate] = useState(false);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = setTimeout(() => setLate(true), delay);

    return () => {
      clearTimeout(timer);
      setLate(false);
    };
  }, [active, delay]);

  return late;
}

function useTrees() {
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get('status'));
  const query = usePlanterTrees(status);
  const session = useSession();
  const localDeviceId = useLocalDeviceId(
    session.phase === 'ready' ? session.profile.id : undefined,
  );

  return {
    status,
    query,
    localDeviceId,
    ...flattenTrees(query.data?.pages),
    pick: (filter: string) => {
      const next = statusOfFilter(filter);

      setParams(next === undefined ? {} : { status: next }, { replace: true });
    },
  };
}

type Trees = ReturnType<typeof useTrees>;

function Cards({ trees }: { trees: Trees }) {
  const { query, items, total, localDeviceId, status } = trees;
  const fading = useFadeAfter(query.isPlaceholderData, FADE_AFTER_MS);

  if (items.length === 0) {
    return status === undefined ? (
      <EmptyState variant="compact" icon="tree" title={NO_MATCHING_TREES}>
        <Link to="/app/planter/slots">{VIEW_SLOTS}</Link>
      </EmptyState>
    ) : (
      <EmptyState variant="compact" icon="tree" title={NO_MATCHING_TREES}>
        <Button variant="outline" onClick={() => trees.pick('All')}>
          {CLEAR_FILTERS}
        </Button>
      </EmptyState>
    );
  }

  return (
    <>
      <div
        className={query.isPlaceholderData && fading ? 'is-refreshing' : undefined}
        aria-busy={query.isPlaceholderData || undefined}
      >
        <Grid>
          <AnimatePresence mode="popLayout">
            {items.map((tree: PlanterTree, index) => (
              <TreeCard key={tree.treeId} tree={tree} localDeviceId={localDeviceId} index={index} />
            ))}
          </AnimatePresence>
        </Grid>
      </div>
      {query.hasNextPage && (
        <LoadMore
          shown={items.length}
          total={total}
          label={<Lorem id={LOAD_MORE_COPY} kind="label" />}
          loading={query.isFetchingNextPage}
          {...(query.isFetchNextPageError ? { failed: <Lorem id={LOAD_MORE_FAILED_COPY} /> } : {})}
          onMore={() => void query.fetchNextPage()}
        />
      )}
    </>
  );
}

function Failure({ trees }: { trees: Trees }) {
  const queryClient = useQueryClient();
  const { error } = trees.query;
  const retry = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['planter', 'trees'] });
  };

  if (error instanceof ApiError && error.code === 'wallet_missing') {
    return (
      <Banner tone="callout" action={TRY_AGAIN} onAction={() => void trees.query.refetch()}>
        {WALLET_WAIT}
      </Banner>
    );
  }

  return <ErrorView error={error} onRetry={retry} />;
}

export function Component() {
  const trees = useTrees();
  const { query, summary } = trees;
  const head = (
    <PageHead
      className="pl-heading"
      eyebrow={TREES_EYEBROW}
      title={TREES_LINE}
      em={TREES_EM}
      art={<TreesArt />}
      coord={TREES_COORD}
    />
  );

  if (query.isError && query.data === undefined) {
    return (
      <>
        {head}
        <Failure trees={trees} />
      </>
    );
  }

  if (summary === undefined) {
    return <Skeleton shape="list" label={LOADING} />;
  }

  return (
    <>
      {head}
      {summary.treeCount > 0 && <Overview summary={summary} />}
      <CatalogSection
        className="pl-catalog"
        title={TREES_CATALOG}
        kicker={TREES_KICKER_LINE}
        filters={TREE_FILTERS}
        filtersLabel={TREE_FILTERS_LABEL}
        value={filterOf(trees.status)}
        onChange={trees.pick}
        meta={treeCount(trees.total, summary.treeCount)}
        aside={<span className="newest-label">{openNote(summary.openCheckIns)}</span>}
      >
        <Cards trees={trees} />
      </CatalogSection>
    </>
  );
}
