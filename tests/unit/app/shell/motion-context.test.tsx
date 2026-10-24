import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider, useMotion } from '../../../../src/app/shell/motion-context';
import { setReducedMotion } from './harness';

function Probe() {
  const { paused, reduced, hidden, still, toggle } = useMotion();

  return (
    <button type="button" onClick={toggle}>
      {JSON.stringify({ paused, reduced, hidden, still })}
    </button>
  );
}

const state = (): Record<string, boolean> =>
  JSON.parse(screen.getByRole('button').textContent ?? '{}') as Record<string, boolean>;

const renderProbe = () =>
  render(
    <MotionProvider>
      <Probe />
    </MotionProvider>,
  );

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('MotionProvider', () => {
  it('plays by default, and the toggle pauses and plays again, remembering the choice', async () => {
    const user = userEvent.setup();

    renderProbe();
    expect(state()).toMatchObject({ paused: false, still: false });

    await user.click(screen.getByRole('button'));
    expect(state()).toMatchObject({ paused: true, still: true });
    expect(localStorage.getItem('treecord-motion')).toBe('paused');

    await user.click(screen.getByRole('button'));
    expect(state()).toMatchObject({ paused: false, still: false });
    expect(localStorage.getItem('treecord-motion')).toBe('playing');
  });

  it('starts paused when the device remembers it', () => {
    localStorage.setItem('treecord-motion', 'paused');
    renderProbe();

    expect(state()).toMatchObject({ paused: true, still: true });
  });

  it('still toggles when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderProbe();
    expect(state().paused).toBe(false);

    await userEvent.setup().click(screen.getByRole('button'));
    expect(state().paused).toBe(true);
  });

  it('is still while the system asks for reduced motion', () => {
    const restore = setReducedMotion(true);

    renderProbe();
    expect(state()).toMatchObject({ reduced: true, paused: false, still: true });
    restore();
  });

  it('is still while the tab is hidden', () => {
    renderProbe();

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(state()).toMatchObject({ hidden: true, still: true });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('refuses to be read without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow('MotionProvider');
  });
});
