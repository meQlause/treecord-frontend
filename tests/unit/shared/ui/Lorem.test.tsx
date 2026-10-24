import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Lorem } from '../../../../src/shared/ui/Lorem';

describe('Lorem', () => {
  it('shows the lorem sentence and marks the COPY id', () => {
    render(<Lorem id="COPY-418" />);

    const copy = screen.getByText(/^Lorem ipsum dolor/);

    expect(copy).toHaveAttribute('data-copy', 'COPY-418');
    expect(copy).toHaveAttribute('title', 'COPY-418');
  });

  it('shows the short label for kind="label"', () => {
    render(<Lorem id="COPY-1" kind="label" />);

    expect(screen.getByText('Lorem ipsum')).toBeInTheDocument();
  });
});
