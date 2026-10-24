import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from '../../../../src/app/shell/Footer';

describe('Footer', () => {
  it('has the brand link to the landing project, the line and the copyright (SH-AC24)', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'treecord.' })).toHaveAttribute('href', '/landing/');
    expect(screen.getByText('Every tree, proven.')).toBeInTheDocument();
    expect(screen.getByText('© 2026 Treecord')).toBeInTheDocument();
  });
});
