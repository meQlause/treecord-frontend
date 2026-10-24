// The sentences of a wallet action that did not go through (s04-campaign.md §8): lorem until the owner approves them. Each
// action names its own COPY ids for "rejected" and "reverted"; gas and network are the same for every action.
import { Lorem } from '../ui/Lorem';
import type { Outcome } from './errors';

type Ids = { rejected: string; reverted: string };

/** D04's pair (COPY-150, COPY-151) and the pair Start refund, D05 and the tree flag share (COPY-152, COPY-153). */
export const CONTRIBUTE_IDS: Ids = { rejected: 'COPY-150', reverted: 'COPY-151' };

export const ACTION_IDS: Ids = { rejected: 'COPY-152', reverted: 'COPY-153' };

const GAS = 'COPY-155';

const NETWORK = 'COPY-156';

/** The alert for a failed step; any failure the wallet did not name reads as a revert (nothing on chain changed). */
export function WalletAlert({ outcome, ids }: { outcome: Outcome; ids: Ids }) {
  const id = {
    rejected: ids.rejected,
    reverted: ids.reverted,
    insufficientGas: GAS,
    wrongNetwork: NETWORK,
    failed: ids.reverted,
  }[outcome];

  return <Lorem id={id} />;
}
