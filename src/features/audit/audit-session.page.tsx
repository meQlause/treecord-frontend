// S24 Audit session (s24-audit-session.md): the session's header, progress, frozen sample in position order, findings tally
// and record, and — while open — D13 Close session. The role gate (auditor) and the owner check (404) are the route's and
// the server's; a closed session is read-only (FR-200).
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useParams } from 'react-router';
import { useOnline } from '../../app/states/use-online';
import { LOADING } from '../../app/states/states.copy';
import { localDate } from '../../shared/format/datetime';
import { CatalogSection } from '../../shared/ui/CatalogSection';
import { Journey } from '../../shared/ui/Journey';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import { SampleArt } from './audit.art';
import { useAuditSession, type AuditSession } from './audit.api';
import { AuditError, SessionNotFound } from './audit.common';
import * as copy from './audit.copy';
import { isUuid, shortId, stepsOf } from './audit.rules';
import { CloseSession, SampleCard, SessionRail } from './session.parts';

function Frozen({ session }: { session: AuditSession }) {
  return (
    <CatalogSection
      title={copy.FROZEN_SAMPLE}
      kicker={copy.FROZEN_KICKER}
      meta={copy.treesMeta(session.sampleSize)}
      aside={<span className="newest-label">{copy.IN_SAMPLE_ORDER}</span>}
    >
      <div className="campaign-grid">
        {session.samples.map((sample, index) => (
          <SampleCard key={sample.treeId} session={session} sample={sample} index={index} />
        ))}
      </div>
    </CatalogSection>
  );
}

function Session({ session }: { session: AuditSession }) {
  const online = useOnline();
  const { steps, fill } = stepsOf(session, localDate);

  return (
    <>
      <PageHead
        eyebrow={copy.sessionEyebrow(session.status, session.campaign.title)}
        title={copy.sessionTitle(session.sampleSize)}
        em={copy.DRAWN_BY_A_BLOCK}
        art={
          <SampleArt
            population={session.population}
            samples={session.samples.map(({ treeId }) => treeId)}
            blockHash={session.seed.blockHash}
          />
        }
        coord={copy.sessionCoord(shortId(session.id))}
      />
      <div className="cb-detail pl-detail">
        <section>
          <Journey title={copy.PROGRESS} label={copy.PROGRESS_ARIA} steps={steps} fill={fill} />
          <Frozen session={session} />
          {session.status === 'open' && <CloseSession session={session} online={online} />}
        </section>
        <Rail>
          <SessionRail session={session} />
        </Rail>
      </div>
    </>
  );
}

export function Component() {
  const { sessionId = '' } = useParams();
  const query = useAuditSession(sessionId);

  if (!isUuid(sessionId)) {
    return <SessionNotFound />;
  }

  if (query.data !== undefined) {
    return <Session session={query.data} />;
  }

  return query.isError ? (
    <AuditError error={query.error} onRetry={() => void query.refetch()} />
  ) : (
    <Skeleton shape="page" label={LOADING} />
  );
}
