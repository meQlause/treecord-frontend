import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import {
  BudgetChart,
  FactStrip,
  Hero,
  MilestoneTrack,
  PlotGrid,
} from '../../../../src/features/campaigns/campaign.parts';
import type { CampaignDetail } from '../../../../src/features/campaigns/campaigns.api';

const BUDGET = [
  { bucket: 'incentives', bps: 7000, amount: '7000000000' },
  { bucket: 'seedlings', bps: 1000, amount: '1000000000' },
  { bucket: 'fee', bps: 500, amount: '500000000' },
];

const CAMPAIGN = {
  status: 'funding',
  title: 'A new tide for Demak',
  species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
  region: { name: 'Demak, Central Java', radiusM: 2500 },
  commitmentUnits: 36,
  chainId: 84532,
} as unknown as CampaignDetail;

describe('BudgetChart', () => {
  it('lights the pointed row and its segment, dims the rest, and clears on leave', async () => {
    const { container } = render(<BudgetChart budget={BUDGET} />);
    const chart = container.querySelector('.budget-chart');
    const seedlings = screen.getByText('Seedlings').closest('li');

    expect(chart).not.toHaveClass('has-active');
    await userEvent.hover(seedlings as HTMLElement);
    expect(seedlings).toHaveClass('active');
    expect(container.querySelector('.budget-stack .budget-1')).toHaveClass('active');
    expect(chart).toHaveClass('has-active');
    expect(container.querySelectorAll('li.active')).toHaveLength(1);

    await userEvent.unhover(seedlings as HTMLElement);
    expect(container.querySelectorAll('.active')).toHaveLength(0);
  });

  it('lights a row when it takes focus and clears when it loses it', async () => {
    render(<BudgetChart budget={BUDGET} />);
    const fee = screen.getByText('Platform fee').closest('li') as HTMLElement;

    act(() => fee.focus());
    expect(fee).toHaveClass('active');
    act(() => fee.blur());
    expect(fee).not.toHaveClass('active');
  });

  it('prints each share and amount, and labels only segments of 10% or more', () => {
    const { container } = render(<BudgetChart budget={BUDGET} />);

    expect(screen.getByText('7,000')).toBeInTheDocument();
    expect(screen.getByText('70%', { selector: '.budget-share' })).toBeInTheDocument();
    expect(container.querySelectorAll('.budget-stack em')).toHaveLength(2);
  });
});

describe('MilestoneTrack', () => {
  it('draws one stop per payout with its month and share', () => {
    const schedule = [
      { milestone: 0, month: 0, bps: 1000 },
      { milestone: 1, month: 12, bps: 1500 },
      { milestone: 2, month: 36, bps: 4000 },
    ];
    const { container } = render(<MilestoneTrack schedule={schedule} />);

    expect([...container.querySelectorAll('.track-month')].map((node) => node.textContent)).toEqual(
      ['Plant', 'M12', 'M36'],
    );
    expect([...container.querySelectorAll('.track-share')].map((node) => node.textContent)).toEqual(
      ['10%', '15%', '40%'],
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(/^Three incentive payouts over 36 months/);
  });
});

describe('PlotGrid', () => {
  it('fills one tree per percent: anchor first, planted within', () => {
    const slots = { anchor: 250, open: 750, planted: 500, openAvailable: 750 };
    const { container } = render(<PlotGrid slots={slots} trees={1000} />);

    expect(container.querySelectorAll('.plot-tree')).toHaveLength(100);
    expect(container.querySelectorAll('.plot-tree.anchor')).toHaveLength(25);
    expect(container.querySelectorAll('.plot-tree.planted')).toHaveLength(50);
    expect(screen.getByText('Anchor slots').closest('div')).toHaveTextContent('250');
    expect(screen.getByText('Planted').closest('div')).toHaveTextContent('500');
  });

  it('does not divide by a campaign without trees', () => {
    const { container } = render(
      <PlotGrid slots={{ anchor: 0, open: 0, planted: 0, openAvailable: 0 }} trees={0} />,
    );

    expect(container.querySelectorAll('.plot-tree.planted')).toHaveLength(0);
  });
});

describe('Hero and FactStrip', () => {
  const renderHero = (campaign: CampaignDetail) =>
    render(
      <MemoryRouter>
        <Hero campaign={campaign} />
      </MemoryRouter>,
    );

  it('wraps a title of 120 characters instead of cutting it', () => {
    const title = 'x'.repeat(120);
    const { container } = renderHero({ ...CAMPAIGN, title });

    expect(container.querySelector('.detail-hero')).toHaveClass('wrap-title');
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('wrap-any');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
  });

  it('puts the placeholder in an untitled campaign’s h1 and leaves out a missing species and region', () => {
    const { container } = renderHero({ ...CAMPAIGN, title: null, species: null, region: null });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/\S/);
    expect(container.querySelector('.hero-species')).toBeNull();
    expect(container.querySelector('.hero-location')).toBeNull();
  });

  it('shows a dash for an unknown radius', () => {
    render(<FactStrip campaign={{ ...CAMPAIGN, region: null }} trees={1000} />);

    expect(screen.getByText('Region radius').nextSibling).toHaveTextContent('—');
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });
});
