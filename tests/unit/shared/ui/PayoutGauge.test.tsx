import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PayoutGauge } from '../../../../src/shared/ui/PayoutGauge';

describe('PayoutGauge', () => {
  it('shows the paid share of the budget as a percentage', () => {
    render(<PayoutGauge paid={25} budget={100} />);

    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('never goes past full', () => {
    render(<PayoutGauge paid={150} budget={100} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('reads 0 % when there is no budget', () => {
    render(<PayoutGauge paid={5} budget={0} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
