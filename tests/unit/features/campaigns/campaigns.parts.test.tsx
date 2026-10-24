import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { MemoryRouter } from 'react-router';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CampaignItem } from '../../../../src/features/campaigns/campaigns.api';
import {
  CampaignCard,
  CatalogMessage,
  RegionField,
} from '../../../../src/features/campaigns/campaigns.parts';

const ITEM: CampaignItem = {
  address: '0x0000000000000000000000000000000000000001',
  status: 'completed',
  title: 'Back to the mangroves',
  species: null,
  region: null,
  treeTarget: 900,
  commitmentUnits: 36,
  fundingTarget: '9000000000',
  fundedAmount: '9000000000',
  progressBps: 10000,
  daysLeft: null,
  fundingDeadlinePassed: false,
};

describe('CampaignCard', () => {
  it('leaves out a missing species and region and draws forest art', () => {
    const { container } = render(
      <MemoryRouter>
        <CampaignCard item={ITEM} index={0} />
      </MemoryRouter>,
    );

    expect(container.querySelector('.species-label')).toBeNull();
    expect(container.querySelector('.location')).toBeNull();
    expect(screen.getByText('Commitment complete')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(
      screen.getByRole('link', { name: 'View campaign: Back to the mangroves' }),
    ).toHaveAttribute('href', `/campaigns/${ITEM.address}`);
  });
});

describe('RegionField', () => {
  function Host({ onCommit }: { onCommit: (region: string) => void }) {
    const [committed, setCommitted] = useState('');

    return (
      <RegionField
        committed={committed}
        onCommit={(region) => {
          setCommitted(region);
          onCommit(region);
        }}
      />
    );
  }

  it('commits the trimmed text once typing pauses, and Clear region at once', async () => {
    const onCommit = vi.fn();

    render(<Host onCommit={onCommit} />);
    await userEvent.type(screen.getByLabelText('Filter by region'), ' java ');
    expect(onCommit).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onCommit).toHaveBeenCalledWith('java'));
    expect(onCommit).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Clear region' }));
    expect(onCommit).toHaveBeenLastCalledWith('');
    expect(screen.getByLabelText('Filter by region')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear region' })).toBeNull();
  });
});

describe('CatalogMessage', () => {
  it.each([
    ['empty', 'The next forest starts here', null],
    ['filtered-empty', 'No matching campaigns', 'Clear filters'],
    ['error', 'Couldn’t load campaigns', 'Try again'],
  ] as const)('%s says %s', async (view, title, button) => {
    const onClear = vi.fn();
    const onRetry = vi.fn();

    render(<CatalogMessage view={view} onClear={onClear} onRetry={onRetry} />);

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();

    if (button === null) {
      expect(screen.queryByRole('button')).toBeNull();

      return;
    }

    await userEvent.click(screen.getByRole('button', { name: button }));
    expect(view === 'error' ? onRetry : onClear).toHaveBeenCalledTimes(1);
  });
});
