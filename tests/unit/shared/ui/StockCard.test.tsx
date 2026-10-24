import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockCard } from '../../../../src/shared/ui/StockCard';

const card = (share: number, unit?: string) => (
  <StockCard
    label="Batch stock"
    icon="carbon"
    caption="Available inventory"
    value="1,200"
    unit="tCO₂e"
    sub={{ label: 'Total issued', value: '2,000', ...(unit === undefined ? {} : { unit }) }}
    share={share}
    shareLabel="Still available"
    shareNote="Batch #1"
    note="Issued credits only."
  />
);

describe('StockCard', () => {
  it('is a named region with the balance, the second figure and the note', () => {
    render(card(0.6));

    expect(screen.getByRole('region', { name: 'Batch stock' })).toBeInTheDocument();
    expect(screen.getByText('Available inventory')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('Total issued')).toBeInTheDocument();
    expect(screen.getByText('Issued credits only.')).toBeInTheDocument();
  });

  it('gives the second figure the balance unit unless it has its own', () => {
    const { unmount } = render(card(0.6));

    expect(screen.getByText('2,000', { exact: false })).toHaveTextContent('2,000 tCO₂e');
    unmount();
    render(card(0.6, 'USDC'));
    expect(screen.getByText('2,000', { exact: false })).toHaveTextContent('2,000 USDC');
  });

  it('reports the share as a progress bar and as text', () => {
    render(card(0.6));

    expect(screen.getByRole('progressbar', { name: 'Still available' })).toHaveAttribute(
      'aria-valuenow',
      '60',
    );
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('keeps one decimal under 10 % so a sliver does not read as 0 %', () => {
    render(card(0.034));

    expect(screen.getByText('3.4%')).toBeInTheDocument();
  });

  it('shows a full and an empty share', () => {
    const { unmount } = render(card(1));

    expect(screen.getByText('100%')).toBeInTheDocument();
    unmount();
    render(card(0));
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});
