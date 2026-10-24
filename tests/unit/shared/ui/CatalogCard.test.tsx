import { render, screen } from '@testing-library/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CatalogCard } from '../../../../src/shared/ui/CatalogCard';

const card = (extra: Partial<Parameters<typeof CatalogCard>[0]> = {}) => (
  <MemoryRouter>
    <CatalogCard
      to="/campaigns/0xabc"
      art={<i>art</i>}
      tags={<span>Funding</span>}
      location="Demak"
      title="Mangrove Demak"
      cta="View campaign"
      ctaLabel="View campaign: Mangrove Demak"
      {...extra}
    >
      <p>rows</p>
    </CatalogCard>
  </MemoryRouter>
);

describe('CatalogCard', () => {
  it('shows tags, location, title and the detail rows', () => {
    render(card());

    expect(screen.getByText('Funding')).toBeInTheDocument();
    expect(screen.getByText('Demak')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mangrove Demak' })).toBeInTheDocument();
    expect(screen.getByText('rows')).toBeInTheDocument();
  });

  it('links the title and the footer to the record, the footer named after it', () => {
    render(card());

    expect(screen.getByRole('link', { name: 'Mangrove Demak' })).toHaveAttribute(
      'href',
      '/campaigns/0xabc',
    );
    expect(screen.getByRole('link', { name: 'View campaign: Mangrove Demak' })).toHaveAttribute(
      'href',
      '/campaigns/0xabc',
    );
  });

  it('hides the art link from keyboards and assistive tech, since the title links the same place', () => {
    render(card());

    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(2);
    expect(screen.getByText('art').closest('a')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('art').closest('a')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the mockup class and adds the screen modifier', () => {
    render(card({ className: 'cb-batch-card' }));

    expect(screen.getByRole('article')).toHaveClass('campaign-card', 'cb-batch-card');
  });

  it('leaves out the tags and location it was not given', () => {
    const { container } = render(card({ tags: undefined, location: undefined }));

    expect(container.querySelector('.art-tags')).toBeNull();
    expect(container.querySelector('.location')).toBeNull();
  });
});
