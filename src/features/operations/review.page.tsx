// S28 Submission review (s28-review.md): one submission, read-only, with an approve or reject decision while it is
// `needs_review`. Reached by id (S27 "Known submission", S21). No video player, no override. No optimistic UI: the outcome
// line is drawn from the re-read submission, never from the request.
import { Fragment, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useParams } from 'react-router';
import { ErrorView, NotFoundState } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { useOnline } from '../../app/states/use-online';
import { Tag } from '../../shared/ui/Badge';
import { Facts, orDash } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { Panel } from '../../shared/ui/Panel';
import { Skeleton } from '../../shared/ui/Skeleton';
import { REASON_TEXT } from '../planter/planter.copy';
import { D14, JobCallout, fieldProblem, fieldText, useConfirm } from './operations.action';
import { post, useEvidence, type Evidence } from './operations.api';
import * as copy from './operations.copy';
import { useJsonDraft } from './operations.draft';
import { NOTE_LIMIT, isUuid, noteOk } from './operations.rules';

const SCORE_DIGITS = 2;
const score = (value: number | null | undefined): string =>
  value === null || value === undefined ? copy.DASH : value.toFixed(SCORE_DIGITS);

const tagState = (evidence: Evidence, tag: string): string => {
  if (evidence.ai?.scores === null || evidence.ai === null) {
    return copy.TAG_NOT_SCORED;
  }

  return evidence.ai.scores?.tagDecoded === tag ? copy.TAG_READ : copy.TAG_NOT_READ;
};

const tagLine = (evidence: Evidence): string => {
  const tag = evidence.payload?.tag ?? null;

  return tag === null ? copy.DASH : copy.tagLine(tag, tagState(evidence, tag));
};

const recaptureText = (scores: NonNullable<Evidence['ai']>['scores']): string =>
  scores === null
    ? copy.DASH
    : `${score(scores.recapture)} / ${score(scores.duplicate?.maxSimilarity)}`;

const treeText = (evidence: Evidence): string =>
  evidence.treeId === null ? copy.slotOf(evidence.slotId) : `#${evidence.treeId}`;

const policyScoreText = ({ policyScore }: Evidence): string =>
  policyScore === null ? copy.DASH : `${policyScore.toLocaleString('en-US')} / 10,000`;

const policyText = ({ policyDecision }: Evidence): string =>
  policyDecision?.replaceAll('_', ' ') ?? copy.NOT_SCORED;

function FactRows({ evidence }: { evidence: Evidence }) {
  const scores = evidence.ai?.scores ?? null;

  return (
    <Facts
      rows={[
        [copy.F_TREE, treeText(evidence)],
        [copy.F_KIND, copy.kindOf(evidence.kind, evidence.month)],
        [copy.F_POLICY, policyText(evidence)],
        [copy.F_SCORE, policyScoreText(evidence)],
        [copy.F_LIVENESS, score(scores?.liveness)],
        [copy.F_PRESENCE, score(scores?.treePresence)],
        [copy.F_RECAPTURE, recaptureText(scores)],
        [copy.F_GROWTH, score(scores?.growthConsistency)],
        [copy.F_TAG, tagLine(evidence)],
        [copy.F_MODEL, orDash(evidence.ai?.modelVersion)],
      ]}
    />
  );
}

/** `{code} · {copy}` per reason in stored order, joined by " — "; the operator's own reject has its placeholder. */
function Reasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) {
    return null;
  }

  return (
    <p className="ws-callout wrap-any">
      {reasons.map((reason, index) => (
        <Fragment key={reason}>
          {index > 0 && ' — '}
          {reason} ·{' '}
          {reason === 'operator_rejected' ? (
            <Lorem id={copy.OPERATOR_REJECTED_COPY} kind="label" />
          ) : (
            (REASON_TEXT[reason] ?? '')
          )}
        </Fragment>
      ))}
    </p>
  );
}

const cannotAttest = (error: { details?: unknown }): ReactNode => {
  const reasons = (error.details as { reasons?: string[] } | null | undefined)?.reasons ?? [];

  return (
    <>
      <Lorem id={copy.CANNOT_ATTEST_COPY} />{' '}
      {reasons.map((reason) => REASON_TEXT[reason] ?? reason).join(' · ')}
    </>
  );
};

const REVIEW_ERRORS = {
  validation_error: fieldProblem,
  not_in_review: { banner: copy.NOT_WAITING, refetch: true },
  cannot_attest: (error: { details?: unknown }) => ({
    banner: cannotAttest(error),
    blocking: true,
    approveOnly: true,
  }),
} as const;

function ReviewForm({ evidence, refetch }: { evidence: Evidence; refetch: () => void }) {
  const online = useOnline();
  const draft = useJsonDraft('s28', evidence.id, { decision: 'approve', note: '' });
  const action = useConfirm(REVIEW_ERRORS, refetch);
  const { decision, note } = draft.value;
  const approve = decision === 'approve';

  const write = async (): Promise<void> => {
    await post(`/operator/submissions/${evidence.id}/review`, { approve, note: note.trim() });
    draft.clear();
    refetch();
  };

  return (
    <>
      <Field label={copy.F_DECISION}>
        <select
          value={decision}
          onChange={(event) => draft.patch({ decision: event.target.value })}
        >
          <option value="approve">{copy.APPROVE_OPTION}</option>
          <option value="reject">{copy.REJECT_OPTION}</option>
        </select>
      </Field>
      <Field label={copy.F_NOTE} error={fieldText(action.problem, 'note')}>
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
        label={approve ? copy.APPROVE_REVIEW : copy.REJECT_REVIEW}
        summary={approve ? copy.APPROVE_SUMMARY : copy.REJECT_SUMMARY}
        disabled={!online || !noteOk(note)}
        problem={action.problem}
        approving={approve}
        onConfirm={() => action.confirm(write)}
      />
    </>
  );
}

function Review({ evidence, refetch }: { evidence: Evidence; refetch: () => void }) {
  const waiting = evidence.status === 'needs_review';
  const outcome = copy.OUTCOME[evidence.status] ?? copy.NOT_WAITING;
  const showJob = ['attested', 'failed'].includes(evidence.status) && evidence.jobId !== null;

  return (
    <Panel
      title={evidence.id}
      icon="check"
      aside={<Tag>{evidence.status.replaceAll('_', ' ')}</Tag>}
    >
      <FactRows evidence={evidence} />
      <Reasons reasons={evidence.rejectReasons} />
      <Link to={`/app/evidence/${evidence.id}`}>{copy.FULL_SUBMISSION}</Link>
      {waiting ? (
        <ReviewForm evidence={evidence} refetch={refetch} />
      ) : (
        <p className="wrap-any op-line">
          {outcome} {evidence.review?.note ?? ''}
        </p>
      )}
      {showJob && evidence.jobId !== null && (
        <JobCallout id={evidence.jobId} onConfirmed={refetch} />
      )}
    </Panel>
  );
}

export function Component() {
  const { id = '' } = useParams();
  const valid = isUuid(id);
  const query = useEvidence(id, valid);

  if (!valid) {
    return <NotFoundState title={copy.SUBMISSION_NOT_FOUND} />;
  }

  if (query.isError && query.data === undefined) {
    return (
      <ErrorView
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle={copy.SUBMISSION_NOT_FOUND}
      />
    );
  }

  if (query.data === undefined) {
    return <Skeleton shape="panel" label={LOADING} />;
  }

  return (
    <>
      <h1>{copy.REVIEW_HEADING}</h1>
      <Review evidence={query.data} refetch={() => void query.refetch()} />
    </>
  );
}
