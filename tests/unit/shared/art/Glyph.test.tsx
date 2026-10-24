import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FacetTree, Glyph, type GlyphKind } from '../../../../src/shared/art/Glyph';

const draw = (kind: GlyphKind): Element => {
  const { container } = render(
    <svg>
      <Glyph kind={kind} x={10} y={20} scale={2} />
    </svg>,
  );

  return container.querySelector('g') as Element;
};

describe('Glyph', () => {
  it('stands where it is told, at the scale it is told', () => {
    expect(draw('alive')).toHaveAttribute('transform', 'translate(10 20) scale(2)');
  });

  it('defaults to scale 1', () => {
    const { container } = render(
      <svg>
        <Glyph kind="alive" x={0} y={0} />
      </svg>,
    );

    expect(container.querySelector('g')).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  });

  it('draws a tree for alive and completed, in different greens', () => {
    const alive = draw('alive').querySelectorAll('polygon');
    const done = draw('completed').querySelectorAll('polygon');

    expect(alive).toHaveLength(2);
    expect(done[0]?.getAttribute('fill')).not.toBe(alive[0]?.getAttribute('fill'));
  });

  it('marks completed with a gold coin and flagged with a flag', () => {
    expect(draw('completed').querySelector('circle')).not.toBeNull();
    expect(draw('flagged').querySelectorAll('path')).toHaveLength(2);
    expect(draw('alive').querySelector('circle')).toBeNull();
  });

  it('shows dead as a stump, removed as a dashed ring, planned as a dashed outline, funded faded', () => {
    expect(draw('dead').querySelectorAll('polygon')).toHaveLength(0);
    expect(draw('dead').querySelectorAll('path')).toHaveLength(2);
    expect(draw('removed').querySelector('ellipse')).toHaveAttribute('stroke-dasharray', '2 1.6');
    expect(draw('planned').querySelector('g')).toHaveAttribute('stroke-dasharray', '2 1.6');
    expect(draw('funded').querySelector('g')).toHaveAttribute('opacity', '.45');
  });
});

describe('FacetTree', () => {
  it('places four facets and a trunk, and hangs a loop class on the tree itself', () => {
    const { container } = render(
      <svg>
        <FacetTree x={5} y={6} scale={1.5} className="dg-grove" />
      </svg>,
    );

    expect(container.querySelector('g')).toHaveAttribute('transform', 'translate(5 6) scale(1.5)');
    expect(container.querySelectorAll('.dg-grove polygon')).toHaveLength(4);
  });
});
