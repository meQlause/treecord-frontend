import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CarbonFunnel } from '../../../../src/shared/ui/CarbonFunnel';

const widths = (container: HTMLElement): number[] =>
  [...container.querySelectorAll('rect')].map((bar) => Number(bar.getAttribute('width')));

describe('CarbonFunnel', () => {
  it('draws one bar per stage, as wide as its amount (by area)', () => {
    const { container } = render(
      <CarbonFunnel
        rows={[
          ['Estimate', 100],
          ['Reserved', 25],
          ['Allocated', 1],
          ['Held', 0],
        ]}
      />,
    );

    expect(widths(container)).toEqual([200, 100, 20, 6]);
  });

  it('draws the minimum bar for a stage with no amount yet', () => {
    const { container } = render(
      <CarbonFunnel
        rows={[
          ['Estimate', 10],
          ['Reserved', null],
        ]}
      />,
    );

    expect(widths(container)).toEqual([200, 6]);
  });

  it('copes with no rows and is decorative', () => {
    const { container } = render(<CarbonFunnel rows={[]} />);

    expect(widths(container)).toEqual([]);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
