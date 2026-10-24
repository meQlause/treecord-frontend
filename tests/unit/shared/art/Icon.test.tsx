import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from '../../../../src/shared/art/Icon';
import { StubObserver } from '../../observer';

describe('Icon', () => {
  it('draws the named shape, decorative, at the asked size', () => {
    const { container } = render(<Icon name="pin" size={32} />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('ic', 'ic--pin');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '32');
  });

  it('is a leaf of 20px when nothing is asked', () => {
    const { container } = render(<Icon />);

    expect(container.querySelector('svg')).toHaveClass('ic--leaf');
    expect(container.querySelector('svg')).toHaveAttribute('width', '20');
  });

  it('gives each instance its own phase so a row does not breathe in lockstep', () => {
    const { container } = render(
      <>
        <Icon />
        <Icon />
      </>,
    );
    const [first, second] = Array.from(container.querySelectorAll('svg')).map((svg) =>
      svg.style.getPropertyValue('--phase'),
    );

    expect(first).not.toBe(second);
  });

  it('keeps a caller class and style beside its own', () => {
    const { container } = render(<Icon className="extra" style={{ color: 'red' }} />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('extra', 'ic');
    expect(svg?.style.color).toBe('red');
  });

  it('pauses its loop while off screen and resumes on screen', () => {
    const { container } = render(<Icon />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    const observer = StubObserver.watching(svg) as StubObserver;

    observer.report(svg, false);
    expect(svg).toHaveClass('offscreen');
    observer.report(svg, true);
    expect(svg).not.toHaveClass('offscreen');
  });

  it('stops watching once removed', () => {
    const { container, unmount } = render(<Icon />);
    const svg = container.querySelector('svg') as SVGSVGElement;

    unmount();
    expect(StubObserver.watching(svg)).toBeUndefined();
  });
});
