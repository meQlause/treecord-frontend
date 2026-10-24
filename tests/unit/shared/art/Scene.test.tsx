import { act, render, waitFor } from '@testing-library/react';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Scene } from '../../../../src/shared/art/Scene';
import { StubObserver } from '../../observer';
import { motionOn } from './motionOn';

let restore = (): void => undefined;

beforeEach(() => {
  restore = motionOn();
});
afterEach(() => restore());

const timelineBuild = () => {
  const made: gsap.core.Timeline[] = [];
  const build = vi.fn((select: (target: string) => Element[]) => {
    const timeline = gsap.timeline({ repeat: -1 }).to(select('.dot'), { x: 10, duration: 1 });

    made.push(timeline);

    return timeline;
  });

  return { build, made };
};

describe('Scene', () => {
  it('is a decorative 480x240 scene with the sky and its own drawing', () => {
    const { container } = render(
      <Scene build={() => gsap.timeline()}>
        <circle className="dot" r="3" />
      </Scene>,
    );
    const svg = container.querySelector('svg') as SVGSVGElement;

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('landscape', 'batch-art');
    expect(svg).toHaveAttribute('viewBox', '0 0 480 240');
    expect(svg.querySelectorAll('polygon')).toHaveLength(2);
    expect(svg.querySelector('.dot')).not.toBeNull();
  });

  it('builds the loop once, with a selector scoped to its own scene', () => {
    const { build } = timelineBuild();
    const { container } = render(
      <>
        <i className="dot" />
        <Scene build={build}>
          <circle className="dot" r="3" />
        </Scene>
      </>,
    );
    const select = build.mock.calls[0]?.[0] as (target: string) => Element[];

    expect(build).toHaveBeenCalledTimes(1);
    expect(select('.dot')).toEqual([container.querySelector('svg .dot')]);
  });

  it('does not build the loop when the visitor prefers reduced motion', () => {
    restore();
    const { build } = timelineBuild();

    render(<Scene build={build}>{null}</Scene>);
    expect(build).not.toHaveBeenCalled();
  });

  it('pauses the loop with Pause motion and plays it again', async () => {
    const { build, made } = timelineBuild();
    const { container } = render(
      <div className="app">
        <Scene build={build}>{null}</Scene>
      </div>,
    );
    const app = container.querySelector('.app') as HTMLElement;

    expect(made[0]?.paused()).toBe(false);

    act(() => app.classList.add('motion-paused'));
    await waitFor(() => expect(made[0]?.paused()).toBe(true));

    act(() => app.classList.remove('motion-paused'));
    await waitFor(() => expect(made[0]?.paused()).toBe(false));
  });

  it('pauses the loop while the scene is off screen', () => {
    const { build, made } = timelineBuild();
    const { container } = render(<Scene build={build}>{null}</Scene>);
    const svg = container.querySelector('svg') as SVGSVGElement;
    const observer = StubObserver.watching(svg) as StubObserver;

    act(() => observer.report(svg, false));
    expect(made[0]?.paused()).toBe(true);
    act(() => observer.report(svg, true));
    expect(made[0]?.paused()).toBe(false);
  });

  it('stops watching and kills the loop on unmount', () => {
    const { build, made } = timelineBuild();
    const { container, unmount } = render(<Scene build={build}>{null}</Scene>);
    const svg = container.querySelector('svg') as SVGSVGElement;

    unmount();
    expect(StubObserver.watching(svg)).toBeUndefined();
    expect(made[0]?.getChildren()).toHaveLength(0);
  });

  it('rebuilds the loop when its deps change', () => {
    const { build } = timelineBuild();
    const { rerender } = render(
      <Scene build={build} deps={['a']}>
        {null}
      </Scene>,
    );

    rerender(
      <Scene build={build} deps={['b']}>
        {null}
      </Scene>,
    );
    expect(build).toHaveBeenCalledTimes(2);
  });
});
