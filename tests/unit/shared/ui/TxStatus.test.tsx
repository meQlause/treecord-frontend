import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TxStatus } from '../../../../src/shared/ui/TxStatus';
import type { TxState } from '../../../../src/shared/ui/useWalletTx';

const lines: Partial<Record<TxState, string>> = {
  approval: 'Step 1 · Approve',
  approving: 'Confirming approval…',
  confirm: 'Ready to confirm',
  confirming: 'Confirming…',
  indexing: 'Updating…',
  rejected: 'Wallet rejected',
  failed: 'Transaction failed',
};

describe('TxStatus', () => {
  it.each(['approval', 'approving', 'confirm', 'confirming', 'indexing'] as const)(
    '%s: a status line',
    (state) => {
      render(<TxStatus state={state} lines={lines} />);

      expect(screen.getByRole('status')).toHaveTextContent(lines[state] ?? '');
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it.each(['rejected', 'failed'] as const)('%s: an alert in the error look', (state) => {
    render(<TxStatus state={state} lines={lines} />);

    expect(screen.getByRole('alert')).toHaveTextContent(lines[state] ?? '');
    expect(screen.getByRole('alert')).toHaveClass('error-banner');
  });

  it.each(['idle', 'done'] as const)('%s: nothing when it has no line', (state) => {
    const { container } = render(<TxStatus state={state} lines={lines} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('draws the campaign look and puts the wallet buttons inside the line', () => {
    render(
      <TxStatus state="confirm" lines={lines} variant="campaign">
        <button type="button">Confirm in wallet</button>
      </TxStatus>,
    );

    expect(screen.getByRole('status')).toHaveClass('cc-transaction');
    expect(screen.getByRole('status')).toContainElement(
      screen.getByRole('button', { name: 'Confirm in wallet' }),
    );
  });

  it('draws the campaign error look', () => {
    render(<TxStatus state="failed" lines={lines} variant="campaign" />);

    expect(screen.getByRole('alert')).toHaveClass('cc-transaction', 'cc-error-box');
  });
});
