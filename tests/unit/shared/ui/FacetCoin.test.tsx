import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FacetCoin } from '../../../../src/shared/ui/FacetCoin';

const coin = (props: Partial<Parameters<typeof FacetCoin>[0]> = {}) =>
  render(
    <svg>
      <FacetCoin cx={30} cy={28} r={20} id="one" {...props} />
    </svg>,
  ).container;

describe('FacetCoin', () => {
  it('moves and scales the coin to the given centre and radius', () => {
    const group = coin().querySelector('g');

    expect(group).toHaveAttribute('transform', 'translate(30 28) scale(0.5)');
  });

  it('names its clip path by id, so two coins never share one', () => {
    const container = coin({ id: 'hero' });

    expect(container.querySelector('clipPath')).toHaveAttribute('id', 'coin-hero');
    expect(container.querySelector('[clip-path="url(#coin-hero)"]')).not.toBeNull();
  });

  it('shines when lit', () => {
    expect(coin().querySelector('.ca-shine')).not.toBeNull();
  });

  it('goes grey and loses its shine when dim', () => {
    const container = coin({ dim: true });

    expect(container.querySelector('.ca-shine')).toBeNull();
    expect(container.querySelector('.ca-coin')).toHaveAttribute('opacity', '0.45');
  });
});
