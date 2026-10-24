// S04's "Campaign actions" panel (s04-campaign.md §3.3): which rows apply to this viewer, the wallet-missing callout, Start
// refund, D04 Contribute, D05 Claim refund, the operator link and the two plain lines. D06 (the slot claim, a job) is `campaign.claim.tsx`.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { Address } from 'viem';
import { campaignAbi } from '../../shared/chain/abis';
import { ACTION_IDS } from '../../shared/chain/wallet.copy';
import { publicClientOf } from '../../shared/chain/wallet';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { Banner } from '../../shared/ui/Banner';
import { Facts } from '../../shared/ui/Facts';
import { Lorem } from '../../shared/ui/Lorem';
import { Panel } from '../../shared/ui/Panel';
import { CHAIN_STATUS, readFacts, readRefund } from './campaign.chain';
import { ClaimSlots } from './campaign.claim';
import { Contribute } from './campaign.contribute';
import { branchesFor, refundableOf } from './campaign.rules';
import type { CampaignDetail, Viewer } from './campaigns.api';
import * as copy from './campaigns.copy';
import { usdc } from './campaigns.rules';
import { WalletAction } from './wallet-action';

type Body = { campaign: CampaignDetail; viewer: Viewer | null };

type Props = {
  campaign: CampaignDetail;
  viewer: Viewer;
  /** The amount the funding panel's chips chose: D04's field starts with it. */
  amount: number;
  onRetryWallet: () => void;
  /** Re-reads the campaign (`GET /campaigns/:address`) and answers with what it now holds. */
  onReread: () => Promise<Body | undefined>;
};

type Notice = 'closed' | 'notDue' | null;

type Done = (text: string) => void;

const NOTICE_COPY = { closed: copy.CLOSED_COPY, notDue: copy.NOT_ELIGIBLE_COPY } as const;

const NONE = BigInt(0);

/** Start refund (SR-1..SR-9): offered once the deadline has passed unfunded; the chain is asked again when it is pressed. */
function StartRefund({
  campaign,
  onNotDue,
  onDone,
  onReread,
}: Pick<Props, 'campaign' | 'onReread'> & { onNotDue: () => void; onDone: Done }) {
  const address = campaign.address as Address;
  const due = async (): Promise<boolean> => {
    const client = publicClientOf(campaign.chainId);
    const facts = client === null ? null : await readFacts(client, address);
    const passed =
      facts !== null && facts.status === CHAIN_STATUS.funding && facts.now > facts.deadline;

    if (!passed) {
      onNotDue();
    }

    return passed;
  };

  return (
    <WalletAction
      label={copy.START_REFUND}
      chainId={campaign.chainId}
      summary={copy.REFUND_SUMMARY}
      target={[[copy.FACT_CAMPAIGN, campaign.title ?? copy.UNTITLED_CAMPAIGN]]}
      ids={ACTION_IDS}
      call={{ address, abi: campaignAbi, functionName: 'markRefunding' }}
      check={due}
      seen={async () => {
        const started = (await onReread())?.campaign.status === 'refunding';

        if (started) {
          onDone(copy.REFUNDS_STARTED);
        }

        return started;
      }}
      sent={copy.doneOn(copy.START_REFUND)}
    />
  );
}

/** The refundable amount and who is eligible, from the chain; "—" while the reads are pending. */
function useRefundable(campaign: CampaignDetail, viewer: Viewer) {
  const address = campaign.address as Address;
  const account = viewer.walletAddress as Address;
  const figures = useQuery({
    queryKey: ['chain', 'refund', campaign.chainId, address, account],
    queryFn: () => {
      const client = publicClientOf(campaign.chainId);

      return client === null
        ? Promise.reject(new Error('chain'))
        : readRefund(client, address, account);
    },
  });
  const status = campaign.status === 'refunding' ? 'refunding' : 'completed';

  return {
    refundable: figures.data === undefined ? null : refundableOf(status, figures.data),
    refetch: figures.refetch,
  };
}

/** D05 Claim refund (D5-1..D5-11): the refundable figure, then the claim behind a review. */
function ClaimRefund({
  campaign,
  viewer,
  onReread,
}: Pick<Props, 'campaign' | 'viewer' | 'onReread'>) {
  const { refundable, refetch } = useRefundable(campaign, viewer);
  const text = refundable === null ? null : usdc(refundable);

  const seen = async (): Promise<boolean> => {
    const fresh = await onReread();

    void refetch();

    return BigInt(fresh?.viewer?.refundedAmount ?? '0') > NONE;
  };

  return (
    <div aria-busy={refundable === null || undefined}>
      <Facts
        rows={[
          [copy.FACT_REFUNDABLE, text === null ? null : copy.allowanceOf(text)],
          [copy.FACT_ELIGIBILITY, refundable === null ? null : copy.CONTRIBUTOR],
        ]}
      />
      <WalletAction
        label={copy.CLAIM_REFUND}
        chainId={campaign.chainId}
        disabled={refundable === null || refundable === NONE}
        summary={copy.claimSummary(text ?? '')}
        ids={ACTION_IDS}
        call={{
          address: campaign.address as Address,
          abi: campaignAbi,
          functionName: 'claimRefund',
        }}
        check={() => Promise.resolve(true)}
        seen={seen}
        sent={copy.doneOn(copy.CLAIM_REFUND)}
        confirmed={copy.REFUND_CONFIRMED}
      />
    </div>
  );
}

/** The wallet rows of the panel, for a viewer whose wallet exists. */
function WalletRows({
  campaign,
  viewer,
  amount,
  onReread,
  setNotice,
  setDone,
}: Omit<Props, 'onRetryWallet'> & { setNotice: (notice: Notice) => void; setDone: Done }) {
  const branches = branchesFor(campaign, viewer);
  const refresh = (reason: Exclude<Notice, null>) => (): void => {
    setNotice(reason);
    void onReread();
  };

  return (
    <>
      {branches.startRefund && (
        <StartRefund
          campaign={campaign}
          onNotDue={refresh('notDue')}
          onDone={setDone}
          onReread={onReread}
        />
      )}
      {branches.contribute && (
        <Contribute
          key={amount}
          campaign={campaign}
          viewer={viewer}
          initial={amount}
          onReread={async () => (await onReread())?.viewer ?? null}
          onClosed={refresh('closed')}
          onConfirmed={(units) => setDone(copy.contributed(usdc(units)))}
        />
      )}
      {branches.refund && <ClaimRefund campaign={campaign} viewer={viewer} onReread={onReread} />}
    </>
  );
}

function Notices({ notice, done }: { notice: Notice; done: string | null }) {
  return (
    <>
      {notice !== null && (
        <Banner tone="info">
          <Lorem id={NOTICE_COPY[notice]} />
        </Banner>
      )}
      {done !== null && (
        <p role="status" className="ws-review">
          {done}
        </p>
      )}
    </>
  );
}

export function CampaignActions({ campaign, viewer, amount, onRetryWallet, onReread }: Props) {
  const branches = branchesFor(campaign, viewer);
  const [notice, setNotice] = useState<Notice>(null);
  const [done, setDone] = useState<string | null>(null);

  return (
    <Panel title={copy.ACTIONS_TITLE} icon="wallet">
      <Notices notice={notice} done={done} />
      {branches.walletMissing ? (
        <Banner tone="callout" action={copy.TRY_AGAIN} onAction={onRetryWallet}>
          {copy.WALLET_PENDING}
        </Banner>
      ) : (
        <WalletRows
          campaign={campaign}
          viewer={viewer}
          amount={amount}
          onReread={onReread}
          setNotice={setNotice}
          setDone={setDone}
        />
      )}
      {branches.operator && (
        <ArrowLink to={`/app/operator/campaigns/${campaign.address}`}>
          {copy.CTA_OPERATOR}
        </ArrowLink>
      )}
      {branches.claim && !branches.walletMissing && (
        <ClaimSlots campaign={campaign} viewer={viewer} onReread={onReread} />
      )}
      {branches.donorActive && <p>{copy.DONOR_ACTIVE}</p>}
      {branches.readOnly && <p>{copy.READ_ONLY}</p>}
    </Panel>
  );
}
