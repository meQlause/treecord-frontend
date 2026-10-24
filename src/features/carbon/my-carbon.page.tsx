// S15 My carbon (s15-my-carbon.md): the signed-in wallet's carbon — three figures, then issued balances, reservations and
// retirements — with D09 (release the unfilled part of a reservation) and D10 (retire issued credits) as dialogs. Both are
// wallet transactions with no optimistic UI: figures and cards change only after the receipt and the indexer. It lives in
// the workspace frame, so the shell's offline callout wraps it and disables its controls.
import { AnimatePresence } from 'motion/react';
import { useState, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useSearchParams } from 'react-router';
import { useSession, type Profile } from '../../app/session/session';
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
import { ActionDialog, type Action } from './my-carbon.dialog';
import { LedgerArt } from './my-carbon.art';
import * as copy from './my-carbon.copy';
import { useHoldings, useMoreRetirements, type Holdings } from './holdings.api';
import {
  BalanceCard,
  EmptySection,
  Figures,
  ReservationCard,
  RetirementCard,
} from './my-carbon.parts';
import { countOf, parseTab, tabParam, type Tab } from './my-carbon.rules';

const [ISSUED, RESERVATIONS, RETIREMENTS] = copy.TABS;

type Query = ReturnType<typeof useHoldings>;

type CardsProps = {
  holdings: Holdings;
  online: boolean;
  open: (action: Action) => void;
};

const noneOf = (tab: Tab): ReactNode => (
  <EmptySection title={copy.EMPTY[tab][0]} text={copy.EMPTY[tab][1]} />
);

/** State 7: one card per issued balance, each with "Retire credits". */
function IssuedCards({ holdings, online, open }: CardsProps) {
  return holdings.balances.length === 0 ? (
    noneOf(ISSUED)
  ) : (
    <Grid>
      {holdings.balances.map((balance, index) => (
        <BalanceCard
          key={balance.batchId}
          balance={balance}
          index={index}
          online={online}
          onRetire={() => open({ kind: 'retire', balance })}
        />
      ))}
    </Grid>
  );
}

/** States 9-11: one card per reservation, each with "Decline unfilled share" while there is something to release. */
function ReservationCards({ holdings, online, open }: CardsProps) {
  return holdings.reservations.length === 0 ? (
    noneOf(RESERVATIONS)
  ) : (
    <Grid>
      {holdings.reservations.map((reservation, index) => (
        <ReservationCard
          key={reservation.campaign.address}
          reservation={reservation}
          index={index}
          online={online}
          onDecline={() => open({ kind: 'decline', reservation })}
        />
      ))}
    </Grid>
  );
}

type MoreProps = {
  shown: number;
  total: number;
  more: ReturnType<typeof useMoreRetirements>;
};

/** "Load more" (states 16-18): the next page, pending, or failed with the loaded cards kept. */
function MoreRow({ shown, total, more }: MoreProps) {
  return (
    <LoadMore
      shown={shown}
      total={total}
      label={<Lorem id={copy.LOAD_MORE_COPY} kind="label" />}
      loading={more.isFetchingNextPage}
      {...(more.isFetchNextPageError ? { failed: <Lorem id={copy.LOAD_MORE_FAILED_COPY} /> } : {})}
      onMore={() => void more.fetchNextPage()}
    />
  );
}

/** States 13-18: the retirements, newest first, with "load more" from the holdings' own cursor. */
function RetirementCards({ holdings }: CardsProps) {
  const more = useMoreRetirements(holdings.retirements.nextCursor);
  const loaded = more.data?.pages ?? [];
  const retirements = [...holdings.retirements.items, ...loaded.flatMap((page) => page.items)];
  const next =
    loaded.length === 0 ? holdings.retirements.nextCursor : (loaded.at(-1)?.nextCursor ?? null);

  if (retirements.length === 0) {
    return noneOf(RETIREMENTS);
  }

  return (
    <>
      <Grid>
        {retirements.map((retirement, index) => (
          <RetirementCard key={retirement.retirementId} retirement={retirement} index={index} />
        ))}
      </Grid>
      {next !== null && (
        <MoreRow shown={retirements.length} total={holdings.retirements.total} more={more} />
      )}
    </>
  );
}

const SECTION: Readonly<Record<Tab, (props: CardsProps) => ReactNode>> = {
  [ISSUED]: IssuedCards,
  [RESERVATIONS]: ReservationCards,
  [RETIREMENTS]: RetirementCards,
};

type ReadyProps = { holdings: Holdings; profile: Profile };

function Ready({ holdings, profile }: ReadyProps) {
  const [params, setParams] = useSearchParams();
  const [action, setAction] = useState<Action | null>(null);
  const online = useOnline();
  const tab = parseTab(params.get('tab'));
  const Section = SECTION[tab];
  const { summary } = holdings;

  return (
    <>
      <PageHead
        eyebrow={copy.EYEBROW}
        title={copy.LINE}
        em={copy.HEADING_EM}
        art={
          <LedgerArt
            issued={Number(summary.issuedAmount)}
            reserved={Number(summary.unfilledAmount)}
            retired={Number(summary.retiredAmount)}
          />
        }
        coord={copy.COORD}
      >
        <Figures summary={summary} />
      </PageHead>
      <CatalogSection
        title={copy.CATALOG_TITLE}
        kicker={copy.CATALOG_KICKER}
        filters={copy.TABS}
        filtersLabel={copy.TABS_LABEL}
        value={tab}
        onChange={(next) => {
          const param = tabParam(next as Tab);

          setParams(param === undefined ? {} : { tab: param }, { replace: true });
        }}
        meta={`${countOf(tab, holdings)} ${copy.NOUN[tab]}`}
        aside={<span className="newest-label">{copy.HINT[tab]}</span>}
      >
        <Section holdings={holdings} online={online} open={setAction} />
      </CatalogSection>
      <AnimatePresence>
        {action !== null && (
          <ActionDialog
            key={action.kind}
            action={action}
            profile={profile}
            onClose={() => setAction(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Why there are no holdings to show: the wallet is not ready (a short wait), or the read failed. */
function Failure({ query, walletMissing }: { query: Query; walletMissing: boolean }) {
  if (walletMissing) {
    return (
      <Banner tone="callout" action={copy.TRY_AGAIN} onAction={() => void query.refetch()}>
        {copy.WALLET_PENDING}
      </Banner>
    );
  }

  return (
    <EmptyState tone="error" title={copy.FAILED_TITLE}>
      <Button icon="retry" onClick={() => void query.refetch()}>
        {copy.TRY_AGAIN}
      </Button>
    </EmptyState>
  );
}

function MyCarbon({ profile }: { profile: Profile }) {
  const query = useHoldings();
  const walletMissing =
    profile.walletAddress === null ||
    (query.error instanceof ApiError && query.error.code === 'wallet_missing');

  if (query.data !== undefined && !walletMissing) {
    return <Ready holdings={query.data} profile={profile} />;
  }

  if (query.isError || walletMissing) {
    return (
      <>
        <PageHead eyebrow={copy.EYEBROW} title={copy.LINE} em={copy.HEADING_EM} />
        <Failure query={query} walletMissing={walletMissing} />
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow={copy.EYEBROW} title={copy.LINE} em={copy.HEADING_EM} />
      <Skeleton shape="cards" label={copy.LOADING} />
    </>
  );
}

export function Component() {
  const session = useSession();

  return session.phase === 'ready' ? <MyCarbon profile={session.profile} /> : null;
}
