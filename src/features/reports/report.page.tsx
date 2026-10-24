// S06 (s06-report.md): the public, campaign-wide impact report. Read-only; the endpoints take no token. The page fetches
// the report and the later evidence pages and hands plain props to the parts.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useParams } from 'react-router';
import { useSession } from '../../app/session/session';
import { AppState } from '../../app/states/app-state';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/art/Icon';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { useAfter } from '../../shared/ui/Skeleton';
import { useEvidencePages, useReport, type Report } from './report.api';
import * as copy from './report.copy';
import { Funding, Health, Incentives, Overview, ReportHead, Snapshot } from './report.parts';
import { isAddress } from './report.rules';
import { Carbon, Evidence, Foot } from './report.sections';

const BACK_SIZE = 17;
const SKELETON_SECTIONS = [0, 1];
const NOT_FOUND = new Set(['not_found', 'invalid_path']);

const isGone = (error: unknown): boolean => error instanceof ApiError && NOT_FOUND.has(error.code);

function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link className="back-link" to={to}>
      <Icon name="back" size={BACK_SIZE} />
      {children}
    </Link>
  );
}

const section = (key: number) => (
  <div key={key} className="rp-section">
    <div className="skeleton title rp-skel-title" />
    <div className="skeleton rp-skel-block" />
  </div>
);

/** R-1: the loading line at once, the report's own shapes after 300 ms, so nothing jumps when it lands. */
function ReportLoading() {
  const shown = useAfter();

  return (
    <section className="rp-loading" role="status" aria-busy="true">
      <span className="eyebrow">{copy.LOADING}</span>
      {shown && (
        <div aria-hidden="true">
          <div className="page-heading rp-heading">
            <div>
              <div className="skeleton small" />
              <div className="skeleton title rp-skel-h1" />
              <div className="skeleton small" />
            </div>
            <div className="heading-art skeleton rp-skel-art" />
          </div>
          <div className="skeleton rp-skel-duo" />
          {section(SKELETON_SECTIONS.length)}
          <div className="rp-columns">{SKELETON_SECTIONS.map(section)}</div>
        </div>
      )}
    </section>
  );
}

function NotFound() {
  return (
    <>
      <BackLink to="/campaigns">{copy.ALL_CAMPAIGNS}</BackLink>
      <EmptyState
        level={1}
        icon="campaign"
        title={copy.NOT_FOUND_TITLE}
        description={copy.NOT_FOUND_BODY}
      />
    </>
  );
}

function ReadyReport({ report, address }: { report: Report; address: string }) {
  const session = useSession();
  const evidence = useEvidencePages(address, report.evidence.nextCursor);
  const pages = evidence.data?.pages ?? [];
  const last = pages.at(-1) ?? report.evidence;

  if (isGone(evidence.error)) {
    return <NotFound />;
  }

  const more = {
    hasMore: last.nextCursor !== null,
    total: last.total,
    loading: evidence.isFetchingNextPage,
    failed: evidence.isFetchNextPageError,
    onMore: () => {
      if (!evidence.isFetchingNextPage) {
        void evidence.fetchNextPage();
      }
    },
  };

  return (
    <>
      <BackLink to={`/campaigns/${report.campaign.address}`}>{copy.BACK_TO_CAMPAIGN}</BackLink>
      <ReportHead report={report} />
      <Snapshot generatedAt={report.generatedAt} />
      <Overview report={report} />
      <Health trees={report.trees} />
      <div className="rp-columns">
        <Funding report={report} />
        <Incentives incentives={report.incentives} />
      </div>
      <Carbon carbon={report.carbon} />
      <Evidence
        items={[...report.evidence.items, ...pages.flatMap((page) => page.items)]}
        signedIn={session.phase === 'ready'}
        more={more}
      />
      <Foot address={report.campaign.address} />
    </>
  );
}

function ReportBody({ address }: { address: string }) {
  const query = useReport(address);

  if (!isAddress(address) || isGone(query.error)) {
    return <NotFound />;
  }

  if (query.data !== undefined) {
    return <ReadyReport report={query.data} address={address} />;
  }

  return (
    <>
      <BackLink to={`/campaigns/${address}`}>{copy.BACK_TO_CAMPAIGN}</BackLink>
      {query.isError && !query.isFetching ? (
        <EmptyState tone="error" title={copy.UNAVAILABLE_TITLE} description={copy.UNAVAILABLE_BODY}>
          <Button icon="retry" onClick={() => void query.refetch()}>
            {copy.TRY_AGAIN}
          </Button>
        </EmptyState>
      ) : (
        <ReportLoading />
      )}
    </>
  );
}

export function Component() {
  const { address = '' } = useParams();

  return (
    <AppState>
      <main className="main report-main" id="main-content" tabIndex={-1}>
        <ReportBody address={address} />
      </main>
    </AppState>
  );
}
