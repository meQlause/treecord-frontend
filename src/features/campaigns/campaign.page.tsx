// S04 Campaign (s04-campaign.md), the read half: hero, facts, funding, budget, schedule, slots, the funding panel and
// the viewer's "Campaign actions" rows. Public: signed in, the bearer token is sent and the answer adds `viewer`.
// F2b/F4a: D04 Contribute, Start refund, D05 Claim refund and D06 Claim slots are not built yet (campaign.actions.tsx).
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useNavigate, useParams } from 'react-router';
import { ME_KEY } from '../../app/session/use-me';
import { useMotion } from '../../app/shell/motion-context';
import { useToast } from '../../app/shell/toast-context';
import { AppState } from '../../app/states/app-state';
import { ErrorState } from '../../app/states/states';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/art/Icon';
import { Grid } from '../../shared/ui/Grid';
import { Skeleton, useAfter } from '../../shared/ui/Skeleton';
import { CampaignActions } from './campaign.actions';
import { FundingPanel, useCountUp } from './campaign.funding';
import { BackLink, BudgetChart, FactStrip, Hero, MilestoneTrack, PlotGrid } from './campaign.parts';
import { DEFAULT_AMOUNT, signInPath } from './campaign.rules';
import { useCampaign, type CampaignDetail, type Viewer } from './campaigns.api';
import {
  BUDGET_TITLE,
  COPIED,
  COPY_BLOCKED,
  NOT_FOUND_BUTTON,
  NOT_FOUND_DOCUMENT,
  NOT_FOUND_TITLE,
  PLANTING_SUBTITLE,
  PLANTING_TITLE,
  SCHEDULE_KICKER,
  SCHEDULE_TITLE,
  UNTITLED_CAMPAIGN,
  budgetOf,
} from './campaigns.copy';
import { usdc } from './campaigns.rules';

const NOT_FOUND_CODES = new Set(['not_found', 'invalid_path']);
const NOT_FOUND_ICON = 48;
const TITLE_SUFFIX = ' · Treecord';

/** P-2: no such campaign (404) or a malformed address (400). */
function NotFound() {
  return (
    <div className="empty-state">
      <Icon name="tree" size={NOT_FOUND_ICON} />
      <h1>{NOT_FOUND_TITLE}</h1>
      <Link className="button primary" to="/campaigns">
        {NOT_FOUND_BUTTON}
        <Icon name="arrow" />
      </Link>
    </div>
  );
}

/** P-1: the back link at once, the hero-shaped block and the page skeleton after 300 ms. */
function Loading() {
  const shown = useAfter();

  return (
    <>
      <BackLink />
      {shown && <div className="detail-hero skeleton" aria-hidden="true" />}
      <Skeleton shape="page" />
    </>
  );
}

type SectionProps = { title: string; kicker: string; children: ReactNode };

function Section({ title, kicker, children }: SectionProps) {
  return (
    <section className="detail-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{kicker}</span>
      </div>
      {children}
    </section>
  );
}

type ReadyProps = {
  campaign: CampaignDetail;
  viewer: Viewer | null;
  onRetryWallet: () => void;
  onReread: () => Promise<{ campaign: CampaignDetail; viewer: Viewer | null } | undefined>;
};

function Ready({ campaign, viewer, onRetryWallet, onReread }: ReadyProps) {
  const { notify } = useToast();
  const navigate = useNavigate();
  const { still } = useMotion();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  // display only ("Closed" once passed): read once, the figures come from the API
  const [now] = useState(Date.now);
  const trees = useCountUp(BigInt(campaign.treeTarget), still);
  const scrollToActions = (): void =>
    document
      .getElementById('campaign-actions')
      ?.scrollIntoView({ behavior: still ? 'instant' : 'smooth', block: 'start' });
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(campaign.address);
      notify(COPIED);
    } catch {
      notify(COPY_BLOCKED, true);
    }
  };

  return (
    <>
      <BackLink />
      <Hero campaign={campaign} />
      <FactStrip campaign={campaign} trees={Number(trees)} />
      <Grid variant="rail">
        <div className="detail-content">
          <Section title={BUDGET_TITLE} kicker={budgetOf(usdc(campaign.fundingTarget))}>
            <BudgetChart budget={campaign.budget} />
          </Section>
          <Section title={SCHEDULE_TITLE} kicker={SCHEDULE_KICKER}>
            <MilestoneTrack schedule={campaign.incentiveSchedule} />
          </Section>
          <Section title={PLANTING_TITLE} kicker={PLANTING_SUBTITLE[campaign.status]}>
            <PlotGrid slots={campaign.slots} trees={campaign.treeTarget} />
          </Section>
          {viewer !== null && (
            <div id="campaign-actions">
              <CampaignActions
                campaign={campaign}
                viewer={viewer}
                amount={amount}
                onRetryWallet={onRetryWallet}
                onReread={onReread}
              />
            </div>
          )}
        </div>
        <FundingPanel
          campaign={campaign}
          viewer={viewer}
          amount={amount}
          still={still}
          now={now}
          onAmount={setAmount}
          onCta={
            viewer === null ? () => void navigate(signInPath(campaign.address)) : scrollToActions
          }
          onCopy={() => void copy()}
        />
      </Grid>
    </>
  );
}

type Query = ReturnType<typeof useCampaign>;

const isMissing = (error: unknown): boolean =>
  error instanceof ApiError && NOT_FOUND_CODES.has(error.code);

/** The document title follows what is on screen: the campaign's, or "Not found" (P-2, P-10). */
function useCampaignTitle({ data, error }: Query): void {
  const title = data === undefined ? undefined : (data.campaign.title ?? UNTITLED_CAMPAIGN);
  const missing = data === undefined && isMissing(error);

  useEffect(() => {
    if (title !== undefined || missing) {
      document.title = (title ?? NOT_FOUND_DOCUMENT) + TITLE_SUFFIX;
    }
  }, [title, missing]);
}

/** Which of P-1..P-3 or the page itself the read has reached. */
function Body({ query }: { query: Query }) {
  const queryClient = useQueryClient();
  const { data, error } = query;
  // "Try again" in the wallet line: the profile (the wallet may exist now) and the campaign are read again
  const retryWallet = (): void => {
    void queryClient.invalidateQueries({ queryKey: ME_KEY });
    void query.refetch();
  };

  if (data !== undefined) {
    return (
      <Ready
        campaign={data.campaign}
        viewer={data.viewer}
        onRetryWallet={retryWallet}
        onReread={async () => (await query.refetch()).data}
      />
    );
  }

  if (isMissing(error)) {
    return <NotFound />;
  }

  // offline with nothing cached waits for a network that is not there: the same failure state (C-17)
  if (query.isError || query.fetchStatus === 'paused') {
    return <ErrorState onRetry={() => void query.refetch()} />;
  }

  return <Loading />;
}

export function Component() {
  const { address = '' } = useParams();
  const query = useCampaign(address);

  useCampaignTitle(query);

  return (
    <AppState>
      <main className="main detail-main" id="main-content" tabIndex={-1}>
        <Body query={query} />
      </main>
    </AppState>
  );
}
