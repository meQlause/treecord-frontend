import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  MilestoneBars,
  ReportArt,
  StatArt,
  type BarRow,
} from '../../../../src/features/reports/report.art';

const rows: BarRow[] = [
  { month: 0, payouts: 984, amount: '1,033.2', value: 1033.2 },
  { month: 3, payouts: 984, amount: '1,033.2', value: 1033.2 },
  { month: 6, payouts: 32, amount: '33.6', value: 33.6 },
  { month: 12, payouts: 0, amount: '0', value: 0 },
];

describe('MilestoneBars', () => {
  it('draws a column per month: paid ones with amount and count, the rest waiting', () => {
    const { container } = render(<MilestoneBars rows={rows} />);

    expect(container.querySelectorAll('g.rise')).toHaveLength(6);
    expect(screen.getByText('M36')).toBeInTheDocument();
    expect(screen.getAllByText('984 paid')).toHaveLength(2);
    expect(screen.getByText('32 paid')).toBeInTheDocument();
    expect(screen.getAllByText('upcoming')).toHaveLength(3);
    expect(screen.getByText('33.6')).toBeInTheDocument();
  });

  it('names only the paid milestones for assistive tech', () => {
    render(<MilestoneBars rows={rows} />);

    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';

    expect(label).toContain('month 6, 32 payouts, 33.6 USDC');
    expect(label).not.toContain('month 12');
    expect(screen.getByText(/Recorded payouts by milestone · USDC/)).toBeInTheDocument();
  });
});

describe('StatArt', () => {
  it.each(['payout', 'carbon', 'evidence'] as const)(
    'draws the %s scene, hidden from assistive tech',
    (kind) => {
      const { container } = render(<StatArt kind={kind} />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass(`stat-art--${kind}`);
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    },
  );
});

describe('ReportArt', () => {
  it('is decorative', () => {
    const { container } = render(<ReportArt />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.rp-bar')).toHaveLength(4);
  });
});
