// S25's pieces (s25-sampled-tree.md §1): the evidence bundle, the recomputed integrity checks, D11 Record finding, and the
// rail with D12 Issue challenge. A finding or a challenge shows only what the server answered (no optimistic UI).
import { useQueryClient } from '@tanstack/react-query';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { useToast } from '../../app/shell/toast-context';
import { useAccountKey } from '../../app/session/use-account-key';
import { ApiError } from '../../shared/api/errors';
import { CodeCardArt } from '../../shared/art/CodeCardArt';
import { Icon } from '../../shared/art/Icon';
import { localDate } from '../../shared/format/datetime';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Facts } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { ReviewAction } from '../../shared/ui/ReviewAction';
import { StockCard } from '../../shared/ui/StockCard';
import type { Evidence } from '../planter/evidence.api';
import { Say } from '../planter/evidence.parts';
import { checkLabel, detailOf, markOf } from '../planter/evidence.rules';
import { label as statusLabel } from '../trees/tree.rules';
import { RailPanel, useAuditDraft } from './audit.common';
import {
  refetchBundle,
  refreshSession,
  useIssueChallenge,
  useSaveFinding,
  type Finding,
  type Submission,
  type TreeBundle,
} from './audit.api';
import * as copy from './audit.copy';
import {
  challengeLabel,
  hasIntegrity,
  milestonesShare,
  notesOf,
  scoreText,
  submissionLine,
  submissionMonth,
  submissionTone,
} from './audit.rules';

const ARROW_ICON = 15;
const NOTES_MAX = 5000;
const FINDINGS = ['ok', 'issue', 'needs_followup'] as const;

// ---- evidence bundle ----

function SubmissionRow({ submission }: { submission: Submission }) {
  const decision = submission.policy?.decision ?? 'none';

  return (
    <Link className="au-sub" to={`/app/evidence/${submission.id}`}>
      <span className={`au-sub-score ${decision}`}>{scoreText(submission)}</span>
      <span className="au-sub-body">
        <strong>
          {copy.submissionLabel(submission.kind, submissionMonth(submission.milestone))}
        </strong>
        <small>
          {submission.id} · {submissionLine(submission)}
        </small>
      </span>
      <span className={`badge ${submissionTone(submission.status)}`}>
        <span />
        {submission.status.replaceAll('_', ' ')}
      </span>
      <span className="arrow-circle">
        <Icon name="arrow" size={ARROW_ICON} />
      </span>
    </Link>
  );
}

export function EvidenceBundle({ submissions }: { submissions: Submission[] }) {
  return (
    <section className="cb-record">
      <h3>{copy.EVIDENCE_BUNDLE}</h3>
      {submissions.length === 0 ? (
        <EmptyState variant="compact" title={copy.NO_SUBMISSIONS}>
          <p>{copy.NO_SUBMISSIONS_BODY}</p>
        </EmptyState>
      ) : (
        <div className="au-subs">
          {submissions.map((submission) => (
            <SubmissionRow key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---- integrity checks ----

type Check = { key: string; ok: boolean | null; label: copy.Words; detail: ReactNode };

const stubOf = (submission: Submission): Evidence =>
  // only what `checkLabel` reads (kind, month, region, challenge); the bundle carries no more
  ({
    kind: submission.kind,
    month: submissionMonth(submission.milestone),
    campaign: { address: '' },
    challenge: null,
    payload: null,
  }) as unknown as Evidence;

/** A recomputed value: `true` ✓, `false` ✕, `null` "—" with COPY-305; never a pass by default (FR-195). */
const recomputed = (
  key: string,
  value: boolean | null,
  label: copy.Words,
  detail: ReactNode,
): Check => ({
  key,
  ok: value,
  label,
  detail: value === null ? <Lorem id={copy.NOT_CHECKED_COPY} kind="label" /> : detail,
});

const verificationChecks = (submission: Submission): Check[] => {
  const { verification: result, device } = submission;

  if (result === null) {
    return [];
  }

  const revoked =
    device === null || device.revokedAt === null ? null : (
      <>
        <Lorem id={copy.REVOKED_COPY} kind="label" /> {localDate(device.revokedAt)}
      </>
    );

  return [
    recomputed('v-signature', result.signatureValid, copy.SIGNATURE_LABEL, revoked),
    recomputed(
      'v-canonical',
      result.canonicalMatchesPayload,
      { copyId: copy.CANONICAL_COPY },
      null,
    ),
    recomputed('v-evidence', result.evidenceHashMatches, { copyId: copy.EVIDENCE_HASH_COPY }, null),
    recomputed(
      'v-video',
      result.videoHashMatches,
      copy.VIDEO_LABEL,
      result.videoHashMatches === false ? result.recomputedSha256 : null,
    ),
  ];
};

const checksOf = (submission: Submission): Check[] => [
  ...submission.precheckResults.map((row) => ({
    key: `p-${row.check}`,
    ok: row.ok,
    label: checkLabel(row, stubOf(submission)),
    detail: detailOf(row),
  })),
  ...verificationChecks(submission),
];

function CheckList({ submission }: { submission: Submission }) {
  return (
    <div className="au-checks">
      <small>{submission.id}</small>
      <ul className="ev-checks">
        {checksOf(submission).map(({ key, ok, label, detail }) => (
          <li key={key} className={ok === false ? 'bad' : 'ok'}>
            <span>{markOf(ok)}</span>
            <div>
              <strong>
                <Say words={label} />
              </strong>
              <small>{detail}</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntegrityChecks({ submissions }: { submissions: Submission[] }) {
  const checked = submissions.filter(hasIntegrity);

  return (
    <section className="cb-record">
      <h3>{copy.INTEGRITY_CHECKS}</h3>
      <div className="cb-cert">
        {checked.length === 0 ? (
          <p className="pl-lead">{copy.INTEGRITY_EMPTY}</p>
        ) : (
          checked.map((submission) => <CheckList key={submission.id} submission={submission} />)
        )}
      </div>
    </section>
  );
}

// ---- D11 ----

type Ids = { sessionId: string; treeId: string };

type FindingProps = Ids & { bundle: TreeBundle; online: boolean };

type Problem = { field?: ReactNode; banner?: ReactNode };

function Choices({
  value,
  disabled,
  onChange,
}: {
  value: Finding;
  disabled: boolean;
  onChange: (next: Finding) => void;
}) {
  // the arrows move within the group (a radio group's own keyboard)
  const move = (event: KeyboardEvent): void => {
    const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;

    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      onChange(
        FINDINGS[(FINDINGS.indexOf(value) + step + FINDINGS.length) % FINDINGS.length] ?? value,
      );
    }
  };

  return (
    <div
      className="au-choice"
      role="radiogroup"
      tabIndex={-1}
      aria-label={copy.FINDING_SECTION}
      onKeyDown={move}
    >
      {FINDINGS.map((name) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === name}
          className={value === name ? 'selected' : ''}
          disabled={disabled}
          onClick={() => onChange(name)}
        >
          {copy.FINDING_LABEL[name]}
        </button>
      ))}
    </div>
  );
}

function FindingForm({ sessionId, treeId, bundle, online }: FindingProps) {
  const client = useQueryClient();
  const { key } = useAccountKey();
  const { notify } = useToast();
  const save = useSaveFinding(sessionId, treeId);
  const draft = useAuditDraft(`${sessionId}:notes:${treeId}`);
  const [finding, setFinding] = useState<Finding>(bundle.sample.finding ?? 'ok');
  const [typed, setTyped] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem>({});
  const notes = typed ?? (draft.text === '' ? (bundle.sample.notes ?? '') : draft.text);

  const submit = async (): Promise<void> => {
    setProblem({});

    try {
      await save.mutateAsync({ treeId, finding, notes: notesOf(notes) });
      draft.clear();
      notify(copy.FINDING_SAVED);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';

      setProblem(
        code === 'validation_error'
          ? { field: <Lorem id={copy.COPY_VALIDATION} /> }
          : { banner: code === 'session_closed' ? copy.SESSION_CLOSED : copy.UNAVAILABLE },
      );

      if (code === 'session_closed') {
        refetchBundle(client, key, sessionId, treeId);
        refreshSession(client, key, sessionId);
      }
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {problem.banner !== undefined && <Banner tone="error">{problem.banner}</Banner>}
      <Choices value={finding} disabled={save.isPending} onChange={setFinding} />
      <Field label={copy.NOTES_LABEL} hint={copy.PRIVATE_HINT} error={problem.field}>
        <textarea
          maxLength={NOTES_MAX}
          readOnly={save.isPending}
          value={notes}
          onChange={(event) => {
            setTyped(event.target.value);
            draft.set(event.target.value);
          }}
        />
      </Field>
      <Button type="submit" icon="check" busy={save.isPending} disabled={!online}>
        {copy.SAVE_FINDING}
      </Button>
    </form>
  );
}

export function FindingSection(props: FindingProps) {
  const { bundle } = props;
  const { finding, notes } = bundle.sample;

  return (
    <section className="cb-record">
      <h3>{copy.FINDING_SECTION}</h3>
      <div className="cb-cert">
        {bundle.sessionStatus === 'closed' ? (
          <dl>
            {(
              [
                [copy.FINDING_SECTION, finding === null ? copy.DASH : copy.FINDING_LABEL[finding]],
                [copy.NOTES_FACT, notes ?? copy.NONE],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <i aria-hidden="true" />
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <FindingForm {...props} />
        )}
      </div>
    </section>
  );
}

// ---- rail: the tree and D12 ----

export function TreeStock({ bundle }: { bundle: TreeBundle }) {
  const { tree, progress, sample } = bundle;

  return (
    <StockCard
      label={copy.treeNumber(tree.treeId)}
      icon="tree"
      caption={copy.treeCaption}
      value={statusLabel(tree.status)}
      unit=""
      sub={{ label: copy.MILESTONES_PAID, value: `${progress.milestonesPaid}/6`, unit: '' }}
      share={milestonesShare(progress.milestonesPaid)}
      shareLabel={copy.GROWTH}
      shareNote={copy.monthOf(progress.month)}
      note={
        sample.finding === null
          ? copy.NO_FINDING_RECORDED
          : copy.yourFinding(copy.FINDING_LABEL[sample.finding])
      }
    />
  );
}

type ChallengeProps = Ids & { bundle: TreeBundle; online: boolean };

const eyebrowOf = (bundle: TreeBundle): string => {
  if (bundle.openChallenge !== null) {
    return copy.EYEBROW_OPEN_CHALLENGE;
  }

  return bundle.challenge === null
    ? copy.EYEBROW_NO_CHALLENGE
    : challengeLabel(bundle.challenge).toUpperCase();
};

function ChallengeFacts({ bundle }: { bundle: TreeBundle }) {
  const { challenge } = bundle;

  if (challenge === null) {
    return null;
  }

  const status: ReactNode =
    challenge.fulfilledSubmissionId === null ? (
      challengeLabel(challenge)
    ) : (
      <Link to={`/app/evidence/${challenge.fulfilledSubmissionId}`}>
        {copy.answeredBy(challenge.fulfilledSubmissionId)}
      </Link>
    );

  return (
    <Facts
      rows={[
        [copy.F_ISSUED, localDate(challenge.issuedAt)],
        [copy.F_EXPIRES, localDate(challenge.expiresAt)],
        [copy.F_STATUS, status],
      ]}
    />
  );
}

type Issue = { refused: string | null; failed: boolean; confirm: () => Promise<boolean> };

/** The D12 request: a refusal is a sentence in the panel and the panel re-reads the truth; anything else is "try again". */
function useIssue(sessionId: string, treeId: string): Issue {
  const client = useQueryClient();
  const { key } = useAccountKey();
  const { notify } = useToast();
  const issue = useIssueChallenge(sessionId, treeId);
  const [refused, setRefused] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const confirm = async (): Promise<boolean> => {
    setRefused(null);
    setFailed(false);

    try {
      await issue.mutateAsync();
      notify(copy.CHALLENGE_ISSUED);

      return true;
    } catch (error) {
      const text = error instanceof ApiError ? copy.CHALLENGE_ERRORS[error.code] : undefined;

      setRefused(text ?? null);
      setFailed(text === undefined);

      if (text !== undefined) {
        refetchBundle(client, key, sessionId, treeId);
        refreshSession(client, key, sessionId);
      }

      return false;
    }
  };

  return { refused, failed, confirm };
}

function IssueAction({
  bundle,
  online,
  issue,
}: {
  bundle: TreeBundle;
  online: boolean;
  issue: Issue;
}) {
  const blocked =
    bundle.sessionStatus === 'closed' ||
    bundle.tree.status !== 'alive' ||
    issue.refused !== null ||
    !online;

  return (
    <ReviewAction
      label={copy.ISSUE_CHALLENGE}
      disabled={blocked}
      ready={issue.refused === null}
      copy={copy.CHALLENGE_REVIEW}
      {...(issue.failed ? { error: copy.UNAVAILABLE } : {})}
      onConfirm={issue.confirm}
    />
  );
}

function IssuedCode({ code }: { code: string | null }) {
  return code === null ? null : (
    <div className="au-code">
      <CodeCardArt code={code} caption={copy.CODE_CAPTION} />
    </div>
  );
}

/** D12: issue a code for a sampled Alive tree; a refusal is an alert here, never a toast, and the panel re-reads the truth. */
export function ProveItNow({ sessionId, treeId, bundle, online }: ChallengeProps) {
  const issue = useIssue(sessionId, treeId);
  const open = bundle.openChallenge;
  const code = open?.code ?? bundle.challenge?.code ?? null;

  return (
    <RailPanel
      title={copy.PROVE_IT_NOW}
      icon="flag"
      eyebrow={eyebrowOf(bundle)}
      note={open === null ? copy.ALIVE_ONLY : copy.mustShow(open.code)}
      noteIcon="clock"
    >
      {issue.refused !== null && <Banner tone="error">{issue.refused}</Banner>}
      <IssuedCode code={code} />
      <ChallengeFacts bundle={bundle} />
      {open === null && <IssueAction bundle={bundle} online={online} issue={issue} />}
    </RailPanel>
  );
}
