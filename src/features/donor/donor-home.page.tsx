// S13 Donor home (s13-donor-home.md): the donor's wallet-level home — totals across the campaigns supported, "Your
// carbon", the flags rail and one card per campaign. Read-only; contributions, refunds and flags are made on S04 and S05.
// It lives inside the workspace frame, so the offline callout and the disabled fieldset of the shell wrap it too.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useSearchParams } from 'react-router';
import { useToast } from '../../app/shell/toast-context';
import { ME_KEY } from '../../app/session/use-me';
import { useStale } from '../../app/states/use-stale';
import { Banner } from '../../shared/ui/Banner';
import { Lorem } from '../../shared/ui/Lorem';
import { LoadMore } from '../../shared/ui/LoadMore';
import { SupportedCampaign } from './donor.card';
import { useDonorCampaigns, useDonorDashboard, type DonorCard } from './donor.api';
import {
  LOAD_MORE_COPY,
  LOAD_MORE_FAILED_COPY,
  MY_CAMPAIGNS,
  OFFLINE_SNAPSHOT,
  REFRESH,
  REFRESHED,
  TRY_AGAIN,
  WALLET_WAIT,
  supported,
} from './donor.copy';
import {
  DonorEmpty,
  DonorFailed,
  DonorHeading,
  DonorLoading,
  DonorTabs,
  Overview,
  TabEmpty,
} from './donor.parts';
import { DonorInsights } from './donor.rail';
import { homeView, parseTab, readOf, statusOf } from './donor.rules';

const FADE_AFTER_MS = 300;

/** True once `active` has held for `delay` ms: the cards of the tab that is loading fade only if it takes a while. */
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

function useHome() {
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get('status'));
  const dashboard = useDonorDashboard();
  const cards = useDonorCampaigns(statusOf(tab));
  const queryClient = useQueryClient();
  const pages = cards.data?.pages;
  const items: DonorCard[] = pages?.flatMap((page) => page.items) ?? [];
  const total = pages?.at(-1)?.total ?? 0;
  const view = homeView([readOf(dashboard), readOf(cards)], dashboard.data?.totals.campaigns);

  return {
    tab,
    dashboard,
    cards,
    items,
    total,
    view,
    pick: (next: string) => setParams(next === 'All' ? {} : { status: next }, { replace: true }),
    retry: () => {
      void queryClient.invalidateQueries({ queryKey: ME_KEY });
      void dashboard.refetch();
      void cards.refetch();
    },
  };
}

type Home = ReturnType<typeof useHome>;

function Campaigns({ home }: { home: Home }) {
  const { cards, items, total, tab } = home;
  const refreshing = cards.isPlaceholderData;
  const fading = useFadeAfter(refreshing, FADE_AFTER_MS);

  if (items.length === 0 && !cards.isFetching) {
    return <TabEmpty tab={tab} onShowAll={() => home.pick('All')} />;
  }

  return (
    <>
      <div
        className={refreshing && fading ? 'is-refreshing' : undefined}
        aria-busy={refreshing || undefined}
      >
        {items.map((card, index) => (
          <SupportedCampaign key={card.campaign.address} card={card} index={index} />
        ))}
      </div>
      {cards.hasNextPage && (
        <LoadMore
          shown={items.length}
          total={total}
          label={<Lorem id={LOAD_MORE_COPY} kind="label" />}
          loading={cards.isFetchingNextPage}
          {...(cards.isFetchNextPageError ? { failed: <Lorem id={LOAD_MORE_FAILED_COPY} /> } : {})}
          onMore={() => void cards.fetchNextPage()}
        />
      )}
    </>
  );
}

function Ready({ home }: { home: Home }) {
  const { dashboard, tab } = home;

  if (dashboard.data === undefined) {
    return null;
  }

  return (
    <>
      <Overview totals={dashboard.data.totals} />
      {home.view === 'empty' ? (
        <DonorEmpty />
      ) : (
        <div className="donor-columns">
          <section className="donor-campaigns" aria-labelledby="my-campaigns">
            <div className="catalog-heading">
              <h2 id="my-campaigns">
                {MY_CAMPAIGNS}
                <span className="heading-dot" />
              </h2>
              <span className="donor-count">{supported(dashboard.data.totals.campaigns)}</span>
            </div>
            <DonorTabs value={tab} onChange={home.pick} />
            <Campaigns home={home} />
          </section>
          <DonorInsights dashboard={dashboard.data} />
        </div>
      )}
    </>
  );
}

function Body({ home }: { home: Home }) {
  switch (home.view) {
    case 'loading':
      return <DonorLoading />;
    case 'error':
      return <DonorFailed onRetry={home.retry} />;
    case 'wallet':
      return (
        <Banner tone="callout" action={TRY_AGAIN} onAction={home.retry}>
          {WALLET_WAIT}
        </Banner>
      );
    default:
      return <Ready home={home} />;
  }
}

export function Component() {
  const home = useHome();
  const { notify } = useToast();
  const [stale, setStale] = useStale();
  const cached = home.dashboard.data !== undefined && home.cards.data !== undefined;

  const refresh = async (): Promise<void> => {
    const results = await Promise.all([home.dashboard.refetch(), home.cards.refetch()]);

    if (results.every((result) => !result.isError)) {
      setStale(false);
      notify(REFRESHED);
    }
  };

  return (
    <div className="donor-layout">
      <div className="donor-main">
        <DonorHeading />
        {stale && cached && (
          <Banner icon="wifi" action={REFRESH} onAction={() => void refresh()}>
            {OFFLINE_SNAPSHOT}
          </Banner>
        )}
        <Body home={home} />
      </div>
    </div>
  );
}
