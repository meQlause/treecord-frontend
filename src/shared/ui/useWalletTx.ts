import { useEffect, useRef, useState } from 'react';

// K33. The wallet transaction state machine the mockup writes three times (carbon.jsx:154 Buy, my-carbon.jsx:56 Action,
// create-campaign.jsx). One transaction in flight (NFR-054):
//
//   idle -start-> approval -approve-> approving -> confirm -confirm-> confirming -> indexing -> done
//        (a flow without an allowance skips approval and approving: idle -start-> confirm)
//   approval / confirm -reject-> rejected      any step that throws -> failed (WalletRejectedError -> rejected)
//
// `approval` and `confirm` wait for the person's click; `approving`, `confirming` and `indexing` are work in flight.
export type TxState =
  | 'idle'
  | 'approval'
  | 'approving'
  | 'confirm'
  | 'confirming'
  | 'indexing'
  | 'done'
  | 'rejected'
  | 'failed';

/** Throw this from a step when the person declined in their wallet: the state becomes `rejected`, not `failed`. */
export class WalletRejectedError extends Error {}

type Step = () => Promise<unknown>;
type Plan = [during: TxState, step: Step | undefined][];

export type TxSteps = {
  /** The allowance transaction. Without it the flow starts at `confirm`. */
  approve?: Step;
  /** The transaction itself. */
  send: Step;
  /** Waits until the backend shows the result. Without it `confirming` goes straight to `done`. */
  index?: Step;
};

const WAITING: readonly TxState[] = ['approval', 'confirm'];
const IN_FLIGHT: readonly TxState[] = ['approving', 'confirming', 'indexing'];
const RESTING: readonly TxState[] = ['idle', 'done', 'rejected', 'failed'];

export function useWalletTx(steps: TxSteps) {
  const [state, setState] = useState<TxState>('idle');
  const flight = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  const run = async (plan: Plan, after: TxState): Promise<void> => {
    if (flight.current) {
      return;
    }

    flight.current = true;

    let outcome = after;

    try {
      for (const [during, step] of plan) {
        setState(during);
        await step?.();
      }
    } catch (error) {
      outcome = error instanceof WalletRejectedError ? 'rejected' : 'failed';
    }

    flight.current = false;

    if (alive.current) {
      setState(outcome);
    }
  };

  const approve = async (): Promise<void> => {
    if (state === 'approval') {
      await run([['approving', steps.approve]], 'confirm');
    }
  };

  const confirm = async (): Promise<void> => {
    if (state !== 'confirm') {
      return;
    }

    const plan: Plan = [['confirming', steps.send]];

    if (steps.index !== undefined) {
      plan.push(['indexing', steps.index]);
    }

    await run(plan, 'done');
  };

  return {
    state,
    /** A step is running: lock the form, the dialog and navigation. */
    busy: IN_FLIGHT.includes(state),
    /** A transaction is open (waiting for a click or running). */
    active: !RESTING.includes(state),
    start: (): void => {
      if (RESTING.includes(state)) {
        setState(steps.approve === undefined ? 'confirm' : 'approval');
      }
    },
    approve,
    confirm,
    /** Decline while waiting for the click: the wallet's Reject, or Cancel. */
    reject: (): void => {
      if (WAITING.includes(state)) {
        setState('rejected');
      }
    },
    reset: (): void => {
      if (!flight.current) {
        setState('idle');
      }
    },
  };
}
