import { render, screen } from '@testing-library/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ArrowLink } from '../../../../src/shared/ui/ArrowLink';

describe('ArrowLink', () => {
  it('is a router link with a trailing arrow', () => {
    const { container } = render(
      <MemoryRouter>
        <ArrowLink to="/app/campaigns">All campaigns</ArrowLink>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'All campaigns' })).toHaveAttribute(
      'href',
      '/app/campaigns',
    );
    expect(container.querySelector('a > .ic--arrow')).not.toBeNull();
  });

  it('passes other link attributes through', () => {
    render(
      <MemoryRouter>
        <ArrowLink to="/x" className="pl-alt" title="Go">
          Go
        </ArrowLink>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link')).toHaveClass('pl-alt');
    expect(screen.getByRole('link')).toHaveAttribute('title', 'Go');
  });
});
