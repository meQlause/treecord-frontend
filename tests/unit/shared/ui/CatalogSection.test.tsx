import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CatalogSection } from '../../../../src/shared/ui/CatalogSection';

const FILTERS = ['All', 'Funding', 'Active'];

describe('CatalogSection', () => {
  it('names the section by its title and shows the kicker and the cards', () => {
    render(
      <CatalogSection title="Campaigns" kicker="Plant something" meta="3 campaigns">
        <p>cards</p>
      </CatalogSection>,
    );

    expect(screen.getByRole('region', { name: 'Campaigns' })).toBeInTheDocument();
    expect(screen.getByText('Plant something')).toBeInTheDocument();
    expect(screen.getByText('cards')).toBeInTheDocument();
  });

  it('announces the result count politely', () => {
    render(
      <CatalogSection title="Campaigns" kicker="k" meta="3 campaigns" aside="Newest first">
        <p>cards</p>
      </CatalogSection>,
    );

    expect(screen.getByText('3 campaigns')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Newest first')).toBeInTheDocument();
  });

  it('marks the chosen filter as pressed and reports a click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CatalogSection
        title="Campaigns"
        kicker="k"
        meta="m"
        filters={FILTERS}
        filtersLabel="Campaign status"
        value="Funding"
        onChange={onChange}
      >
        <p>cards</p>
      </CatalogSection>,
    );
    const group = screen.getByRole('group', { name: 'Campaign status' });

    expect(screen.getByRole('button', { name: 'Funding' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(group).toContainElement(screen.getByRole('button', { name: 'Active' }));

    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(onChange).toHaveBeenCalledWith('Active');
  });

  it('shows the secondary fields beside the filters, and no filter bar when there are none', () => {
    const { container, rerender } = render(
      <CatalogSection
        title="Campaigns"
        kicker="k"
        meta="m"
        secondary={<input aria-label="Region" />}
      >
        <p>cards</p>
      </CatalogSection>,
    );

    expect(screen.getByRole('textbox', { name: 'Region' })).toBeInTheDocument();

    rerender(
      <CatalogSection title="Campaigns" kicker="k" meta="m">
        <p>cards</p>
      </CatalogSection>,
    );
    expect(container.querySelector('.filter-bar')).toBeNull();
  });

  it('leaves the results row out when there is no count yet', () => {
    const { container } = render(
      <CatalogSection title="Issued batches" kicker="k">
        <p>loading</p>
      </CatalogSection>,
    );

    expect(container.querySelector('.results-meta')).toBeNull();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });
});
