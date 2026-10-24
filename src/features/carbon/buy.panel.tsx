// D08 Buy credits (s08-batch.md §3.2, §3.3): the rail panel of S08. The amount is checked here and on the chain, never sent
// to the API; submit reads the batch, the holdings and the allowance, approves only a short allowance, then buys. One
// wallet transaction in flight (NFR-054): every button is disabled while one runs. Nothing changes on the page until the
// holdings show the purchase.
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ReactNode } from 'react';
import type { Address, Hash } from 'viem';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useNavigate } from 'react-router';
import { useSession, type Profile } from '../../app/session/session';
import { config } from '../../app/session/config';
import { actingChainId, useChainSession } from '../../shared/chain/wallet';
import { Icon } from '../../shared/art/Icon';
import { tonnes } from '../../shared/format/carbon';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { FacetCoin } from '../../shared/ui/FacetCoin';
import { Lorem } from '../../shared/ui/Lorem';
import { useWalletTx } from '../../shared/ui/useWalletTx';
import * as copy from './batch.copy';
import { priceText } from './batch.rules';
import { useBatch, type BatchDetail } from './carbon.api';
import { AVAILABILITY_LABEL, AVAILABLE_UNIT, UNIT } from './carbon.copy';
import { amountProblem, draftKey, parseUnits, quoteOf } from './buy.rules';
import * as steps from './buy.steps';
import { useDraftText } from './draft';
import { usdc } from '../campaigns/campaigns.rules';

const BUY_ICON = 22;
const NOTE_ICON = 16;
const COIN_SIZE = { cx: 30, cy: 28, r: 22 };

type Who = { profile: Profile | null; chainId: number };

/** What the form is showing: the plan submit made, the line under it, the amount's error, the checking and the result. */
function useForm() {
  const [plan, setPlan] = useState<steps.Plan | null>(null);
  const [message, setMessage] = useState<steps.Message>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [bought, setBought] = useState<steps.Bought | null>(null);

  return {
    plan,
    message,
    error,
    checking,
    bought,
    setPlan,
    setMessage,
    setError,
    setChecking,
    setBought,
  };
}

function useBuy(batch: BatchDetail, { profile, chainId }: Who) {
  const form = useForm();
  const session = useChainSession();
  const queryClient = useQueryClient();
  const query = useBatch(batch.batchId);
  const draft = useDraftText(profile === null ? null : draftKey(profile, chainId, batch.batchId));
  const { plan, message, error, checking, bought } = form;
  const { setPlan, setMessage, setError, setChecking, setBought } = form;
  const hash = useRef<Hash | null>(null);
  const paid = useRef(BigInt(0));
  const context: steps.Context = {
    session,
    chainId,
    batchId: batch.batchId,
    plan,
    hash,
    paid,
    setPlan,
    setMessage,
    setBought: (done) => {
      setBought(done);
      draft.clear();
      void queryClient.invalidateQueries({ queryKey: ['carbon'] });
    },
    reread: async () => (await query.refetch()).data?.usdcPerTonne ?? null,
  };
  const flow = useWalletTx({
    ...(plan !== null && plan.allowance < plan.quote
      ? { approve: () => steps.approve(context) }
      : {}),
    send: () => steps.send(context),
    index: () => steps.index(context),
  });

  /** Submit: the amount, then the batch, the holdings and the allowance; then the first step that is needed. */
  const submit = async (): Promise<void> => {
    const problem = amountProblem(draft.text, batch.inventoryAmount);

    setMessage(null);
    setError(problem);

    if (problem !== null) {
      return;
    }

    setChecking(true);

    try {
      const outcome = await steps.prepare({
        units: parseUnits(draft.text) ?? BigInt(0),
        shown: batch.usdcPerTonne,
        batchId: batch.batchId,
        chainId,
        account: profile?.walletAddress as Address,
        refetch: async () => (await query.refetch()).data,
      });

      if (outcome === 'priceChanged') {
        setMessage('priceChanged');
      } else {
        setPlan(outcome);
        flow.start(outcome.allowance < outcome.quote);
      }
    } catch {
      setMessage('failed');
    } finally {
      setChecking(false);
    }
  };

  /** "Cancel" in state 14 or 16 counts as the wallet refusing (state 20). */
  const cancel = (): void => {
    setError(null);
    setMessage('rejected');
    flow.reject();
  };

  /** "Back to purchase" (FG-02): the form again, the amount empty. */
  const back = (): void => {
    setBought(null);
    flow.reset();
  };

  return { flow, plan, message, error, checking, bought, draft, submit, cancel, back, setError };
}

type Buy = ReturnType<typeof useBuy>;

const MESSAGES = {
  rejected: { text: copy.WALLET_REJECTED, tone: 'error' },
  failed: { text: copy.PURCHASE_FAILED, tone: 'error' },
} as const;

/** The line under the form after a rejection, a failure or a price that moved (states 13b, 20, 21). */
function MessageLine({ message }: { message: steps.Message }) {
  if (message === null) {
    return null;
  }

  if (message === 'priceChanged') {
    return (
      <Banner tone="info">
        <Lorem id={copy.PRICE_CHANGED} />
      </Banner>
    );
  }

  return <Banner tone={MESSAGES[message].tone}>{MESSAGES[message].text}</Banner>;
}

/** The status and the buttons of the transaction in flight (states 14-18). */
function Transaction({ buy }: { buy: Buy }) {
  const { flow } = buy;
  const status: Partial<Record<typeof flow.state, string>> = {
    approval: copy.STEP_APPROVE,
    approving: copy.APPROVING,
    confirm: copy.STEP_BUY,
    confirming: copy.CONFIRMING,
    indexing: copy.INDEXING,
  };

  return (
    <>
      <p className="cb-status" role="status">
        <Icon name="clock" size={NOTE_ICON} />
        {status[flow.state]}
      </p>
      {flow.state === 'approval' && (
        <Button onClick={() => void flow.approve()}>{copy.APPROVE_BUTTON}</Button>
      )}
      {flow.state === 'confirm' && (
        <Button onClick={() => void flow.confirm()}>{copy.CONFIRM_BUTTON}</Button>
      )}
      {flow.state === 'confirming' && <Button busy>{copy.CONFIRM_BUTTON}</Button>}
      {(flow.state === 'approval' || flow.state === 'confirm') && (
        <Button variant="outline" onClick={buy.cancel}>
          {copy.CANCEL}
        </Button>
      )}
    </>
  );
}

/** State 19: the purchase as the holdings show it. */
function Complete({ buy }: { buy: Buy }) {
  const { bought } = buy;

  return bought === null ? null : (
    <div role="status" className="cb-complete">
      <Icon name="check" size={BUY_ICON} />
      <h3>{copy.COMPLETE_TITLE}</h3>
      <strong>
        {tonnes(String(bought.units))} {UNIT}
      </strong>
      <p>{copy.paidLine(usdc(bought.paid))}</p>
      <Link className="button primary" to="/app/carbon">
        {copy.OPEN_MY_CARBON}
      </Link>
      <Button variant="outline" onClick={buy.back}>
        {copy.BACK_TO_PURCHASE}
      </Button>
    </div>
  );
}

type FormProps = { batch: BatchDetail; buy: Buy; disabled: boolean; action: ReactNode };

/** The amount, "Max", the quote and the line that ends the form (the button, or what stands in for it). */
function AmountForm({ batch, buy, disabled, action }: FormProps) {
  const units = parseUnits(buy.draft.text);
  const quote = quoteOf(units, batch.usdcPerTonne === null ? null : BigInt(batch.usdcPerTonne));

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <label className="cb-quantity" htmlFor="credit-quantity">
        {copy.AMOUNT_LABEL}
        <div>
          <input
            id="credit-quantity"
            inputMode="decimal"
            value={buy.draft.text}
            disabled={disabled}
            aria-invalid={buy.error === null ? undefined : true}
            aria-describedby={buy.error === null ? undefined : 'credit-error'}
            onChange={(event) => {
              buy.setError(null);
              buy.draft.set(event.target.value);
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              buy.setError(null);
              buy.draft.set(tonnes(batch.inventoryAmount));
            }}
          >
            {copy.MAX}
          </button>
        </div>
      </label>
      {buy.error !== null && (
        <p id="credit-error" role="alert" className="cb-error">
          {buy.error}
        </p>
      )}
      <span className="cb-inventory">
        {tonnes(batch.inventoryAmount)} {AVAILABLE_UNIT}
      </span>
      <div className="cb-quote">
        <span>{copy.TOTAL}</span>
        <strong>
          {quote === null ? copy.NO_VALUE : usdc(quote)} <small>{copy.USDC}</small>
        </strong>
      </div>
      <p className="cb-gas-note">{copy.GAS_NOTE}</p>
      <MessageLine message={buy.message} />
      {action}
    </form>
  );
}

type Standing = 'signedOut' | 'planter' | 'noWallet' | 'buyer';

/** Who is looking decides what takes the button's place (states 5, 6, 7). */
const standingOf = (profile: Profile | null): Standing => {
  if (profile === null) {
    return 'signedOut';
  }

  if (profile.role === 'planter') {
    return 'planter';
  }

  return profile.walletAddress === null ? 'noWallet' : 'buyer';
};

const signInPath = (batchId: string): string =>
  `/sign-in?${new URLSearchParams({ returnTo: ['/carbon', batchId].join('/') }).toString()}`;

type StandInProps = { standing: Exclude<Standing, 'buyer'>; batchId: string; retry: () => void };

function StandIn({ standing, batchId, retry }: StandInProps) {
  const navigate = useNavigate();

  if (standing === 'signedOut') {
    return (
      <Button icon="arrow" onClick={() => void navigate(signInPath(batchId))}>
        {copy.SIGN_IN}
      </Button>
    );
  }

  if (standing === 'planter') {
    return (
      <p className="ws-note">
        <Lorem id={copy.PLANTER_NOTICE} />
      </p>
    );
  }

  return (
    <Banner tone="callout" action={copy.TRY_AGAIN} onAction={retry}>
      {copy.WALLET_PENDING}
    </Banner>
  );
}

type EndingProps = {
  standing: Standing;
  batch: BatchDetail;
  available: boolean;
  buy: Buy;
  retry: () => void;
};

/** What ends the form while no transaction runs: the buy button, or what stands in for it. */
function Ending({ standing, batch, available, buy, retry }: EndingProps) {
  // a batch that cannot be bought says so to everyone (states 8-10), before who is looking matters
  if (available && standing !== 'buyer') {
    return <StandIn standing={standing} batchId={batch.batchId} retry={retry} />;
  }

  return (
    <Button
      icon="arrow"
      busy={buy.checking}
      busyLabel={copy.PROCESSING}
      disabled={!available}
      onClick={() => void buy.submit()}
    >
      {available ? copy.BUY_BUTTON : AVAILABILITY_LABEL[batch.availability]}
    </Button>
  );
}

/** The amount and "Max" are off while the batch cannot be bought, a check or a transaction runs, or the viewer cannot buy. */
const formLocked = ({
  available,
  standing,
  busy,
}: {
  available: boolean;
  standing: Standing;
  busy: boolean;
}): boolean => !available || busy || standing === 'planter' || standing === 'noWallet';

export function BuyPanel({ batch }: { batch: BatchDetail }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const profile = session.phase === 'ready' ? session.profile : null;
  const buy = useBuy(batch, { profile, chainId: actingChainId(config().chainId) });
  const { flow } = buy;
  const standing = standingOf(profile);
  const available = batch.availability === 'available';
  const open = flow.state === 'idle' || flow.state === 'rejected' || flow.state === 'failed';
  const locked = formLocked({ available, standing, busy: buy.checking || flow.active });

  return (
    <aside className="cb-buy">
      <div className="cb-buy-heading">
        <h2>{copy.BUY_TITLE}</h2>
        <Icon name="wallet" size={BUY_ICON} />
      </div>
      <span className="eyebrow">{copy.BUY_EYEBROW}</span>
      <div className="cb-buy-price">
        <svg className="cb-buy-coin" viewBox="0 0 60 60" aria-hidden="true">
          <FacetCoin {...COIN_SIZE} id={`buy-${batch.batchId}`} />
        </svg>
        <strong>{priceText(batch.usdcPerTonne)}</strong>
        <span>{copy.PER_TONNE}</span>
      </div>
      {buy.bought === null ? (
        <AmountForm
          batch={batch}
          buy={buy}
          disabled={locked}
          action={
            open ? (
              <Ending
                standing={standing}
                batch={batch}
                available={available}
                buy={buy}
                retry={() => void queryClient.invalidateQueries({ queryKey: ['me'] })}
              />
            ) : (
              <Transaction buy={buy} />
            )
          }
        />
      ) : (
        <Complete buy={buy} />
      )}
      <div className="cb-buy-note">
        <Icon name="leaf" size={NOTE_ICON} />
        <span>{copy.BUY_NOTE}</span>
      </div>
    </aside>
  );
}
