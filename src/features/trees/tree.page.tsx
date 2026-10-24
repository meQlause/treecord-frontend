// S05 (s05-tree.md): one tree, public. Signed in, the bearer token is sent and the answer adds `viewer` and, for permitted
// readers, the exact location. This page covers the read states; the D07 flag form is F4a (see `Flags`).
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useParams } from 'react-router';
import { useRef, useState } from 'react';
import { useSession } from '../../app/session/session';
import { ErrorState } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { WorkspaceMain } from '../../app/states/workspace-main';
import { ApiError } from '../../shared/api/errors';
import { TreeArt } from '../../shared/art/TreeArt';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useTree, type TreeDetail } from './tree.api';
import * as copy from './tree.copy';
import {
  Flags,
  Lifecycle,
  Payouts,
  Provenance,
  TreeRecord,
  Schedule,
  Timeline,
} from './tree.parts';
import { artKind, isLongRegion, isTreeId, thumbnailExpired } from './tree.rules';

const NOT_FOUND = new Set(['not_found', 'invalid_path']);

const isGone = (error: unknown): boolean => error instanceof ApiError && NOT_FOUND.has(error.code);

/** T-2: no campaign issues this id (the campaign hint of the mockup is dropped, FD-18). */
function NotFound({ id }: { id: string }) {
  return (
    <EmptyState variant="compact" title={copy.notFoundTitle(id)}>
      <p>{copy.NOT_FOUND_BODY}</p>
      <ArrowLink to="/campaigns">{copy.CAMPAIGNS}</ArrowLink>
    </EmptyState>
  );
}

type ViewProps = { data: TreeDetail; onThumbError: () => void };

function TreeView({ data, onThumbError }: ViewProps) {
  const session = useSession();
  const [now] = useState(Date.now);
  const { tree } = data;

  return (
    <>
      <PageHead
        className={`cb-batch-heading${isLongRegion(tree.campaign.region.name) ? ' tr-coord-long' : ''}`}
        eyebrow={copy.EYEBROW}
        title={copy.HEADING}
        em={`#${tree.treeId}`}
        inline
        art={<TreeArt kind={artKind(tree.status)} month={data.summary.currentMonth} />}
        coord={copy.coordinate(tree.treeId, tree.campaign.region.name)}
      />
      <div className="cb-detail tr-detail">
        <section>
          <Provenance data={data} />
          <Timeline events={data.timeline} onThumbError={onThumbError} />
          <Schedule milestones={data.milestones} signedIn={data.viewer !== null} />
          <Payouts data={data} />
          <Flags
            data={data}
            operator={session.phase === 'ready' && session.profile.role === 'operator'}
          />
        </section>
        <Rail>
          <Lifecycle data={data} />
          <TreeRecord data={data} now={now} />
        </Rail>
      </div>
    </>
  );
}

function TreePage({ treeId }: { treeId: string }) {
  const query = useTree(treeId);
  const refetched = useRef(false);

  // TL-9: a failed thumbnail older than its 15 minutes means the URL expired; read the tree once more
  const onThumbError = (): void => {
    if (!refetched.current && thumbnailExpired(query.dataUpdatedAt, Date.now())) {
      refetched.current = true;
      void query.refetch();
    }
  };

  if (!isTreeId(treeId) || isGone(query.error)) {
    return <NotFound id={treeId} />;
  }

  if (query.data !== undefined) {
    return <TreeView data={query.data} onThumbError={onThumbError} />;
  }

  return query.isError && !query.isFetching ? (
    <ErrorState onRetry={() => void query.refetch()} />
  ) : (
    <Skeleton shape="page" label={LOADING} />
  );
}

export function Component() {
  const { treeId = '' } = useParams();

  return (
    <WorkspaceMain>
      <TreePage treeId={treeId} />
    </WorkspaceMain>
  );
}
