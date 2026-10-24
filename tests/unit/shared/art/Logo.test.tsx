import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from '../../../../src/shared/art/Logo';
import { StubObserver } from '../../observer';

describe('Logo', () => {
  it('is decorative and sized', () => {
    const { container } = render(<Logo size={48} className="big" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('logo', 'big');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '48');
    expect(container.querySelectorAll('polygon')).toHaveLength(6);
  });

  it('is 36px by default and joins the offscreen gate', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg') as SVGSVGElement;

    expect(svg).toHaveAttribute('width', '36');
    StubObserver.watching(svg)?.report(svg, false);
    expect(svg).toHaveClass('offscreen');
  });
});
