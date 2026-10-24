import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHead } from '../../../../src/shared/ui/PageHead';

describe('PageHead', () => {
  it('shows eyebrow, a two-line title and the art with its coordinate', () => {
    render(
      <PageHead
        eyebrow="MY CARBON"
        title="Your carbon,"
        em="accounted for."
        art={<i>scene</i>}
        coord="03 / PROOF"
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your carbon,accounted for.',
    );
    expect(screen.getByText('MY CARBON')).toBeInTheDocument();
    expect(screen.getByText('scene')).toBeInTheDocument();
    expect(screen.getByText('03 / PROOF')).toHaveClass('hero-coordinate');
  });

  it('leaves the art column out while there is no art (a record still loading)', () => {
    const { container } = render(<PageHead eyebrow="BATCH" title="Batch" em="#12" inline />);

    expect(container.querySelector('.heading-art')).toBeNull();
    expect(container.querySelector('br')).toBeNull();
  });

  it('adds the mockup page modifier and renders children under the title', () => {
    const { container } = render(
      <PageHead eyebrow="TREE" title="Tree" em="#7" className="cb-batch-heading">
        <p>lead</p>
      </PageHead>,
    );

    expect(container.firstElementChild).toHaveClass(
      'page-heading',
      'cb-page-heading',
      'cb-batch-heading',
    );
    expect(screen.getByText('lead')).toBeInTheDocument();
  });
});
