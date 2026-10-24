import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MotionToggle } from '../../../../src/app/shell/MotionToggle';
import { renderShell, setReducedMotion } from './harness';

afterEach(() => localStorage.clear());

describe('MotionToggle', () => {
  it('offers "Pause motion" while playing (SH-19)', () => {
    renderShell(<MotionToggle />);

    expect(screen.getByRole('button', { name: 'Pause motion' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('turns into "Play motion", pressed, and remembers it (SH-20)', async () => {
    renderShell(<MotionToggle />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Pause motion' }));

    expect(screen.getByRole('button', { name: 'Play motion' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(localStorage.getItem('treecord-motion')).toBe('paused');
  });

  it('is disabled and says why when the system asks for reduced motion (SH-21)', () => {
    const restore = setReducedMotion(true);

    renderShell(<MotionToggle />);

    const button = screen.getByRole('button', { name: 'Reduced motion enabled by your system' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('title', 'System reduced motion');
    restore();
  });
});
