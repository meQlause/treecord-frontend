import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { CampaignActions } from '../../../../src/features/campaigns/campaign.actions';
import type { CampaignDetail, Viewer } from '../../../../src/features/campaigns/campaigns.api';

// the wallet is the app's own (Privy); these specs only draw the panel, so it has none
vi.mock('@privy-io/react-auth', () => ({ useWallets: () => ({ wallets: [] }) }));

const CAMPAIGN = {
  address: '0x0000000000000000000000000000000000000001',
  status: 'funding',
  fundingDeadlinePassed: false,
} as CampaignDetail;

const VIEWER: Viewer = {
  role: 'donor',
  walletAddress: '0x71c7',
  contributedAmount: '0',
  refundedAmount: '0',
};

const show = (campaign: CampaignDetail, viewer: Viewer, onRetryWallet = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CampaignActions
          campaign={campaign}
          viewer={viewer}
          amount={100}
          onRetryWallet={onRetryWallet}
          onReread={() => Promise.resolve(undefined)}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('CampaignActions', () => {
  it('titles the panel and, for a donor in an open funding, draws D04 with the chosen amount', () => {
    show(CAMPAIGN, VIEWER);

    expect(screen.getByRole('heading', { name: 'Campaign actions' })).toBeInTheDocument();
    expect(screen.queryByText('Campaign read-only for this account.')).toBeNull();
    expect(screen.getByRole('textbox')).toHaveValue('100');
    expect(screen.getByRole('button', { name: 'Contribute' })).toBeEnabled();
  });

  it('offers Start refund once the deadline passed, and no D04', () => {
    show({ ...CAMPAIGN, fundingDeadlinePassed: true }, VIEWER);

    expect(screen.getByRole('button', { name: 'Start refund' })).toBeEnabled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('replaces the action with the wallet callout, and Try again calls back', async () => {
    const onRetryWallet = vi.fn();

    show(
      { ...CAMPAIGN, fundingDeadlinePassed: true },
      { ...VIEWER, walletAddress: null },
      onRetryWallet,
    );

    expect(screen.queryByRole('button', { name: 'Start refund' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetryWallet).toHaveBeenCalledTimes(1);
  });

  it('links an operator to operations and says nothing is read-only', () => {
    show(CAMPAIGN, { ...VIEWER, role: 'operator' });

    expect(screen.getByRole('link', { name: 'Open operations' })).toHaveAttribute(
      'href',
      `/app/operator/campaigns/${CAMPAIGN.address}`,
    );
    expect(screen.queryByText('Campaign read-only for this account.')).toBeNull();
  });

  it('tells a donor of an active campaign to follow the report, and an auditor it is read-only', () => {
    const { unmount } = show({ ...CAMPAIGN, status: 'active' }, VIEWER);

    expect(
      screen.getByText('Funding complete. Follow the campaign impact report.'),
    ).toBeInTheDocument();
    unmount();
    show(CAMPAIGN, { ...VIEWER, role: 'auditor' });
    expect(screen.getByText('Campaign read-only for this account.')).toBeInTheDocument();
  });
});
