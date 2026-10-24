// D04 Contribute (s04-campaign.md §3.4): the amount field, then a review that reads the chain at action time, asks for the
// allowance only when it is short, and sends `contribute` with exactly what the contract will take. One transaction in
// flight (NFR-054): the button is disabled at the first press. Nothing is sent until the review has been confirmed with
// the figures the person saw; when they moved, the review updates and waits for another press. The steps are in
// `contribute.steps.ts`.
import { useRef, useState, type ReactNode } from 'react';
import type { Address, Hash } from 'viem';
import { WalletAlert, CONTRIBUTE_IDS } from '../../shared/chain/wallet.copy';
import { publicClientOf, useChainSession } from '../../shared/chain/wallet';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { Facts } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useWalletTx } from '../../shared/ui/useWalletTx';
import { readFacts, readWallet } from './campaign.chain';
import { effectiveOf, parseAmount } from './campaign.rules';
import type { CampaignDetail, Viewer } from './campaigns.api';
import * as copy from './campaigns.copy';
import { usdc } from './campaigns.rules';
import * as steps from './contribute.steps';

type Props = {
  campaign: CampaignDetail;
  viewer: Viewer;
  initial: number;
  /** Re-reads `GET /campaigns/:address` and answers with the viewer it now holds. */
  onReread: () => Promise<Viewer | null>;
  /** The campaign no longer takes contributions: the page refreshes and the panel says why (D4-8). */
  onClosed: () => void;
  /** The page shows the contribution: the panel says so, even if the campaign is now funded and D04 is gone (D4-17). */
  onConfirmed: (units: bigint) => void;
};

function useContribute({
  campaign,
  viewer,
  onReread,
  onClosed,
  onConfirmed,
}: Omit<Props, 'initial'>) {
  const session = useChainSession();
  const [review, setReview] = useState<steps.Review | null>(null);
  const [notice, setNotice] = useState<steps.Notice>(null);
  const [reading, setReading] = useState(false);
  const hash = useRef<Hash | null>(null);
  const context: steps.Context = {
    session,
    chainId: campaign.chainId,
    campaign: campaign.address as Address,
    account: viewer.walletAddress as Address,
    viewer,
    review,
    hash,
    setReview,
    setNotice,
    setConfirmed: onConfirmed,
    reread: onReread,
    onClosed,
  };
  const needsApproval = review !== null && review.wallet.allowance < review.effective;
  const flow = useWalletTx({
    ...(needsApproval ? { approve: () => steps.approve(context) } : {}),
    send: () => steps.send(context),
    index: () => steps.index(context),
  });

  /** "Contribute" pressed: the reads, then the review (D4-3). */
  const open = async (text: string): Promise<void> => {
    const units = parseAmount(text);
    const client = publicClientOf(campaign.chainId);

    if (units === null || client === null || reading) {
      return;
    }

    setReading(true);
    setNotice(null);

    const [facts, wallet] = await Promise.all([
      readFacts(client, context.campaign),
      readWallet(client, context.campaign, context.account),
    ]).finally(() => setReading(false));

    if (!steps.isOpen(facts)) {
      onClosed();

      return;
    }

    const effective = effectiveOf(units, facts.target, facts.raised);

    setReview({ units, effective, wallet });
    setNotice(wallet.balance < effective ? { kind: 'lowUsdc' } : null);
    flow.start(wallet.allowance < effective);
  };

  const close = (): void => {
    setReview(null);
    setNotice(null);
    flow.reset();
  };

  return { flow, review, notice, reading, needsApproval, open, close };
}

type Contribution = ReturnType<typeof useContribute>;

const NOTICES = {
  changed: { tone: 'info', copyId: copy.CHANGED_COPY },
  closed: { tone: 'info', copyId: copy.CLOSED_COPY },
  lowUsdc: { tone: 'error', copyId: copy.LOW_USDC_COPY },
} as const;

function NoticeLine({ notice }: { notice: steps.Notice }) {
  if (notice === null) {
    return null;
  }

  if (notice.kind === 'failed') {
    return (
      <Banner tone="error" testId="d04-error">
        <WalletAlert outcome={notice.outcome} ids={CONTRIBUTE_IDS} />
      </Banner>
    );
  }

  const { tone, copyId } = NOTICES[notice.kind];

  return (
    <Banner tone={tone}>
      <Lorem id={copyId} />
    </Banner>
  );
}

function ReviewFacts({ review, needsApproval }: { review: steps.Review; needsApproval: boolean }) {
  return (
    <>
      <p>{copy.fromWallet(usdc(review.effective))}</p>
      <Facts
        rows={[
          [copy.FACT_ALLOWANCE, copy.allowanceOf(usdc(review.wallet.allowance))],
          [copy.FACT_STEP, needsApproval ? copy.STEP_TWO : copy.CONTRIBUTE],
        ]}
      />
    </>
  );
}

/** The approve button while the allowance is short or being granted, Confirm, and Cancel. */
function ReviewButtons({ contribution }: { contribution: Contribution }) {
  const { flow, review, notice } = contribution;
  const short = notice?.kind === 'lowUsdc';
  const approveText = review === null ? '' : copy.approveLabel(usdc(review.effective));

  return (
    <div className="ws-actions">
      {flow.state === 'approving' && (
        <Button busy variant="outline">
          {approveText}
        </Button>
      )}
      {flow.state === 'approval' && (
        <Button variant="outline" disabled={short} onClick={() => void flow.approve()}>
          {approveText}
        </Button>
      )}
      <Button
        busy={flow.state === 'confirming'}
        disabled={flow.state !== 'confirm' || short}
        onClick={() => void flow.confirm()}
      >
        {copy.CONFIRM}
      </Button>
      <Button
        variant="outline"
        disabled={flow.state !== 'approval' && flow.state !== 'confirm'}
        onClick={contribution.close}
      >
        {copy.CANCEL}
      </Button>
    </div>
  );
}

function ReviewRegion({ contribution }: { contribution: Contribution }) {
  const { flow, review, notice, needsApproval } = contribution;

  return (
    <div
      className="ws-review"
      role="region"
      aria-label={copy.reviewOf(copy.CONTRIBUTE)}
      aria-busy={flow.busy || undefined}
    >
      <h3>{copy.CONTRIBUTE}</h3>
      {review === null ? (
        <Skeleton shape="page" label={copy.CONTRIBUTE} />
      ) : (
        <ReviewFacts review={review} needsApproval={needsApproval} />
      )}
      <NoticeLine notice={notice} />
      <ReviewButtons contribution={contribution} />
    </div>
  );
}

type FieldProps = { text: string; onText: (text: string) => void; disabled: boolean };

/** The amount field: editable before a review opens, kept in view (and read-only) while one is open (D4-12). */
function AmountField({ text, onText, disabled }: FieldProps) {
  const label: ReactNode = (
    <>
      {copy.CONTRIBUTION_LABEL} · <Lorem id={copy.AMOUNT_RULE} kind="label" />
    </>
  );

  return (
    <Field label={label}>
      <input
        inputMode="decimal"
        value={text}
        disabled={disabled}
        onChange={(event) => onText(event.target.value)}
      />
    </Field>
  );
}

/** D04 as a whole: the field, the review, the "sent" line and the confirmed line. */
export function Contribute(props: Props) {
  const contribution = useContribute(props);
  const [text, setText] = useState(String(props.initial));
  const { flow } = contribution;

  if (flow.state === 'indexing') {
    return (
      <div role="status" className="ws-review">
        <p>{copy.doneOn(copy.CONTRIBUTE)}</p>
        <Button variant="text" onClick={contribution.close}>
          {copy.CLOSE}
        </Button>
      </div>
    );
  }

  const resting = (flow.state === 'idle' || flow.state === 'done') && !contribution.reading;

  return (
    <>
      <AmountField text={text} onText={setText} disabled={!resting} />
      {resting ? (
        <>
          <NoticeLine notice={contribution.notice} />
          <Button
            icon="arrow"
            disabled={parseAmount(text) === null}
            onClick={() => void contribution.open(text)}
          >
            {copy.CONTRIBUTE}
          </Button>
        </>
      ) : (
        <ReviewRegion contribution={contribution} />
      )}
    </>
  );
}
