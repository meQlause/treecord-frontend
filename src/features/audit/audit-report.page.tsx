// S26 Closed audit report (s26-audit-report.md): the stored report of a closed session exactly as the server froze it — public
// findings, totals, challenges and seed inputs, plus the owner's private notes and summary — with the full hash to copy and a
// link to the public reproduction. Never rebuilt in the browser (FR-201). The role gate (auditor) is the route's.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useParams } from 'react-router';
import { LOADING } from '../../app/states/states.copy';
import { KeyArt } from '../../shared/art/KeyArt';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useReport, type Report } from './audit.api';
import { AuditError, SessionNotFound } from './audit.common';
import * as copy from './audit.copy';
import { isUuid, shortId } from './audit.rules';
import {
  ChallengesSection,
  FindingsSection,
  ReportRail,
  SeedInputs,
  type Closed,
} from './report.parts';

const isClosed = (data: Report): data is Closed =>
  data.status === 'closed' && data.report !== null && data.reportHash !== null;

function Ready({ data }: { data: Closed }) {
  return (
    <>
      <PageHead
        eyebrow={copy.reportEyebrow(data.campaign.title)}
        title={copy.REPORT_TITLE}
        em={copy.REPORT_EM}
        art={<KeyArt />}
        coord={copy.reportCoord(shortId(data.sessionId))}
      >
        <p className="pl-status">
          {data.notes === null || data.notes.summary === '' ? copy.NO_SUMMARY : data.notes.summary}
        </p>
      </PageHead>
      <div className="cb-detail pl-detail">
        <section>
          <FindingsSection data={data} />
          <ChallengesSection data={data} />
          <SeedInputs data={data} />
        </section>
        <Rail>
          <ReportRail data={data} />
        </Rail>
      </div>
    </>
  );
}

export function Component() {
  const { sessionId = '' } = useParams();
  const query = useReport(sessionId);

  if (!isUuid(sessionId)) {
    return <SessionNotFound />;
  }

  if (query.data === undefined) {
    return query.isError ? (
      <AuditError error={query.error} onRetry={() => void query.refetch()} />
    ) : (
      <Skeleton shape="page" label={LOADING} />
    );
  }

  // an open session answers 200 with no report: a state of its own, not an error (FR-189 acc. 1)
  return isClosed(query.data) ? (
    <Ready data={query.data} />
  ) : (
    <EmptyState variant="compact" title={copy.REPORT_NOT_CLOSED}>
      <ArrowLink to={`/app/audit/${sessionId}`}>{copy.COMPLETE_AND_CLOSE}</ArrowLink>
    </EmptyState>
  );
}
