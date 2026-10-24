// S07 Carbon credits (s07-carbon.md): the public catalog of every mirrored batch, newest issuance first. The three
// filters live in the URL and run in the browser over the one loaded page (FR-219): no filter sends a request.
import { AnimatePresence } from 'motion/react';
import { useEffect, useRef } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useSearchParams } from 'react-router';
import { PageHead } from '../../shared/ui/PageHead';
import { CatalogSection } from '../../shared/ui/CatalogSection';
import { Grid } from '../../shared/ui/Grid';
import { Skeleton } from '../../shared/ui/Skeleton';
import { CarbonArt } from './carbon.art';
import { useBatches } from './carbon.api';
import {
  CATALOG_KICKER,
  CATALOG_TITLE,
  HERO_COORD,
  HERO_EM,
  HERO_EYEBROW,
  HERO_LINE_ONE,
  HERO_LINE_TWO,
  LOADING,
  NEWEST_FIRST,
  STATUS_FILTERS,
  STATUS_FILTERS_LABEL,
  batchCount,
} from './carbon.copy';
import {
  BatchCard,
  CatalogMessage,
  ClearFilters,
  QueryField,
  RegistrySelect,
} from './carbon.parts';
import {
  catalogView,
  filterBatches,
  isFiltered,
  parseRegistry,
  parseStatus,
  registriesOf,
  withParam,
  type Filters,
} from './carbon.rules';

/** Search params are the filters; every change replaces the entry, and an unknown value is the default. */
function useUrlFilters(registries: readonly string[]) {
  const [params, setParams] = useSearchParams();
  // the router commits a change a moment after it is made: the next change builds on this, not on the stale render
  const latest = useRef(params);
  const filters: Filters = {
    status: parseStatus(params.get('status')),
    registry: parseRegistry(params.get('registry'), registries),
    query: params.get('q') ?? '',
  };

  useEffect(() => {
    latest.current = params;
  }, [params]);

  const change = (next: URLSearchParams): void => {
    latest.current = next;
    setParams(next, { replace: true });
  };

  return {
    filters,
    set: (name: 'status' | 'registry' | 'q', value: string): void =>
      change(withParam(latest.current, name, value)),
    clear: () => change(new URLSearchParams()),
  };
}

function Hero() {
  return (
    <PageHead
      eyebrow={HERO_EYEBROW}
      title={
        <>
          {HERO_LINE_ONE}
          <br />
          {HERO_LINE_TWO}
        </>
      }
      em={HERO_EM}
      inline
      art={<CarbonArt />}
      coord={HERO_COORD}
    />
  );
}

/** The loaded page, the filters over it and which of s07 §3's states to draw. */
function useCatalog() {
  const batches = useBatches();
  const loaded = batches.data ?? [];
  const registries = registriesOf(loaded);
  const url = useUrlFilters(registries);
  const list = filterBatches(loaded, url.filters);
  // offline with nothing cached the request waits for a network that is not there: that is a failure (state 7)
  const failed =
    (batches.isError && batches.data === undefined) ||
    (batches.isPending && batches.fetchStatus === 'paused');
  const view = catalogView(
    { isError: failed, isPending: batches.isPending },
    loaded.length,
    list.length,
  );

  return {
    ...url,
    registries,
    list,
    view,
    count: batchCount(list.length, loaded.length),
    retry: batches.refetch,
  };
}

type Catalog = ReturnType<typeof useCatalog>;

function Results({ catalog }: { catalog: Catalog }) {
  const { view, list, clear, retry } = catalog;

  if (view === 'loading') {
    return <Skeleton shape="cards" label={LOADING} />;
  }

  if (view !== 'ready') {
    return <CatalogMessage view={view} onClear={clear} onRetry={() => void retry()} />;
  }

  return (
    <Grid>
      <AnimatePresence mode="popLayout">
        {list.map((batch, index) => (
          <BatchCard key={batch.batchId} batch={batch} index={index} />
        ))}
      </AnimatePresence>
    </Grid>
  );
}

export function Component() {
  const catalog = useCatalog();
  const { filters, set, clear, view } = catalog;
  const counting = view !== 'loading' && view !== 'error';

  return (
    <main className="cb-page" id="main-content" tabIndex={-1}>
      <Hero />
      <CatalogSection
        className="cb-catalog"
        id="issued-batches"
        title={CATALOG_TITLE}
        kicker={CATALOG_KICKER}
        filters={STATUS_FILTERS}
        filtersLabel={STATUS_FILTERS_LABEL}
        value={filters.status}
        onChange={(status) => set('status', status)}
        secondary={
          <>
            <RegistrySelect
              value={filters.registry}
              registries={catalog.registries}
              onChange={(registry) => set('registry', registry)}
            />
            <QueryField value={filters.query} onChange={(query) => set('q', query)} />
          </>
        }
        meta={counting ? catalog.count : undefined}
        aside={
          isFiltered(filters) ? (
            <ClearFilters onClear={clear} />
          ) : (
            <span className="newest-label">{NEWEST_FIRST}</span>
          )
        }
      >
        <Results catalog={catalog} />
      </CatalogSection>
    </main>
  );
}
