// S03 Campaigns (s03-campaigns.md): the public catalog, newest first, filtered through the URL, "Load more" by cursor.
// Public: no guard, nothing is sent but the filters. It is not inside the workspace frame, so it draws its own
// offline and error states (FR-034) instead of the shell's.
import { onlineManager } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useSearchParams } from 'react-router';
import { useToast } from '../../app/shell/toast-context';
import { useOnline } from '../../app/states/use-online';
import { Icon } from '../../shared/art/Icon';
import { Landscape } from '../../shared/art/Landscape';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { CatalogSection } from '../../shared/ui/CatalogSection';
import { Grid } from '../../shared/ui/Grid';
import { LoadMore } from '../../shared/ui/LoadMore';
import { PageHead } from '../../shared/ui/PageHead';
import { useCampaignCatalog, useSpecies } from './campaigns.api';
import {
  CATALOG_KICKER,
  CATALOG_TITLE,
  CLEAR_FILTERS,
  ERROR_META,
  HERO_COORD,
  HERO_EM,
  HERO_EYEBROW,
  HERO_LINE_ONE,
  HERO_LINE_TWO,
  LOADING_META,
  LOAD_MORE,
  LOAD_MORE_BUSY,
  MORE_FAILED,
  NEWEST_FIRST,
  OFFLINE_CACHED,
  REFRESH,
  REFRESHED,
  STAMP_BOTTOM,
  STAMP_TOP,
  STATUS_FILTERS,
  STATUS_FILTERS_LABEL,
  campaignCount,
  loadedLine,
} from './campaigns.copy';
import {
  CampaignCard,
  CatalogMessage,
  RegionField,
  Skeletons,
  SpeciesSelect,
} from './campaigns.parts';
import {
  catalogView,
  filterState,
  flattenPages,
  parseRegion,
  parseStatus,
  requestFilters,
  withParam,
} from './campaigns.rules';

const STAMP_ICON = 20;

/** Search params are the filters (FR-032); every change replaces the entry, and a changed filter restarts the cursor. */
function useUrlFilters() {
  const [params, setParams] = useSearchParams();
  const species = useSpecies();
  const url = {
    status: parseStatus(params.get('status')),
    species: params.get('species') ?? '',
    region: parseRegion(params.get('region')) ?? '',
  };
  const request = requestFilters(url, species.data);
  const set = useCallback(
    (name: 'status' | 'species' | 'region', value: string) =>
      setParams((current) => withParam(current, name, value), { replace: true }),
    [setParams],
  );
  const clear = useCallback(() => setParams({}, { replace: true }), [setParams]);
  const { selectedSpecies, active, waiting } = filterState(url, request, species.data);

  return {
    url,
    request,
    species,
    set,
    clear,
    selectedSpecies,
    active,
    waiting,
    speciesFailed: waiting && species.isError,
    speciesPaused: waiting && species.fetchStatus === 'paused',
  };
}

/** C-15 / C-16: once the browser has gone offline the cached cards wear a banner until "Refresh" succeeds. */
function useStale() {
  const [stale, setStale] = useState(() => !onlineManager.isOnline());

  useEffect(
    () =>
      onlineManager.subscribe((online) => {
        if (!online) {
          setStale(true);
        }
      }),
    [],
  );

  return [stale, setStale] as const;
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
      art={
        <>
          <Landscape kind="grove" hero />
          <span className="art-stamp">
            <Icon name="leaf" size={STAMP_ICON} />
            <span>
              {STAMP_TOP}
              <br />
              <strong>{STAMP_BOTTOM}</strong>
            </span>
          </span>
        </>
      }
      coord={HERO_COORD}
    />
  );
}

function useCatalogPage() {
  const filters = useUrlFilters();
  const catalog = useCampaignCatalog(filters.request, !filters.waiting);
  const { items, total } = flattenPages(catalog.data?.pages);
  const { speciesFailed, speciesPaused, species } = filters;
  const view = catalogView({
    failed: (catalog.isError && catalog.data === undefined) || speciesFailed,
    pending: catalog.isPending,
    paused: catalog.fetchStatus === 'paused' || speciesPaused,
    total,
    filtered: filters.active,
  });
  // the species list is what the request waits for; when it is the one that failed, "Try again" re-asks for it
  const retry = (): void => {
    if (speciesFailed) {
      void species.refetch();

      return;
    }

    void catalog.refetch();
  };

  return { filters, catalog, items, total: total ?? 0, view, retry };
}

type Page = ReturnType<typeof useCatalogPage>;

const META: Partial<Record<Page['view'], string>> = { loading: LOADING_META, error: ERROR_META };

function Results({ page, online, onClear }: { page: Page; online: boolean; onClear: () => void }) {
  const { catalog, items, total, view } = page;

  if (view === 'loading') {
    return <Skeletons />;
  }

  if (view !== 'ready') {
    return <CatalogMessage view={view} onClear={onClear} onRetry={page.retry} />;
  }

  return (
    <>
      <Grid>
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <CampaignCard key={item.address} item={item} index={index} />
          ))}
        </AnimatePresence>
      </Grid>
      {catalog.hasNextPage && (
        <fieldset className="ws-state-body" disabled={!online}>
          <LoadMore
            shown={items.length}
            total={total}
            label={LOAD_MORE}
            meta={loadedLine(items.length, total)}
            loading={catalog.isFetchingNextPage}
            loadingLabel={LOAD_MORE_BUSY}
            {...(catalog.isFetchNextPageError ? { failed: MORE_FAILED } : {})}
            onMore={() => void catalog.fetchNextPage()}
          />
        </fieldset>
      )}
    </>
  );
}

export function Component() {
  const page = useCatalogPage();
  const { filters, catalog, view } = page;
  const { notify } = useToast();
  const online = useOnline();
  const [stale, setStale] = useStale();

  const refresh = async (): Promise<void> => {
    if (!(await catalog.refetch()).isError) {
      setStale(false);
      notify(REFRESHED);
    }
  };

  return (
    <main className="main" id="main-content" tabIndex={-1}>
      <Hero />
      <CatalogSection
        id="campaign-list"
        title={CATALOG_TITLE}
        kicker={CATALOG_KICKER}
        filters={STATUS_FILTERS}
        filtersLabel={STATUS_FILTERS_LABEL}
        value={filters.url.status}
        onChange={(status) => filters.set('status', status)}
        secondary={
          <>
            <SpeciesSelect
              value={filters.selectedSpecies}
              species={filters.species.data ?? []}
              onChange={(name) => filters.set('species', name)}
            />
            <RegionField
              committed={filters.url.region}
              onCommit={(region) => filters.set('region', region)}
            />
          </>
        }
        meta={META[view] ?? campaignCount(page.items.length, page.total)}
        aside={
          filters.active ? (
            <Button variant="text" icon="close" onClick={filters.clear}>
              {CLEAR_FILTERS}
            </Button>
          ) : (
            <span className="newest-label">{NEWEST_FIRST}</span>
          )
        }
      >
        {stale && catalog.data !== undefined && (
          <Banner icon="wifi" action={REFRESH} onAction={() => void refresh()}>
            {OFFLINE_CACHED}
          </Banner>
        )}
        <Results page={page} online={online} onClear={filters.clear} />
      </CatalogSection>
    </main>
  );
}
