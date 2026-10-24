import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Brand } from '../../../../src/app/shell/Brand';

describe('Brand', () => {
  it('is a plain link to the landing project, named "Treecord home"', () => {
    render(<Brand />);

    const link = screen.getByRole('link', { name: 'Treecord home' });

    expect(link).toHaveAttribute('href', '/landing/');
    expect(link).toHaveTextContent('treecord.');
  });
});
