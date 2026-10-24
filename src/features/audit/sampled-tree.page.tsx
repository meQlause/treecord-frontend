// S25 Sampled tree (s25-sampled-tree.md): one sampled tree's full evidence (every load is logged by the server, so the bundle
// is read once per visit), D11 Record finding and D12 Issue challenge. A closed session stays readable and refuses every
// mutation. The role gate (auditor) is the route's; the owner check is the server's (404).
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useParams } from 'react-router';
import { ErrorView } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { useOnline } from '../../app/states/use-online';
import { TreeArt } from '../../shared/art/TreeArt';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import type { TreeStatus } from '../trees/tree.api';
import { artKind } from '../trees/tree.rules';
import { useAuditSession, useTreeBundle, type TreeBundle } from './audit.api';
import { AuditError, SessionNotFound } from './audit.common';
import * as copy from './audit.copy';
import { isTreeNumber, isUuid, shortId } from './audit.rules';
import {
  EvidenceBundle,
  FindingSection,
  IntegrityChecks,
  ProveItNow,
  TreeStock,
} from './sampled.parts';

function NotInSample() {
  return <EmptyState variant="compact" title={copy.TREE_NOT_IN_SAMPLE} />;
}

function Bundle({ bundle, sessionId }: { bundle: TreeBundle; sessionId: string }) {
  const online = useOnline();
  const treeId = bundle.tree.treeId;
  const ids = { sessionId, treeId, bundle, online };

  return (
    <>
      <PageHead
        eyebrow={copy.treeEyebrow(bundle.sample.position, bundle.sample.sampleSize)}
        title={copy.treeHeading(treeId)}
        em={copy.UNDER_REVIEW}
        art={
          <TreeArt kind={artKind(bundle.tree.status as TreeStatus)} month={bundle.progress.month} />
        }
        coord={copy.sessionCoord(shortId(bundle.sessionId))}
      />
      <div className="cb-detail pl-detail">
        <section>
          <EvidenceBundle submissions={bundle.submissions} />
          <IntegrityChecks submissions={bundle.submissions} />
          <FindingSection {...ids} />
        </section>
        <Rail>
          <TreeStock bundle={bundle} />
          <ProveItNow {...ids} />
        </Rail>
      </div>
    </>
  );
}

function Tree({
  sessionId,
  treeId,
  member,
}: {
  sessionId: string;
  treeId: string;
  member: boolean;
}) {
  const query = useTreeBundle(sessionId, treeId, member);

  if (query.data !== undefined) {
    return <Bundle bundle={query.data} sessionId={sessionId} />;
  }

  return query.isError ? (
    <ErrorView
      error={query.error}
      onRetry={() => void query.refetch()}
      notFoundTitle={copy.TREE_NOT_IN_SAMPLE}
    />
  ) : (
    <Skeleton shape="page" label={LOADING} />
  );
}

export function Component() {
  const { sessionId = '', treeId = '' } = useParams();
  const session = useAuditSession(sessionId);

  if (!isUuid(sessionId)) {
    return <SessionNotFound />;
  }

  if (session.data === undefined) {
    return session.isError ? (
      <AuditError error={session.error} onRetry={() => void session.refetch()} />
    ) : (
      <Skeleton shape="page" label={LOADING} />
    );
  }

  // not in the sample: no bundle request at all (no 404, no access-log row, FR-189 acc. 2)
  const member =
    isTreeNumber(treeId) && session.data.samples.some((sample) => sample.treeId === treeId);

  return member ? <Tree sessionId={sessionId} treeId={treeId} member /> : <NotInSample />;
}
