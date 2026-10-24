// D06 Claim slots (s04-campaign.md §3.7): a planter queues a gasless claim job (FR-050, FR-051). The count and the
// Idempotency-Key are kept in the draft before the request goes out, so a retry or a re-armed failed job sends the same key.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../../app/session/api';
import { config } from '../../app/session/config';
import { useSession, type Profile } from '../../app/session/session';
import { ApiError } from '../../shared/api/errors';
import { idempotencyKey } from '../../shared/api/client';
import { Banner } from '../../shared/ui/Banner';
import { Facts } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { JobLink } from '../../shared/ui/JobLink';
import { Lorem } from '../../shared/ui/Lorem';
import { ReviewAction } from '../../shared/ui/ReviewAction';
import { useDraftText } from '../carbon/draft';
import { useJob } from '../accounts/accounts.api';
import type { CampaignDetail, Viewer } from './campaigns.api';
import * as copy from './campaigns.copy';

const MAX_CLAIM = 50;
const KEY_PREFIX = 'd06-';

type Stored = { count: string; key: string | null; jobId: string | null };

const EMPTY: Stored = { count: '', key: null, jobId: null };

const parse = (text: string): Stored => {
  try {
    return { ...EMPTY, ...(JSON.parse(text) as Partial<Stored>) };
  } catch {
    return EMPTY;
  }
};

const draftKey = (profile: Profile, address: string): string =>
  `treecord:draft:${profile.id}:${profile.walletAddress ?? 'no-wallet'}:${config().chainId}:claim:${address}`;

/** What a refused or failed claim says and where: under the field, in the review, or at the top of the region. */
type Problem = {
  field?: ReactNode;
  review?: ReactNode;
  region?: ReactNode;
  dropKey?: boolean;
  blocked?: boolean;
  walletMissing?: boolean;
  refetch?: boolean;
  remaining?: number;
  available?: number;
};

const detail = (error: ApiError, name: string): number | undefined => {
  const value = (error.details as Record<string, unknown> | null | undefined)?.[name];

  return typeof value === 'number' ? value : undefined;
};

const firstMessage = (error: ApiError): string | undefined =>
  Array.isArray(error.details) ? (error.details as { message?: string }[])[0]?.message : undefined;

const capProblem = (error: ApiError): Problem => {
  const remaining = detail(error, 'remaining') ?? 0;

  return { field: copy.capExceeded(remaining), remaining, refetch: true };
};

const slotsProblem = (error: ApiError): Problem => {
  const available = detail(error, 'available');

  return {
    field: <Lorem id={copy.NOT_ENOUGH_COPY} />,
    ...(available === undefined ? {} : { available }),
    refetch: true,
  };
};

const problemOf = (error: unknown): Problem => {
  if (!(error instanceof ApiError)) {
    return { review: copy.UNAVAILABLE };
  }

  const byCode: Record<string, Problem> = {
    validation_error: { field: firstMessage(error) ?? <Lorem id="COPY-001" /> },
    planter_cap_exceeded: capProblem(error),
    not_enough_slots: slotsProblem(error),
    campaign_not_active: { region: copy.MUST_BE_ACTIVE, refetch: true },
    claim_window_closed: { region: <Lorem id={copy.WINDOW_CLOSED_COPY} />, refetch: true },
    forbidden_role: { region: copy.ROLE_CHANGED, refetch: true },
    wallet_missing: { walletMissing: true, refetch: true },
    idempotency_key_reused: { review: <Lorem id="COPY-009" />, dropKey: true },
    invalid_idempotency_key: { review: <Lorem id="COPY-003" />, dropKey: true },
    invalid_json: { review: <Lorem id="COPY-002" />, blocked: true },
  };

  return byCode[error.code] ?? { review: copy.UNAVAILABLE };
};

const wholeIn = (text: string, max: number): boolean =>
  /^\d+$/u.test(text) && Number(text) >= 1 && Number(text) <= max;

type Props = {
  campaign: CampaignDetail;
  viewer: Viewer;
  /** Re-reads the campaign (`GET /campaigns/:address`). */
  onReread: () => Promise<unknown>;
};

function useClaim({ campaign, viewer, onReread }: Props, profile: Profile) {
  const { text, set, clear } = useDraftText(draftKey(profile, campaign.address));
  const stored = text === '' ? EMPTY : parse(text);
  const [problem, setProblem] = useState<Problem>({});
  const job = useJob(stored.jobId ?? '', stored.jobId !== null);
  const handled = useRef<string | null>(null);
  const save = (patch: Partial<Stored>): void => set(JSON.stringify({ ...stored, ...patch }));
  const status = job.data?.status;

  // a confirmed job ends the draft (the key is spent); a failed one keeps it, so the next Confirm re-arms the same job
  useEffect(() => {
    if (
      stored.jobId !== null &&
      status !== undefined &&
      handled.current !== `${stored.jobId}|${status}`
    ) {
      handled.current = `${stored.jobId}|${status}`;

      if (status === 'confirmed') {
        clear();
      }

      if (status === 'confirmed' || status === 'failed') {
        void onReread();
      }
    }
  }, [status, stored.jobId, clear, onReread]);

  const confirm = async (): Promise<boolean> => {
    const key = stored.key ?? `${KEY_PREFIX}${idempotencyKey()}`;

    save({ key });

    try {
      const body = await api<{ job: { id: string } }>(`/campaigns/${campaign.address}/claims`, {
        method: 'POST',
        body: { count: Number(stored.count) },
        idempotencyKey: key,
      });

      setProblem({});
      save({ key, jobId: body.job.id });
      void onReread();

      return true;
    } catch (error) {
      const found = problemOf(error);

      setProblem(found);

      if (found.dropKey === true) {
        save({ key: null });
      }

      if (found.refetch === true) {
        void onReread();
      }

      return false;
    }
  };

  return { stored, save, problem, setProblem, status, confirm, onReread, viewer, campaign };
}

type Claim = ReturnType<typeof useClaim>;

function Top({ claim }: { claim: Claim }) {
  const { stored, status, problem } = claim;
  const failed = status === 'failed' && stored.jobId !== null;

  return (
    <>
      {problem.region !== undefined && <Banner tone="error">{problem.region}</Banner>}
      {failed && (
        <Banner tone="error">
          <Lorem id={copy.JOB_FAILED_COPY} />
          {stored.jobId !== null && <JobLink id={stored.jobId}>{copy.TRACK_JOB}</JobLink>}
        </Banner>
      )}
    </>
  );
}

/** What can still be claimed: the slots left, the planter's cap left (a refusal's own figure wins), and the 50 limit. */
const limitsOf = ({ campaign, viewer, problem }: Claim) => {
  const open = problem.available ?? campaign.slots.openAvailable;
  const remaining = problem.remaining ?? viewer.claim?.remainingCap ?? 0;

  return { open, remaining, max: Math.min(open, remaining, MAX_CLAIM) };
};

/** A claim job is still on its way: the page says so, or a stored job has not reached a final status. */
const isQueued = ({ viewer, stored, status }: Claim): boolean =>
  viewer.claim?.queuedJobId != null ||
  (stored.jobId !== null && status !== undefined && status !== 'failed' && status !== 'confirmed');

const canSend = (claim: Claim, max: number): boolean =>
  !isQueued(claim) && claim.problem.blocked !== true && wholeIn(claim.stored.count, max);

function TrackJob({ id }: { id: string | null }) {
  return id === null ? null : <JobLink id={id}>{copy.TRACK_JOB}</JobLink>;
}

function Form({ claim }: { claim: Claim }) {
  const { campaign, stored, problem } = claim;
  const { open, remaining, max } = limitsOf(claim);
  const active = campaign.status === 'active' && !campaign.claimDeadlinePassed;
  const ready = active && canSend(claim, max);

  return (
    <>
      <Facts
        rows={[
          [copy.FACT_OPEN_SLOTS, String(open)],
          [copy.FACT_REMAINING, String(remaining)],
          [copy.FACT_CLAIM_DEADLINE, active ? copy.OPEN : copy.CLOSED],
        ]}
      />
      <Field label={copy.CLAIM_LABEL} error={problem.field}>
        <input
          type="number"
          min={1}
          max={max}
          step={1}
          value={stored.count}
          onChange={(event) => {
            claim.save({ count: event.target.value });
            claim.setProblem({});
          }}
        />
      </Field>
      <ReviewAction
        label={copy.CLAIM_SLOTS}
        disabled={!ready}
        copy={copy.CLAIM_REVIEW}
        onConfirm={claim.confirm}
        {...(problem.review === undefined ? {} : { error: problem.review })}
        doneLink={<TrackJob id={stored.jobId} />}
      />
      {campaign.status !== 'active' && <p className="ws-reason">{copy.MUST_BE_ACTIVE}</p>}
    </>
  );
}

function Panel({ props, profile }: { props: Props; profile: Profile }) {
  const claim = useClaim(props, profile);
  const missing = props.viewer.claim == null || claim.problem.walletMissing === true;

  if (missing) {
    return (
      <Banner tone="callout" action={copy.TRY_AGAIN} onAction={() => void props.onReread()}>
        {copy.WALLET_PENDING}
      </Banner>
    );
  }

  return (
    <div className="ws-action">
      <Top claim={claim} />
      <Form claim={claim} />
    </div>
  );
}

/** D06, for a planter on any status of the campaign. */
export function ClaimSlots(props: Props) {
  const session = useSession();

  return session.phase === 'ready' ? <Panel props={props} profile={session.profile} /> : null;
}
