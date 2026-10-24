import { act, render, screen, waitFor } from '@testing-library/react';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TreesScene, type TreesTotals } from '../../../../src/shared/art/TreesScene';
import { StubObserver } from '../../observer';
import { motionOn } from './motionOn';

let restore = (): void => undefined;

beforeEach(() => {
  restore = motionOn();
});
afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

const CAPTIONS = ['PLANTED', 'SURVIVAL', 'OPEN FLAGS'] as const;
const LABEL = '1,200 planted; survival 87.5%; 2 open flags';
const TOTALS: TreesTotals = { planted: 1200, survival: 87.5, flags: 2 };

const draw = (totals: TreesTotals = TOTALS): HTMLElement =>
  render(<TreesScene totals={totals} captions={CAPTIONS} label={LABEL} />).container;

describe('TreesScene', () => {
  it('is informative art that says what it shows', () => {
    draw();

    expect(screen.getByRole('img', { name: LABEL })).toHaveClass('dg-art');
  });

  it('writes planted, survival and open flags with the caller’s captions', () => {
    const figures = Array.from(draw().querySelectorAll('.dg-fig')).map(
      (figure) => figure.textContent,
    );

    expect(figures).toEqual(['1,200PLANTED', '87.5%SURVIVAL', '2OPEN FLAGS']);
  });

  it('shows a dash for survival while there is nothing to measure, and counts only the other two up', () => {
    const counters = vi.spyOn(gsap, 'to');
    const container = draw({ planted: 0, survival: null, flags: 0 });

    expect(container.querySelector('.dg-n1')).toHaveTextContent('—');
    expect(counters).toHaveBeenCalledTimes(2);
  });

  it('lets the grove grow when trees are planted, and leaves a faint outline when none are', () => {
    expect(draw().querySelectorAll('.dg-grove')).toHaveLength(8);
    expect(
      draw({ planted: 0, survival: null, flags: 0 }).querySelectorAll('g[opacity="0.22"]'),
    ).toHaveLength(8);
  });

  it('draws the ring to the survival share of its circumference', () => {
    const [drawn, circumference] = (
      draw().querySelector('.dg-ring')?.getAttribute('stroke-dasharray') ?? ''
    )
      .split(' ')
      .map(Number) as [number, number];

    expect(drawn / circumference).toBeCloseTo(0.875);
  });

  it('draws one flag per open flag up to three, and one faint tree when there are none', () => {
    expect(draw({ ...TOTALS, flags: 2 }).querySelectorAll('.dg-flag')).toHaveLength(2);
    expect(draw({ ...TOTALS, flags: 9 }).querySelectorAll('.dg-flag')).toHaveLength(3);

    const none = draw({ ...TOTALS, flags: 0 });

    expect(none.querySelectorAll('.dg-flag')).toHaveLength(1);
    expect(none.querySelector('.dg-flag')?.parentElement?.parentElement).toHaveAttribute(
      'opacity',
      '0.35',
    );
  });

  it('pins each flag’s pivot to its pole when motion is allowed', () => {
    const container = draw({ ...TOTALS, flags: 1 });
    const flag = container.querySelector('.dg-flag') as SVGElement;

    expect(flag.dataset['origin']).toBe('442 89');
  });

  it('loops one timeline that Pause motion and off screen both stop', async () => {
    const timelines = vi.spyOn(gsap, 'timeline');
    const { container } = render(
      <div className="app">
        <TreesScene totals={TOTALS} captions={CAPTIONS} label={LABEL} />
      </div>,
    );
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

  it('plays nothing and shows the written figures when motion is not allowed', () => {
    restore();
    const timelines = vi.spyOn(gsap, 'timeline');
    const container = draw();

    expect(timelines).not.toHaveBeenCalled();
    expect(container.querySelector('.dg-n0')).toHaveTextContent('1,200');
  });

  it('cleans up the motion gate on unmount', () => {
    const { container, unmount } = render(
      <TreesScene totals={TOTALS} captions={CAPTIONS} label={LABEL} />,
    );
    const svg = container.querySelector('svg') as SVGSVGElement;

    unmount();
    expect(StubObserver.watching(svg)).toBeUndefined();
  });
});
