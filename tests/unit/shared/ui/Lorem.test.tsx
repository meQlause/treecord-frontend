import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Lorem } from '../../../../src/shared/ui/Lorem';

describe('Lorem', () => {
  it('shows the approved text and marks the COPY id', () => {
    render(<Lorem id="COPY-001" />);

    expect(
      screen.getByText('Some details aren’t valid. Check them and try again.'),
    ).toHaveAttribute('data-copy', 'COPY-001');
  });

  it('fills the slots from values', () => {
    render(<Lorem id="COPY-154" values={{ amount: '4' }} />);

    expect(screen.getByText('Not enough USDC in your wallet for 4 USDC.')).toBeInTheDocument();
  });
});
