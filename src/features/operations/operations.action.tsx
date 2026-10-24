// What S27, S28 and S29 share (s29-resolve-flag.md §D14): the inline confirm step, the per-review Idempotency-Key, what a
// refused or failed write says and where, and the job callout. "Done" means queued, never confirmed (FR-177).
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ApiError } from '../../shared/api/errors';
import { idempotencyKey } from '../../shared/api/client';
import { Facts } from '../../shared/ui/Facts';
import { JobLink } from '../../shared/ui/JobLink';
import { Lorem } from '../../shared/ui/Lorem';
import { ReviewAction } from '../../shared/ui/ReviewAction';
import { Tag } from '../../shared/ui/Badge';
import { useJob } from '../accounts/accounts.api';
import * as copy from './operations.copy';

/** What a failed write shows: a banner in the review, a line under a field, and whether Confirm waits for a change. */
export type Problem = {
  banner?: ReactNode;
  /** The field the server named, and its line. */
  field?: { name: string; text: ReactNode };
  /** Confirm stays disabled until the person changes something. */
  blocking?: boolean;
  /** Only an approve is blocked (S28 `cannot_attest`). */
  approveOnly?: boolean;
  /** Re-read the screen's read model so the disabled state and its line take over (ui-gaps pattern 5). */
  refetch?: boolean;
  /** The key belongs to another action: the next Confirm sends a new one. */
  dropKey?: boolean;
};

type Entry = Problem | ((error: ApiError) => Problem);

/** The message of the first `details[]` entry, or the generic COPY-001. */
const detailText = (error: ApiError): ReactNode => {
  const first = Array.isArray(error.details)
    ? (error.details as { message?: string }[])[0]
    : undefined;

  return first?.message ?? <Lorem id="COPY-001" />;
};

/** Looks the code up in the screen's table; anything unlisted is the retry class (Confirm resends the same key). */
const problemFor = (error: unknown, table: Readonly<Record<string, Entry>>): Problem => {
  const entry = error instanceof ApiError ? table[error.code] : undefined;

  if (entry === undefined) {
    return { banner: copy.UNAVAILABLE };
  }

  return typeof entry === 'function' ? entry(error as ApiError) : entry;
};

/** The codes every operator write shares (error-handling §5). */
const COMMON: Readonly<Record<string, Entry>> = {
  invalid_json: { banner: <Lorem id="COPY-002" />, blocking: true },
  invalid_idempotency_key: { banner: <Lorem id="COPY-003" />, blocking: true, dropKey: true },
  idempotency_key_reused: { banner: <Lorem id="COPY-009" />, blocking: true, dropKey: true },
};

/** One Idempotency-Key per review: the same request keeps its key across retries, a changed one gets a new key. */
export function useReviewKey(prefix: string): (payload: string) => string {
  const held = useRef<{ payload: string; key: string } | null>(null);

  return (payload) => {
    if (held.current?.payload !== payload) {
      held.current = { payload, key: `${prefix}${idempotencyKey()}` };
    }

    return held.current.key;
  };
}

type Send = (problem: Problem) => void;

/** The write of a D14: runs it, keeps what went wrong, and re-reads when the problem says so. */
export function useConfirm(table: Readonly<Record<string, Entry>>, onRefetch: () => void) {
  const [problem, setProblem] = useState<Problem | null>(null);

  const confirm = async (write: () => Promise<unknown>, onKey?: Send): Promise<boolean> => {
    try {
      await write();
      setProblem(null);

      return true;
    } catch (error) {
      const found = problemFor(error, { ...COMMON, ...table });

      setProblem(found);
      onKey?.(found);

      if (found.refetch === true) {
        onRefetch();
      }

      return false;
    }
  };

  return { problem, clear: () => setProblem(null), confirm };
}

type D14Props = {
  label: string;
  summary?: string;
  target?: readonly (readonly [string, string])[];
  disabled: boolean;
  problem: Problem | null;
  /** The decision, when only one of two is blocked by `approveOnly`. */
  approving?: boolean;
  onConfirm: () => Promise<boolean>;
  children?: ReactNode;
};

const ESCAPE_TARGET = '.ws-review .button.outline:enabled';
const FOCUS_TARGET = '.ws-review h3,.ws-review[role=status],.ws-action>button';

/** Focus follows the stage (NFR-073): the review heading, the done line, the idle button; Escape cancels unless busy. */
const settle = (event: { currentTarget: HTMLElement }): void => {
  const wrapper = event.currentTarget;

  requestAnimationFrame(() => {
    const target = wrapper.querySelector<HTMLElement>(FOCUS_TARGET);

    if (target !== null && !wrapper.contains(document.activeElement)) {
      target.tabIndex = target.matches('button') ? target.tabIndex : -1;
      target.focus();
    }
  });
};

const cancelOnEscape = (event: KeyboardEvent<HTMLElement>): void => {
  if (event.key === 'Escape') {
    event.currentTarget.querySelector<HTMLElement>(ESCAPE_TARGET)?.click();
  }
};

/** D14 (s29 §D14) around the kit's inline review. */
export function D14({
  label,
  summary,
  target,
  disabled,
  problem,
  approving,
  onConfirm,
  children,
}: D14Props) {
  const stopped =
    problem?.blocking === true && (problem.approveOnly !== true || approving !== false);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the wrapper only moves focus and maps Escape; the controls inside are the interactive elements
    <div onClick={settle} onKeyDown={cancelOnEscape}>
      <ReviewAction
        label={label}
        disabled={disabled}
        ready={!stopped}
        copy={{
          region: copy.reviewOf(label),
          summary: summary ?? copy.DEFAULT_SUMMARY,
          confirm: copy.CONFIRM,
          cancel: copy.CANCEL,
          close: copy.CLOSE,
          done: copy.doneOf(label),
        }}
        {...(target === undefined ? {} : { target })}
        {...(problem?.banner === undefined ? {} : { error: problem.banner })}
        onConfirm={onConfirm}
      >
        {children}
      </ReviewAction>
    </div>
  );
}

type CalloutProps = { id: string; onConfirmed?: () => void };

/** The queued job (s27 §3 states 22–24): its status, "Track job", "Last error" once failed (operators only, NFR-055). */
export function JobCallout({ id, onConfirmed }: CalloutProps) {
  const job = useJob(id, true);
  const status = job.data?.status;
  const seen = useRef(false);

  useEffect(() => {
    if (status === 'confirmed' && !seen.current) {
      seen.current = true;
      onConfirmed?.();
    }
  }, [status, onConfirmed]);

  return (
    <div className="ws-callout op-job">
      <Tag>{status ?? 'pending'}</Tag>
      <JobLink id={id}>{copy.TRACK_JOB}</JobLink>
      <p>{copy.QUEUED_NOT_CONFIRMED}</p>
      {status === 'failed' && (
        <Facts rows={[[copy.LAST_ERROR, job.data?.lastError ?? copy.NONE]]} />
      )}
    </div>
  );
}

/** A `validation_error` as a line under the field its first `details[].path` names. */
export const fieldProblem = (error: ApiError): Problem => {
  const first = Array.isArray(error.details)
    ? (error.details as { path?: unknown }[])[0]
    : undefined;

  return { field: { name: String(first?.path ?? ''), text: detailText(error) } };
};

/** The server's line for `name`, if that is the field it named. */
export const fieldText = (problem: Problem | null, name: string): ReactNode =>
  problem?.field?.name === name ? problem.field.text : undefined;
