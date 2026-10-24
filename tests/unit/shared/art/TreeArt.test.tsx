import { act, render, waitFor } from '@testing-library/react';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TreeArt, type TreeArtKind } from '../../../../src/shared/art/TreeArt';
import { motionOn } from './motionOn';

let restore = (): void => undefined;

beforeEach(() => {
  restore = motionOn();
});
afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

const draw = (kind: TreeArtKind, month = 0): HTMLElement =>
  render(<TreeArt kind={kind} month={month} />).container;

const trunkHeight = (container: HTMLElement): number =>
  Number(container.querySelector('.ta-tree rect')?.getAttribute('height'));

describe('TreeArt', () => {
  it('is decorative heading art', () => {
    const container = draw('growing');

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('svg')).toHaveClass('landscape', 'batch-art');
  });

  it('draws a standing tree for growing, completed and flagged: three tiers of two facets', () => {
    (['growing', 'completed', 'flagged'] as const).forEach((kind) => {
      const container = draw(kind);

      expect(container.querySelectorAll('.ta-tree polygon')).toHaveLength(6);
    });
  });

  it('draws a stump for dead and a mound for removed, with no standing tree', () => {
    const dead = draw('dead');

    expect(dead.querySelector('.ta-tree')).toBeNull();
    expect(dead.querySelectorAll('path[fill="#8B5E3C"]')).toHaveLength(1);

    const removed = draw('removed');

    expect(removed.querySelector('.ta-tree')).toBeNull();
    expect(removed.querySelector('ellipse[rx="24"]')).not.toBeNull();
  });

  it('plants a flag only beside a flagged tree', () => {
    expect(draw('flagged').querySelector('path[d^="M150 196"]')).not.toBeNull();
    expect(draw('growing').querySelector('path[d^="M150 196"]')).toBeNull();
  });

  it('grows with the tree’s age and is full height once completed', () => {
    const young = trunkHeight(draw('growing', 0));
    const older = trunkHeight(draw('growing', 24));
    const done = trunkHeight(draw('completed', 3));

    expect(older).toBeGreaterThan(young);
    expect(done).toBeCloseTo(30);
    expect(trunkHeight(draw('growing', 120))).toBeCloseTo(30);
  });

  it('keeps one proof loop and a sway for a standing tree, and the motion gate stops both', async () => {
    const timelines = vi.spyOn(gsap, 'timeline');
    const sways = vi.spyOn(gsap, 'to');
    const { container } = render(
      <div className="app">
        <TreeArt kind="growing" />
      </div>,
    );
    const loops = [
      timelines.mock.results[0]?.value as gsap.core.Timeline,
      sways.mock.results[0]?.value as gsap.core.Tween,
    ];

    expect(loops.map((loop) => loop.paused())).toEqual([false, false]);

    act(() => container.querySelector('.app')?.classList.add('motion-paused'));
    await waitFor(() => expect(loops.map((loop) => loop.paused())).toEqual([true, true]));
  });

  it('only plays the proof loop for a stump: nothing sways', () => {
    const sways = vi.spyOn(gsap, 'to');

    draw('dead');
    expect(sways).not.toHaveBeenCalled();
  });

  it('draws the proof but no loop when motion is not allowed', () => {
    restore();
    const timelines = vi.spyOn(gsap, 'timeline');
    const container = draw('growing');

    expect(timelines).not.toHaveBeenCalled();
    expect(container.querySelector('.ta-hash')).toHaveTextContent('SHA-256');
  });
});
