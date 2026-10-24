// One wallet transaction behind a review (s04-campaign.md §3.5, §3.6): the button, a review that names what changes, Confirm
// and Cancel, the "sent" line once the wallet has a hash, and the confirmed line once the page shows the result. One
// transaction in flight (NFR-054). A failure leaves the review open with its alert; nothing is retried by itself.
import { useRef, useState, type ReactNode } from 'react';
import type { Hash } from 'viem';
import { outcomeOf, type Outcome } from '../../shared/chain/errors';
import { WalletAlert } from '../../shared/chain/wallet.copy';
import { sendWrite, settle, useChainSession } from '../../shared/chain/wallet';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { Facts } from '../../shared/ui/Facts';
import { WalletAbortError, useWalletTx } from '../../shared/ui/useWalletTx';
import * as copy from './campaigns.copy';

const POLL_MS = 2000;
const POLL_TRIES = 60;

type Ids = { rejected: string; reverted: string };

type Props = {
  label: string;
  chainId: number;
  disabled?: boolean;
  /** The review's summary line and the rows naming what it would change. */
  summary: ReactNode;
  target?: readonly (readonly [label: string, value: ReactNode])[];
  ids: Ids;
  /** The write to send. */
  call: Parameters<typeof sendWrite>[1];
  /** Re-reads the chain when the button is pressed: `false` keeps the review closed (the page says why). */
  check: () => Promise<boolean>;
  /** Re-reads the page once: `true` when it shows the result. */
  seen: () => Promise<boolean>;
  sent: string;
  /** Shown here once the result is seen; omit it when the panel above shows the result (the action may be gone by then). */
  confirmed?: string;
};

const sleep = (millis: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, millis));

/** The send and the wait for the receipt and the page, with a failure shown and the review kept. */
function useSteps({ chainId, call, seen }: Pick<Props, 'chainId' | 'call' | 'seen'>) {
  const session = useChainSession();
  const hash = useRef<Hash | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const fail = (error: unknown): never => {
    if (error instanceof WalletAbortError) {
      throw error;
    }

    setOutcome(outcomeOf(error));
    throw new WalletAbortError('confirm');
  };

  const send = async (): Promise<void> => {
    try {
      const wallet = await session(chainId);

      setOutcome(null);
      hash.current = await sendWrite(wallet, call);
    } catch (error) {
      fail(error);
    }
  };

  const index = async (): Promise<void> => {
    try {
      await settle(await session(chainId), hash.current as Hash);

      for (let attempt = 0; attempt < POLL_TRIES && !(await seen()); attempt += 1) {
        await sleep(POLL_MS);
      }
    } catch (error) {
      fail(error);
    }
  };

  return { send, index, outcome, clear: () => setOutcome(null) };
}

type Flow = ReturnType<typeof useWalletTx>;

type ReviewProps = Pick<Props, 'label' | 'summary' | 'target' | 'ids'> & {
  flow: Flow;
  outcome: Outcome | null;
};

function ReviewBody({ label, summary, target, ids, flow, outcome }: ReviewProps) {
  return (
    <div
      className="ws-review"
      role="region"
      aria-label={copy.reviewOf(label)}
      aria-busy={flow.busy || undefined}
    >
      <h3>{label}</h3>
      {target !== undefined && <Facts rows={target} />}
      <p>{summary}</p>
      {outcome !== null && (
        <Banner tone="error">
          <WalletAlert outcome={outcome} ids={ids} />
        </Banner>
      )}
      <div className="ws-actions">
        <Button
          busy={flow.state === 'confirming'}
          disabled={flow.state !== 'confirm'}
          onClick={() => void flow.confirm()}
        >
          {copy.CONFIRM}
        </Button>
        <Button variant="outline" disabled={flow.busy} onClick={flow.reset}>
          {copy.CANCEL}
        </Button>
      </div>
    </div>
  );
}

export function WalletAction(props: Props) {
  const { label, check } = props;
  const steps = useSteps(props);
  const flow = useWalletTx({ send: steps.send, index: steps.index });
  const [checking, setChecking] = useState(false);

  const open = async (): Promise<void> => {
    setChecking(true);

    const eligible = await check().finally(() => setChecking(false));

    if (eligible) {
      steps.clear();
      flow.start(false);
    }
  };

  if (flow.state === 'done' && props.confirmed !== undefined) {
    return (
      <p role="status" className="ws-review">
        {props.confirmed}
      </p>
    );
  }

  if (flow.state === 'indexing') {
    return (
      <div role="status" className="ws-review">
        <p>{props.sent}</p>
        <Button variant="text" onClick={flow.reset}>
          {copy.CLOSE}
        </Button>
      </div>
    );
  }

  return flow.state === 'idle' ? (
    <Button
      icon="arrow"
      busy={checking}
      disabled={props.disabled === true}
      onClick={() => void open()}
    >
      {label}
    </Button>
  ) : (
    <ReviewBody {...props} flow={flow} outcome={steps.outcome} />
  );
}
