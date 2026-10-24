import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NetworkLabel } from '../../../../src/app/shell/NetworkLabel';

describe('NetworkLabel', () => {
  it('names the chain', () => {
    render(<NetworkLabel />);

    expect(screen.getByText('Base Sepolia')).toBeInTheDocument();
  });
});
