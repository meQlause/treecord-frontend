// S18 Challenges (s18-challenges.md): the open audit challenges on the planter's trees as tickets — the code as text and as
// a QR, the days left, how to answer, and whether it can be answered now. The server decides openness and order; the page
// shows the first reason a challenge cannot be answered. It lives in the workspace frame.
import { useQueryClient } from '@tanstack/react-query';
import { ErrorView } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { ApiError } from '../../shared/api/errors';
import { Banner } from '../../shared/ui/Banner';
import { CatalogSection } from '../../shared/ui/CatalogSection';
import { EmptyState } from '../../shared/ui/EmptyState';
import { LoadMore } from '../../shared/ui/LoadMore';
import { Lorem } from '../../shared/ui/Lorem';
import { PageHead } from '../../shared/ui/PageHead';
import { Skeleton } from '../../shared/ui/Skeleton';
import { ChallengeTicket } from './challenges.parts';
import { CodeArt } from './challenges.art';
import { usePlanterChallenges } from './planter.api';
import {
  CHALLENGES_CATALOG,
  CHALLENGES_COORD,
  CHALLENGES_EM,
  CHALLENGES_EYEBROW,
  CHALLENGES_KICKER,
  CHALLENGES_LINE,
  LOAD_MORE_COPY,
  LOAD_MORE_FAILED_COPY,
  NO_CHALLENGES,
  NO_CHALLENGES_BODY,
  TRY_AGAIN,
  WALLET_WAIT,
  answerableNote,
  openCount,
} from './planter.copy';
import { flattenChallenges } from './planter.rules';
import { useNow } from './use-now';

// COPY-200 and COPY-201 name the list by the word this page already uses for it
const NOUN = 'challenges';

function Failure({ error, retry }: { error: unknown; retry: () => void }) {
  if (error instanceof ApiError && error.code === 'wallet_missing') {
    return (
      <Banner tone="callout" action={TRY_AGAIN} onAction={retry}>
        {WALLET_WAIT}
      </Banner>
    );
  }

  return <ErrorView error={error} onRetry={retry} />;
}

export function Component() {
  const query = usePlanterChallenges();
  const queryClient = useQueryClient();
  const now = useNow();
  const { items, total, answerable } = flattenChallenges(query.data?.pages);
  const head = (
    <PageHead
      className="pl-heading"
      eyebrow={CHALLENGES_EYEBROW}
      title={CHALLENGES_LINE}
      em={CHALLENGES_EM}
      art={<CodeArt />}
      coord={CHALLENGES_COORD}
    />
  );

  if (query.isError && query.data === undefined) {
    // "Try again" repeats only the read: a refused wallet re-reads the list, any other failure drops the stale one
    const retry = (): void =>
      void queryClient.invalidateQueries({ queryKey: ['planter', 'challenges'] });

    return (
      <>
        {head}
        <Failure error={query.error} retry={retry} />
      </>
    );
  }

  if (query.data === undefined) {
    return <Skeleton shape="list" label={LOADING} />;
  }

  return (
    <>
      {head}
      <CatalogSection
        className="pl-catalog"
        title={CHALLENGES_CATALOG}
        kicker={CHALLENGES_KICKER}
        meta={openCount(total)}
        aside={<span className="newest-label">{answerableNote(answerable)}</span>}
      >
        {items.length === 0 ? (
          <EmptyState variant="compact" icon="leaf" title={NO_CHALLENGES}>
            <p>{NO_CHALLENGES_BODY}</p>
          </EmptyState>
        ) : (
          <div className="pl-tickets">
            {items.map((challenge, index) => (
              <ChallengeTicket key={challenge.id} challenge={challenge} now={now} index={index} />
            ))}
          </div>
        )}
        {query.hasNextPage && (
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
        )}
      </CatalogSection>
    </>
  );
}
