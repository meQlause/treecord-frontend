import { act, render, waitFor } from '@testing-library/react';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyArt } from '../../../../src/shared/art/KeyArt';
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

describe('KeyArt', () => {
  it('is decorative heading art with the key, the signature, the hash bytes and the seal', () => {
    const { container } = render(<KeyArt />);
    const svg = container.querySelector('svg') as SVGSVGElement;

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('landscape', 'batch-art');
    expect(svg.querySelector('.ka-key')).not.toBeNull();
    expect(svg.querySelector('.ka-wave')).toHaveAttribute('pathLength', '1');
    expect(Array.from(svg.querySelectorAll('.ka-hex')).map((text) => text.textContent)).toEqual([
      'a3',
      'f9',
      '0c',
      '7e',
      'b2',
    ]);
    expect(svg.querySelector('.ka-seal')).not.toBeNull();
  });

  it('plays one looping timeline that Pause motion and off screen both stop', async () => {
    const spy = vi.spyOn(gsap, 'timeline');
    const { container } = render(
      <div className="app">
        <KeyArt />
      </div>,
    );
    const timeline = spy.mock.results[0]?.value as gsap.core.Timeline;
    const svg = container.querySelector('svg') as SVGSVGElement;

    expect(spy).toHaveBeenCalledTimes(1);
    expect(timeline.repeat()).toBe(-1);
    expect(timeline.paused()).toBe(false);

    act(() => container.querySelector('.app')?.classList.add('motion-paused'));
    await waitFor(() => expect(timeline.paused()).toBe(true));
    act(() => container.querySelector('.app')?.classList.remove('motion-paused'));
    await waitFor(() => expect(timeline.paused()).toBe(false));

    act(() => (StubObserver.watching(svg) as StubObserver).report(svg, false));
    expect(timeline.paused()).toBe(true);
  });

  it('draws no loop and stays still when motion is not allowed', () => {
    restore();
    const spy = vi.spyOn(gsap, 'timeline');

    render(<KeyArt />);
    expect(spy).not.toHaveBeenCalled();
  });

  it('cleans up the motion gate on unmount', () => {
    const { container, unmount } = render(<KeyArt />);
    const svg = container.querySelector('svg') as SVGSVGElement;

    unmount();
    expect(StubObserver.watching(svg)).toBeUndefined();
  });
});
