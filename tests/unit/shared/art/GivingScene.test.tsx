import { act, render, screen, waitFor } from '@testing-library/react';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GivingScene, formatCount } from '../../../../src/shared/art/GivingScene';
import { StubObserver } from '../../observer';
import { motionOn } from './motionOn';

// jsdom has no SVG geometry (no getCTM), which MotionPath needs to put a coin on its path; the coin's flight is
// checked by eye, here the plugin is a stand-in that animates nothing.
vi.mock('gsap/MotionPathPlugin', () => ({
  MotionPathPlugin: { name: 'motionPath', init: () => false },
}));

let restore = (): void => undefined;

beforeEach(() => {
  restore = motionOn();
});
afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

const CAPTIONS = ['CONTRIBUTED', 'CAMPAIGNS', 'TO PLANTERS'] as const;
const VALUES = [12345.6, 3, 4000] as const;
const LABEL = '12,346 contributed to 3 campaigns';

const scene = (props: Partial<Parameters<typeof GivingScene>[0]> = {}) => (
  <GivingScene values={VALUES} captions={CAPTIONS} label={LABEL} {...props} />
);

describe('GivingScene', () => {
  it('is informative art that says what it shows', () => {
    render(scene());

    expect(screen.getByRole('img', { name: LABEL })).toHaveClass('dg-art');
  });

  it('writes the three figures with the caller’s captions, the campaign count as a plain integer', () => {
    const { container } = render(scene());
    const figures = Array.from(container.querySelectorAll('.dg-fig'));

    expect(figures.map((figure) => figure.textContent)).toEqual([
      '12,346CONTRIBUTED',
      '3CAMPAIGNS',
      '4,000TO PLANTERS',
    ]);
  });

  it('lets the caller write the money figures but not the campaign count', () => {
    const { container } = render(scene({ format: (value) => `$${value.toFixed(1)}` }));

    expect(container.querySelector('.dg-n0')).toHaveTextContent('$12345.6');
    expect(container.querySelector('.dg-n1')).toHaveTextContent('3');
    expect(container.querySelector('.dg-n2')).toHaveTextContent('$4000.0');
  });

  it('marks one plot per campaign, between 1 and 5', () => {
    const pins = (container: HTMLElement): number =>
      container.querySelectorAll('.dg-plot-pin').length;

    expect(pins(render(scene()).container)).toBe(3);
    expect(pins(render(scene({ plots: 99 })).container)).toBe(5);
    expect(pins(render(scene({ plots: 0 })).container)).toBe(1);
  });

  it('keeps the planters faint until something has been paid to them', () => {
    const paid = render(scene()).container;
    const unpaid = render(scene({ values: [10, 1, 0] })).container;

    expect(paid.querySelector('.dg-sprout')?.parentElement).toHaveAttribute('opacity', '1');
    expect(unpaid.querySelector('.dg-sprout')?.parentElement).toHaveAttribute('opacity', '0.3');
  });

  it('counts each figure up from zero to the figure that is written', () => {
    const counters = vi.spyOn(gsap, 'to');
    const { container } = render(scene());
    const tweens = counters.mock.results.map((result) => result.value as gsap.core.Tween);

    expect(tweens).toHaveLength(3);
    tweens.forEach((tween) => tween.progress(0));
    expect(
      Array.from(container.querySelectorAll('[class^="dg-n"]')).map((node) => node.textContent),
    ).toEqual(['0', '0', '0']);
    tweens.forEach((tween) => tween.progress(1));
    expect(container.querySelector('.dg-n0')).toHaveTextContent('12,346');
    expect(container.querySelector('.dg-n2')).toHaveTextContent('4,000');
  });

  it('shows the written figures and plays nothing when motion is not allowed', () => {
    restore();
    const timelines = vi.spyOn(gsap, 'timeline');
    const { container } = render(scene());

    expect(timelines).not.toHaveBeenCalled();
    expect(container.querySelector('.dg-n0')).toHaveTextContent('12,346');
  });

  it('loops one timeline that Pause motion and off screen both stop', async () => {
    const timelines = vi.spyOn(gsap, 'timeline');
    const { container } = render(<div className="app">{scene()}</div>);
    const timeline = timelines.mock.results[0]?.value as gsap.core.Timeline;
    const svg = container.querySelector('svg') as SVGSVGElement;

    expect(timeline.repeat()).toBe(-1);
    act(() => container.querySelector('.app')?.classList.add('motion-paused'));
    await waitFor(() => expect(timeline.paused()).toBe(true));
    act(() => container.querySelector('.app')?.classList.remove('motion-paused'));
    await waitFor(() => expect(timeline.paused()).toBe(false));
    act(() => (StubObserver.watching(svg) as StubObserver).report(svg, false));
    expect(timeline.paused()).toBe(true);
  });

  it('cleans up the motion gate on unmount', () => {
    const { container, unmount } = render(scene());
    const svg = container.querySelector('svg') as SVGSVGElement;

    unmount();
    expect(StubObserver.watching(svg)).toBeUndefined();
  });
});

describe('formatCount', () => {
  it('rounds to a whole number with thousands separators', () => {
    expect(formatCount(1234567.4)).toBe('1,234,567');
    expect(formatCount(0)).toBe('0');
  });
});
