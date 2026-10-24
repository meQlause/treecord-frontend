import { render, screen } from '@testing-library/react';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FooterLine } from '../../../../src/app/shell/FooterLine';
import { motionOn } from '../../shared/art/motionOn';

let restore = (): void => undefined;

beforeEach(() => {
  restore = motionOn();
});
afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

describe('FooterLine', () => {
  it('is read as the finished sentence, the rolling words are decoration (FR-016)', () => {
    const { container } = render(<FooterLine />);

    expect(screen.getByText('Every tree, proven.')).toHaveClass('sr-only');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      'Every tree, planted.measured.verified.proven.',
    );
    expect(container.querySelectorAll('.ft-word')).toHaveLength(4);
  });

  it('rolls the words in one looping timeline that Pause motion stops', () => {
    const spy = vi.spyOn(gsap, 'timeline');

    render(
      <div className="app motion-paused">
        <FooterLine />
      </div>,
    );

    const timeline = spy.mock.results[0]?.value as gsap.core.Timeline;

    expect(timeline.repeat()).toBe(-1);
    expect(timeline.paused()).toBe(true);
  });
});
