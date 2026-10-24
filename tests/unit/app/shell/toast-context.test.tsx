import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastArea, ToastProvider, useToast } from '../../../../src/app/shell/toast-context';

function Caller({ message, error }: { message: string; error?: boolean }) {
  const { notify } = useToast();

  return (
    <button type="button" onClick={() => notify(message, error)}>
      {`say ${message}`}
    </button>
  );
}

const setup = () =>
  render(
    <ToastProvider>
      <Caller message="First" />
      <Caller message="Second" error />
      <ToastArea />
    </ToastProvider>,
  );

beforeEach(() => {
  // exits finish at once, so "gone" can be asserted without waiting for an animation
  MotionGlobalConfig.skipAnimations = true;
});
afterEach(() => {
  MotionGlobalConfig.skipAnimations = false;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ToastProvider', () => {
  it('shows one toast in a polite live area, and a new one replaces it', async () => {
    const user = userEvent.setup();
    const { container } = setup();

    expect(container.querySelector('.toast-area')).toHaveAttribute('aria-live', 'polite');

    await user.click(screen.getByText('say First'));
    expect(screen.getByText('First')).toBeInTheDocument();

    await user.click(screen.getByText('say Second'));
    expect(screen.queryByText('First')).toBeNull();
    expect(screen.getByText('Second').closest('.toast')).toHaveClass('toast-error');
  });

  it('hides after 4 s and never takes focus', async () => {
    vi.useFakeTimers();
    setup();

    const caller = screen.getByText('say First');

    caller.focus();
    act(() => caller.click());
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(caller).toHaveFocus();

    act(() => vi.advanceTimersByTime(3899));
    expect(screen.getByText('First')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(screen.queryByText('First')).toBeNull();
  });

  it('hides from "Dismiss toast"', async () => {
    const user = userEvent.setup();

    setup();
    await user.click(screen.getByText('say First'));
    await user.click(screen.getByRole('button', { name: 'Dismiss toast' }));

    expect(screen.queryByText('First')).toBeNull();
  });

  it('refuses to be used without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Caller message="x" />)).toThrow('ToastProvider');
    expect(() => render(<ToastArea />)).toThrow('ToastProvider');
  });
});
