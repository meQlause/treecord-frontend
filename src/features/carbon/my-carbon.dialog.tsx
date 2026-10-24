// D09 Decline and D10 Retire (s15-my-carbon.md §3.3, §3.4, §7): one modal dialog, the form or the release block, a review that
// names what will change, then one wallet transaction. No optimistic UI: nothing on the page changes until the receipt and
// the indexer say so. One transaction in flight (NFR-054): the confirm button is disabled at the first press, and the
// dialog cannot be closed while one runs (NFR-073, `shared/ui/Dialog`).
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { parseEventLogs, type Address, type Hash } from 'viem';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useNavigate } from 'react-router';
import { api, publicApi } from '../../app/session/api';
import { config } from '../../app/session/config';
import type { Profile } from '../../app/session/session';
import { useToast } from '../../app/shell/toast-context';
import { carbonLedgerAbi } from '../../shared/chain/abis';
import { outcomeOf } from '../../shared/chain/errors';
import { actingChainId, sendWrite, settle, useChainSession } from '../../shared/chain/wallet';
import { tonnes } from '../../shared/format/carbon';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { WalletAbortError, useWalletTx } from '../../shared/ui/useWalletTx';
import { readLedger } from './buy.steps';
import { useDraftText } from './draft';
import type { Balance, Holdings, Reservation } from './holdings.api';
import * as copy from './my-carbon.copy';
import { retireDraftKey, retireProblem, type Retire } from './my-carbon.rules';

const POLL_FIRST_MS = 2000;
const POLL_MAX_MS = 5000;
const POLL_GROWTH = 1.5;
const POLL_TRIES = 60;

export type Action =
  { kind: 'decline'; reservation: Reservation } | { kind: 'retire'; balance: Balance };

type Problem = { field: 'amount' | 'beneficiary'; text: string } | null;

type Draft = { amount: string; beneficiary: string; purpose: string };

type Message = 'rejected' | 'failed' | null;

const EMPTY_DRAFT: Draft = { amount: '', beneficiary: '', purpose: '' };

const sleep = (millis: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, millis));

/** Asks `done` until it says yes, every 2 to 5 s; there is no timeout state: the receipt already confirmed the action. */
const until = async (done: () => Promise<boolean>): Promise<void> => {
  let wait = POLL_FIRST_MS;

  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    if (await done().catch(() => false)) {
      return;
    }

    await sleep(wait);
    wait = Math.min(POLL_MAX_MS, wait * POLL_GROWTH);
  }
};

const parseDraft = (text: string): Draft => {
  try {
    return { ...EMPTY_DRAFT, ...(JSON.parse(text) as Partial<Draft>) };
  } catch {
    return EMPTY_DRAFT;
  }
};

/** D10's three fields, kept under the account, wallet, chain and batch (user decision, 23 Oct 2026). */
function useRetireDraft(key: string | null) {
  const stored = useDraftText(key);
  const draft = stored.text === '' ? EMPTY_DRAFT : parseDraft(stored.text);

  return {
    draft,
    edit: (change: Partial<Draft>): void => stored.set(JSON.stringify({ ...draft, ...change })),
    clear: stored.clear,
  };
}

const campaignOf = (action: Action): Address =>
  (action.kind === 'decline'
    ? action.reservation.campaign.address
    : action.balance.campaign.address) as Address;

/** The ledger call of the action: release the reservation of a campaign, or retire units of a batch. */
const callOf = (action: Action, retire: Retire | null) =>
  action.kind === 'decline'
    ? ({
        abi: carbonLedgerAbi,
        functionName: 'declineReservation',
        args: [campaignOf(action)],
      } as const)
    : ({
        abi: carbonLedgerAbi,
        functionName: 'retire',
        args: [
          BigInt(action.balance.batchId),
          retire?.units ?? BigInt(0),
          retire?.beneficiary ?? '',
          retire?.purpose ?? '',
        ],
      } as const);

/** D09's wait: the holdings show the reservation declined with nothing unfilled. */
const declined = async (campaign: string): Promise<boolean> => {
  const { reservations } = await api<Holdings>('/carbon/holdings');
  const row = reservations.find((item) => item.campaign.address === campaign);

  return row?.declined === true && row.unfilledAmount === '0';
};

/** D10's wait: the retirement is on the API (404 until the indexer has it); when the log could not be read, by its tx hash. */
const retired = async (found: { id: string | null; hash: Hash | null }): Promise<boolean> => {
  if (found.id === null) {
    const { retirements } = await api<Holdings>('/carbon/holdings');

    found.id = retirements.items.find((item) => item.txHash === found.hash)?.retirementId ?? null;
  }

  return found.id !== null && (await publicApi(`/carbon/retirements/${found.id}`).then(() => true));
};

type Steps = { chainId: number; retire: Retire | null; finish: (id: string | null) => void };

/** The wallet call of an action, and the wait for the indexer that follows it. */
function useSteps(action: Action, { chainId, retire, finish }: Steps) {
  const session = useChainSession();
  const [message, setMessage] = useState<Message>(null);
  const found = useRef<{ id: string | null; hash: Hash | null }>({ id: null, hash: null });

  const fail = (error: unknown): never => {
    if (error instanceof WalletAbortError) {
      throw error;
    }

    setMessage(outcomeOf(error) === 'rejected' ? 'rejected' : 'failed');
    throw new WalletAbortError('confirm');
  };

  const send = async (): Promise<void> => {
    try {
      const wallet = await session(chainId);
      const address = await readLedger(chainId, campaignOf(action));

      setMessage(null);
      found.current.hash = await sendWrite(wallet, { address, ...callOf(action, retire) });

      const receipt = await settle(wallet, found.current.hash);
      const [log] = parseEventLogs({
        abi: carbonLedgerAbi,
        logs: receipt.logs,
        eventName: 'Retired',
      });

      found.current.id = log?.args.retirementId.toString() ?? null;
    } catch (error) {
      fail(error);
    }
  };

  const index = async (): Promise<void> => {
    if (action.kind === 'decline') {
      await until(() => declined(action.reservation.campaign.address));
      finish(null);
    } else {
      await until(() => retired(found.current));
      finish(found.current.id);
    }
  };

  return { send, index, message, clear: () => setMessage(null) };
}

const STATUS = {
  confirm: copy.READY,
  confirming: copy.PENDING,
  indexing: copy.INDEXING,
} as const;

type Flow = ReturnType<typeof useWalletTx>;

type ReviewProps = { lines: string[]; flow: Flow; message: Message; onBack: () => void };

/** The confirm view: what will happen, the status or the alert, "Confirm in wallet" and "Back to edit". */
function Review({ lines, flow, message, onBack }: ReviewProps) {
  const status = STATUS[flow.state as keyof typeof STATUS] ?? copy.READY;

  return (
    <div className="mc-confirm">
      {lines.map((line, index) => (
        <p key={line}>{index === 0 ? <strong>{line}</strong> : line}</p>
      ))}
      {message === null ? (
        <p role="status">{status}</p>
      ) : (
        <Banner tone="error">{message === 'rejected' ? copy.REJECTED : copy.FAILED}</Banner>
      )}
      <Button
        icon="check"
        busy={flow.busy}
        busyLabel={copy.PROCESSING}
        disabled={flow.state !== 'confirm'}
        onClick={() => void flow.confirm()}
      >
        {copy.CONFIRM}
      </Button>
      <Button variant="text" disabled={flow.busy} onClick={onBack}>
        {copy.BACK_TO_EDIT}
      </Button>
    </div>
  );
}

type FormProps = {
  draft: Draft;
  edit: (change: Partial<Draft>) => void;
  problem: Problem;
  onReview: () => void;
};

/** D10's form: amount, beneficiary and purpose; the failing field points at the one message under the form (NFR-071). */
function RetireForm({ draft, edit, problem, onReview }: FormProps) {
  const aria = (field: 'amount' | 'beneficiary') =>
    problem?.field === field ? { 'aria-invalid': true, 'aria-describedby': 'mc-error' } : {};

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onReview();
      }}
    >
      <label>
        {copy.AMOUNT_LABEL}
        <input
          value={draft.amount}
          inputMode="decimal"
          {...aria('amount')}
          onChange={(event) => edit({ amount: event.target.value })}
        />
      </label>
      <label>
        {copy.BENEFICIARY_LABEL}
        <input
          value={draft.beneficiary}
          {...aria('beneficiary')}
          onChange={(event) => edit({ beneficiary: event.target.value })}
        />
      </label>
      <label>
        {copy.PURPOSE_LABEL}
        <textarea
          value={draft.purpose}
          rows={3}
          onChange={(event) => edit({ purpose: event.target.value })}
        />
      </label>
      {problem !== null && (
        <p role="alert" id="mc-error" className="mc-error">
          {problem.text}
        </p>
      )}
      <Button type="submit" icon="arrow">
        {copy.REVIEW}
      </Button>
    </form>
  );
}

/** D09's form: the amount that would be released, and the line that says what stays. */
function DeclineForm({
  reservation,
  onReview,
}: {
  reservation: Reservation;
  onReview: () => void;
}) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onReview();
      }}
    >
      <div className="mc-release">
        <strong>
          {tonnes(reservation.unfilledAmount)}
          <small>{copy.UNIT}</small>
        </strong>
        <p>{copy.RELEASE_NOTE}</p>
      </div>
      <Button type="submit" icon="arrow">
        {copy.REVIEW}
      </Button>
    </form>
  );
}

/** The lines the review shows for the action: the amount, who it is for, and what it does. */
const reviewLines = (action: Action, checked: Retire | null): string[] => {
  if (action.kind === 'decline') {
    return [`${tonnes(action.reservation.unfilledAmount)} ${copy.UNIT}`, copy.DECLINE_REVIEW];
  }

  return [
    `${tonnes(String(checked?.units ?? 0))} ${copy.UNIT}`,
    copy.forLine(checked?.beneficiary ?? '', checked?.purpose ?? ''),
    copy.RETIRE_REVIEW,
  ];
};

type Props = { action: Action; profile: Profile; onClose: () => void };

/** What happens when the indexer has the result: D09 toasts and closes; D10 clears its draft and opens the record. */
function useFinish(onClose: () => void, clearDraft: () => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { notify } = useToast();

  return (id: string | null): void => {
    void queryClient.invalidateQueries({ queryKey: ['carbon'] });

    if (id === null) {
      notify(copy.RELEASED_TOAST);
      onClose();
    } else {
      clearDraft();
      void navigate(`/carbon/retirements/${id}`);
    }
  };
}

export function ActionDialog({ action, profile, onClose }: Props) {
  const chainId = actingChainId(config().chainId);
  const batchId = action.kind === 'retire' ? action.balance.batchId : null;
  const stored = useRetireDraft(
    batchId === null ? null : retireDraftKey(profile, chainId, batchId),
  );
  const [problem, setProblem] = useState<Problem>(null);
  const [checked, setChecked] = useState<Retire | null>(null);
  const finish = useFinish(onClose, stored.clear);
  const steps = useSteps(action, { chainId, retire: checked, finish });
  const flow = useWalletTx({ send: steps.send, index: steps.index });

  const review = (): void => {
    const result =
      action.kind === 'retire' ? retireProblem(stored.draft, action.balance.amount) : null;

    if (result !== null && 'field' in result) {
      setProblem(result);

      return;
    }

    setProblem(null);
    setChecked(result);
    flow.start(false);
  };

  const back = (): void => {
    steps.clear();
    flow.reset();
  };

  return (
    <Dialog
      title={action.kind === 'retire' ? copy.RETIRE_TITLE : copy.RELEASE_TITLE}
      description={
        action.kind === 'retire'
          ? copy.retireSubtitle(action.balance.batchId, tonnes(action.balance.amount))
          : action.reservation.campaign.title
      }
      closeLabel={copy.CLOSE}
      busy={flow.busy}
      onClose={onClose}
    >
      {flow.state === 'idle' ? (
        <Form action={action} stored={stored} problem={problem} onReview={review} />
      ) : (
        <Review
          lines={reviewLines(action, checked)}
          flow={flow}
          message={steps.message}
          onBack={back}
        />
      )}
    </Dialog>
  );
}

type FormSwitch = {
  action: Action;
  stored: ReturnType<typeof useRetireDraft>;
  problem: Problem;
  onReview: () => void;
};

function Form({ action, stored, problem, onReview }: FormSwitch) {
  return action.kind === 'retire' ? (
    <RetireForm draft={stored.draft} edit={stored.edit} problem={problem} onReview={onReview} />
  ) : (
    <DeclineForm reservation={action.reservation} onReview={onReview} />
  );
}
