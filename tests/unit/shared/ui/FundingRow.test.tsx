import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FundingRow } from '../../../../src/shared/ui/FundingRow';
import type { RenderGlyph } from '../../../../src/shared/ui/HealthForest';

const glyph: RenderGlyph = ({ kind, x }) => <circle data-kind={kind} cx={x} />;
const kinds = (container: HTMLElement): string[] =>
  [...container.querySelectorAll('[data-kind]')].map(
    (node) => node.getAttribute('data-kind') ?? '',
  );

describe('FundingRow', () => {
  it('draws fourteen trees: planted, funded, then still to come', () => {
    const { container } = render(<FundingRow funded={0.5} planted={0.25} glyph={glyph} />);
    const drawn = kinds(container);

    expect(drawn).toHaveLength(14);
    expect(drawn.filter((kind) => kind === 'alive')).toHaveLength(4);
    expect(drawn.filter((kind) => kind === 'funded')).toHaveLength(3);
    expect(drawn.filter((kind) => kind === 'planned')).toHaveLength(7);
    expect(drawn.indexOf('funded')).toBeGreaterThan(drawn.lastIndexOf('alive'));
  });

  it('draws only outlines before any funding', () => {
    const { container } = render(<FundingRow funded={0} planted={0} glyph={glyph} />);

    expect(new Set(kinds(container))).toEqual(new Set(['planned']));
  });

  it('is decorative and its bar is as wide as the funded share', () => {
    const { container } = render(<FundingRow funded={0.5} planted={0} glyph={glyph} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.grow')).toHaveAttribute('width', '156');
  });
});
