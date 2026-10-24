import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TxReceipts } from '../../../../src/app/shell/TxReceipts';
import { publishTx, settleTx } from '../../../../src/shared/chain/tx-feed';

vi.mock('../../../../src/app/session/config', () => ({ config: () => ({ chainId: 84532 }) }));

const HASH = `0x989079bc4cda68a46fb1ee5870c2536f948b0186a44a31114d3d23b8c37ac35e`;

describe('TxReceipts', () => {
  it('shows the hash as soon as the wallet signs, then how it ended, with the explorer link', async () => {
    render(<TxReceipts />);

    act(() => publishTx(HASH, 'createCampaign'));

    const card = screen.getByRole('listitem');

    expect(card).toHaveTextContent('Transaction sent');
    expect(card).toHaveTextContent('Create campaign');
    expect(card).toHaveTextContent('0x9890…c35e');
    expect(within(card).getByRole('link', { name: /View on BaseScan/u })).toHaveAttribute(
      'href',
      `https://sepolia.basescan.org/tx/${HASH}`,
    );

    act(() => settleTx(HASH, 'confirmed', '49629038'));

    expect(card).toHaveTextContent('Transaction confirmed');
    expect(card).toHaveTextContent('49629038');

    await userEvent.click(within(card).getByRole('button', { name: 'Dismiss receipt' }));

    // the card leaves with its exit animation
    await waitFor(() => expect(screen.queryByText('Transaction confirmed')).toBeNull());
  });
});
