import { act, render } from '@testing-library/react';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GrowthArt } from '../../../../src/app/shell/GrowthArt';
import { motionOn } from '../../shared/art/motionOn';

type Report = (entries: { contentRect: { width: number; height: number } }[]) => void;

let report: Report = (_entries) => undefined;
let restore = (): void => undefined;

class FakeResizeObserver {
  constructor(callback: Report) {
    report = callback;
  }

  observe(): void {
    act(() => report([{ contentRect: { width: 230, height: 600 } }]));
  }

  disconnect(): void {
    report = (_entries) => undefined;
  }
}

const setObserver = (value: unknown): void => {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value,
  });
};

beforeEach(() => {
  restore = motionOn();
  setObserver(FakeResizeObserver);
});
afterEach(() => {
  restore();
  setObserver(undefined);
  vi.restoreAllMocks();
});

describe('GrowthArt', () => {
  it('waits for a real box before drawing, and always has its words', () => {
    setObserver(undefined);

    const { container } = render(<GrowthArt />);

    expect(container.querySelector('svg.growth-art')).toBeNull();
    expect(container.querySelector('.ga-text')).toHaveTextContent(/Every tree,\s*proven\./);
  });

  it('draws the art for the real height of its box: 185 wide, 600 x 185 / 230 tall', () => {
    const { container } = render(<GrowthArt />);
    const svg = container.querySelector('svg.growth-art') as SVGSVGElement;

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 185 483');
    expect(svg.querySelectorAll('.ga-tick')).toHaveLength(6);
    expect(svg.querySelectorAll('.ga-lab')[5]).toHaveTextContent('M36');
  });

  it('plays one looping story that the motion gate can pause', () => {
    const spy = vi.spyOn(gsap, 'timeline');
    const { container } = render(
      <div className="app motion-paused">
        <GrowthArt />
      </div>,
    );
    const timeline = spy.mock.results[0]?.value as gsap.core.Timeline;

    expect(container.querySelector('.sidebar-grow')).not.toBeNull();
    expect(timeline.repeat()).toBe(-1);
    expect(timeline.paused()).toBe(true);
  });
});
