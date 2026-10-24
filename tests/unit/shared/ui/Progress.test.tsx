import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from '../../../../src/shared/ui/Progress';

const fillOf = (bar: HTMLElement) => bar.firstElementChild as HTMLElement;

describe('Progress', () => {
  it('is a named progressbar with its value', () => {
    render(<Progress label="Funding progress" percent={41.6} />);
    const bar = screen.getByRole('progressbar', { name: 'Funding progress' });

    expect(bar).toHaveClass('progress');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(fillOf(bar).tagName).toBe('SPAN');
    expect(fillOf(bar).style.width).toBe('41.6%');
  });

  it('clamps below 0 and above 100', () => {
    const { rerender } = render(<Progress label="x" percent={-5} />);

    expect(fillOf(screen.getByRole('progressbar')).style.width).toBe('0%');
    rerender(<Progress label="x" percent={250} />);
    expect(fillOf(screen.getByRole('progressbar')).style.width).toBe('100%');
  });

  it('a meter is the gradient bar and keeps a sliver at zero', () => {
    render(<Progress label="Share" percent={0} variant="meter" className="cb-rail-bar" />);
    const bar = screen.getByRole('progressbar');

    expect(bar).toHaveClass('cb-inv-bar', 'cb-rail-bar');
    expect(fillOf(bar).tagName).toBe('I');
    expect(fillOf(bar).style.width).toBe('1%');
  });
});
