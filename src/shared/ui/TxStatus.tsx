import type { ReactNode } from 'react';
import { Icon, type IconName } from '../art/Icon';
import type { TxState } from './useWalletTx';

// K33. The status line of a wallet transaction: carbon.jsx `.cb-buy-status` or create-campaign.jsx `.cc-transaction`.
// `lines` holds the copy per state (rule 12); a state with no line draws nothing. rejected and failed are `role="alert"`
// in the error look, everything else `role="status"`. `children` (the wallet buttons) sit inside the line.
const ICON_SIZE = 18;

const VARIANT = {
  buy: { base: 'cb-buy-status', failed: 'cb-buy-status error-banner' },
  campaign: { base: 'cc-transaction', failed: 'cc-transaction cc-error-box' },
} as const;

const ICON: Partial<Record<TxState, IconName>> = {
  approval: 'wallet',
  confirm: 'wallet',
  rejected: 'warning',
  failed: 'warning',
};

const FAILED: readonly TxState[] = ['rejected', 'failed'];

type TxStatusProps = {
  state: TxState;
  lines: Partial<Record<TxState, string>>;
  variant?: keyof typeof VARIANT;
  children?: ReactNode;
};

export function TxStatus({ state, lines, variant = 'buy', children }: TxStatusProps) {
  const line = lines[state];

  if (line === undefined) {
    return null;
  }

  const failed = FAILED.includes(state);
  const look = VARIANT[variant];

  return (
    <div className={failed ? look.failed : look.base} role={failed ? 'alert' : 'status'}>
      <Icon name={ICON[state] ?? 'clock'} size={ICON_SIZE} />
      <span>{line}</span>
      {children}
    </div>
  );
}
