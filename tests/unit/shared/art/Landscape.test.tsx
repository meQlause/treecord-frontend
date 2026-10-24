import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Landscape } from '../../../../src/shared/art/Landscape';
import { StubObserver } from '../../observer';

const svgOf = (container: HTMLElement): SVGSVGElement =>
  container.querySelector('svg') as SVGSVGElement;

describe('Landscape', () => {
  it('is decorative and draws the forest by default', () => {
    const { container } = render(<Landscape />);
    const svg = svgOf(container);

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('landscape');
    expect(svg).not.toHaveClass('hero-art');
    expect(svg.querySelector('rect')).toHaveAttribute('fill', '#dce4d3');
    expect(container.querySelectorAll('.tree-sway')).toHaveLength(5);
  });

  it('paints each kind on its own sky', () => {
    const { container } = render(<Landscape kind="lagoon" />);

    expect(container.querySelector('rect')).toHaveAttribute('fill', '#d7e6df');
  });

  it('adds the gust of leaves only for the hero', () => {
    const plain = render(<Landscape />);

    expect(plain.container.querySelector('.gust')).toBeNull();
    plain.unmount();

    const hero = render(<Landscape hero />);

    expect(svgOf(hero.container)).toHaveClass('landscape', 'hero-art');
    expect(hero.container.querySelectorAll('.gust-leaf')).toHaveLength(6);
  });

  it('adds water to coast and lagoon and fruit to orchard and avocado, not to the forest', () => {
    const coast = render(<Landscape kind="coast" />);

    expect(coast.container.querySelector('.water-lines')).not.toBeNull();
    coast.unmount();

    const orchard = render(<Landscape kind="orchard" />);

    expect(orchard.container.querySelector('.water-lines')).toBeNull();
    expect(orchard.container.querySelectorAll('ellipse[rx="4"]').length).toBeGreaterThan(0);
    orchard.unmount();

    const forest = render(<Landscape kind="forest" />);

    expect(forest.container.querySelectorAll('ellipse[rx="4"]')).toHaveLength(0);
  });

  it('paints avocado fruit darker than orchard fruit', () => {
    const avocado = render(<Landscape kind="avocado" />);
    const fruit = avocado.container.querySelector('g[fill="#244a30"]');

    expect(fruit).not.toBeNull();
  });

  it('gives every tree its own sway delay so the grove does not move in lockstep', () => {
    const { container } = render(<Landscape />);
    const delays = Array.from(container.querySelectorAll<SVGElement>('.tree-sway')).map((tree) =>
      tree.style.getPropertyValue('--delay'),
    );

    expect(new Set(delays).size).toBe(delays.length);
  });

  it('pauses its loops off screen and stops watching once removed', () => {
    const { container, unmount } = render(<Landscape />);
    const svg = svgOf(container);
    const observer = StubObserver.watching(svg) as StubObserver;

    observer.report(svg, false);
    expect(svg).toHaveClass('offscreen');
    observer.report(svg, true);
    expect(svg).not.toHaveClass('offscreen');

    unmount();
    expect(StubObserver.watching(svg)).toBeUndefined();
  });
});
