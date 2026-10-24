// S29 Resolve tree flag (s29-resolve-flag.md): one open flag — the facts to decide on, then uphold (tree Removed) or dismiss
// (previous status restored). The flag changes only when `FlagResolved` is indexed (ADR-015): after a 202 the screen says
// "Resolution pending", never the outcome. The confirm step is D14; no Idempotency-Key (the server keys `resolve_flag:<id>`).
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useParams } from 'react-router';
import { ErrorView, NotFoundState } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { useOnline } from '../../app/states/use-online';
import { localDate } from '../../shared/format/datetime';
import { shortAddress } from '../../shared/format/address';
import { Tag } from '../../shared/ui/Badge';
import { Facts } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { JobLink } from '../../shared/ui/JobLink';
import { Lorem } from '../../shared/ui/Lorem';
import { Panel } from '../../shared/ui/Panel';
import { Skeleton } from '../../shared/ui/Skeleton';
import { D14, fieldProblem, fieldText, useConfirm } from './operations.action';
import { post, useFlagRead, type FlagRead } from './operations.api';
import * as copy from './operations.copy';
import { useJsonDraft } from './operations.draft';
import { NOTE_LIMIT, isTreeId, isUuid, resolutionOk } from './operations.rules';

const capital = (text: string | null): string =>
  text === null ? copy.DASH : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const hashLine = (flag: FlagRead['flag']): string =>
  [flag.reasonHash, flag.flaggerAddress]
    .map((part) => (part === null ? copy.DASH : shortAddress(part)))
    .join(' / ');

function FlagFacts({ read }: { read: FlagRead }) {
  const { flag, tree } = read;

  return (
    <Facts
      rows={[
        [copy.F_CAMPAIGN, tree.campaign.title],
        [copy.F_REASON, flag.reasonText],
        [copy.F_OPENED, flag.openedAt === null ? copy.DASH : localDate(flag.openedAt)],
        [copy.F_HASH, hashLine(flag)],
        [copy.F_PREVIOUS, capital(flag.previousStatus)],
        [copy.F_CLOCK, tree.status === 'flagged' ? copy.PAUSED : copy.SEE_TREE],
      ]}
    />
  );
}

const RESOLVE_ERRORS = {
  validation_error: fieldProblem,
  flag_resolution_pending: { banner: copy.PENDING_LINE, refetch: true },
  flag_not_open: { banner: <Lorem id={copy.FLAG_NOT_OPEN_COPY} />, refetch: true },
} as const;

function ResolveForm({ read, refetch }: { read: FlagRead; refetch: () => void }) {
  const online = useOnline();
  const draft = useJsonDraft('s29', read.flag.id, { decision: 'dismiss', note: '' });
  const action = useConfirm(RESOLVE_ERRORS, refetch);
  const { decision, note } = draft.value;
  const uphold = decision === 'uphold';
  const failed = read.resolutionJob?.status === 'failed' ? read.resolutionJob : null;

  const write = async (): Promise<void> => {
    await post(`/operator/flags/${read.flag.id}/resolve`, { uphold, note: note.trim() });
    draft.clear();
    refetch();
  };

  return (
    <>
      {failed !== null && <Facts rows={[['Last error', failed.lastError ?? copy.NONE]]} />}
      <Field label={copy.F_DECISION}>
        <select
          value={decision}
          onChange={(event) => draft.patch({ decision: event.target.value })}
        >
          <option value="dismiss">{copy.DISMISS_OPTION}</option>
          <option value="uphold">{copy.UPHOLD_OPTION}</option>
        </select>
      </Field>
      <Field label={copy.F_RESOLUTION} error={fieldText(action.problem, 'note')}>
        <textarea
          maxLength={NOTE_LIMIT}
          value={note}
          onChange={(event) => {
            draft.patch({ note: event.target.value });
            action.clear();
          }}
        />
      </Field>
      <D14
        label={copy.RESOLVE}
        summary={uphold ? copy.UPHOLD_SUMMARY : copy.DISMISS_SUMMARY}
        {...(uphold ? { target: [[copy.F_TREE, `#${read.flag.treeId}`]] } : {})}
        disabled={!online || !resolutionOk(note)}
        problem={action.problem}
        onConfirm={() => action.confirm(write)}
      />
    </>
  );
}

type View = 'resolved' | 'notOnChain' | 'pending' | 'form';

/** The §3 state of the flag: which of the four bodies the panel shows. */
const viewOf = ({ flag, resolutionJob }: FlagRead): View => {
  if (flag.status === 'upheld' || flag.status === 'dismissed') {
    return 'resolved';
  }

  if (flag.status === 'pending') {
    return 'notOnChain';
  }

  return resolutionJob !== null && resolutionJob.status !== 'failed' ? 'pending' : 'form';
};

type BodyProps = { read: FlagRead; refetch: () => void };

const BODIES: Readonly<Record<View, (props: BodyProps) => ReactNode>> = {
  resolved: ({ read }) => (
    <p className="wrap-any op-line">{copy.resolvedLine(read.flag.resolutionNote ?? '')}</p>
  ),
  notOnChain: () => (
    <p className="op-line">
      <Lorem id={copy.NOT_ON_CHAIN_COPY} />
    </p>
  ),
  pending: ({ read }) => (
    <>
      <p className="op-line">{copy.PENDING_LINE}</p>
      {read.resolutionJob !== null && (
        <JobLink id={read.resolutionJob.id}>{copy.TRACK_JOB}</JobLink>
      )}
    </>
  ),
  form: ({ read, refetch }) => <ResolveForm read={read} refetch={refetch} />,
};

function Flag({ read, refetch }: BodyProps) {
  const { flag } = read;
  const Body = BODIES[viewOf(read)];
  const resolved = viewOf(read) === 'resolved' || flag.status === 'pending';

  return (
    <Panel title={copy.flagTitle(flag.treeId, flag.id)} icon="flag">
      <Tag>{resolved ? flag.status : 'Open'}</Tag>
      <FlagFacts read={read} />
      <Link to={`/trees/${flag.treeId}`}>{copy.TREE_HISTORY}</Link>
      <Body read={read} refetch={refetch} />
    </Panel>
  );
}

export function Component() {
  const { treeId = '', flagId = '' } = useParams();
  const valid = isTreeId(treeId) && isUuid(flagId);
  const query = useFlagRead(treeId, flagId, valid);

  if (!valid) {
    return <NotFoundState title={copy.FLAG_NOT_FOUND} />;
  }

  if (query.isError && query.data === undefined) {
    return (
      <ErrorView
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle={copy.FLAG_NOT_FOUND}
      />
    );
  }

  if (query.data === undefined) {
    return <Skeleton shape="panel" label={LOADING} />;
  }

  return (
    <>
      <h1>{copy.RESOLVE_HEADING}</h1>
      <Flag read={query.data} refetch={() => void query.refetch()} />
    </>
  );
}
