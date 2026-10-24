import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Rail } from '../../../../src/shared/ui/Rail';

describe('Rail', () => {
  it('wraps its panels in the sticky rail column', () => {
    render(
      <Rail>
        <p>panel</p>
      </Rail>,
    );

    expect(screen.getByText('panel').parentElement).toHaveClass('cb-rail');
  });

  it('fits to the screen below the header and stays inside its layout', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ bottom: 400 }) as DOMRect,
    );
    render(
      <Rail>
        <p>panel</p>
      </Rail>,
    );

    const rail = screen.getByText('panel').parentElement;

    // 400 (end of the layout) - 104 (under the header)
    expect(rail?.style.getPropertyValue('--rail-room')).toBe('296px');
    expect(rail?.style.getPropertyValue('--rail-top')).toBe('104px');
    vi.restoreAllMocks();
  });
});
