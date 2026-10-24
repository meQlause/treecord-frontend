// S04's "Campaign actions" panel (s04-campaign.md §3.3), read parts only: which rows apply to this viewer, the
// wallet-missing callout, the operator link and the two plain lines. The four actions that move money or queue a job
// are not drawn here yet; each has its marker below.
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { Panel } from '../../shared/ui/Panel';
import type { CampaignDetail, Viewer } from './campaigns.api';
import {
  ACTIONS_TITLE,
  DONOR_ACTIVE,
  READ_ONLY,
  CTA_OPERATOR,
  START_REFUND,
  TRY_AGAIN,
  WALLET_PENDING,
} from './campaigns.copy';
import { branchesFor } from './campaign.rules';

type Props = { campaign: CampaignDetail; viewer: Viewer; onRetryWallet: () => void };

export function CampaignActions({ campaign, viewer, onRetryWallet }: Props) {
  const branches = branchesFor(campaign, viewer);

  return (
    <Panel title={ACTIONS_TITLE} icon="wallet">
      {branches.walletMissing && (
        <Banner tone="callout" action={TRY_AGAIN} onAction={onRetryWallet}>
          {WALLET_PENDING}
        </Banner>
      )}
      {branches.startRefund && !branches.walletMissing && (
        // F2b/F4a: Start refund (FR-047, SR-1..SR-9) plugs in here: re-read the chain, review, `markRefunding()`.
        <Button disabled>{START_REFUND}</Button>
      )}
      {branches.operator && (
        <ArrowLink to={`/app/operator/campaigns/${campaign.address}`}>{CTA_OPERATOR}</ArrowLink>
      )}
      {/* F2b/F4a: D04 Contribute (donor, funding, not passed), D05 Claim refund (donor, refunding or completed, contributed) and D06 Claim slots (planter, any status) plug in here, after the rows above. */}
      {branches.donorActive && <p>{DONOR_ACTIVE}</p>}
      {branches.readOnly && <p>{READ_ONLY}</p>}
    </Panel>
  );
}
