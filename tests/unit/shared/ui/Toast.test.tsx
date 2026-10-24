import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '../../../../src/shared/ui/Toast';

afterEach(() => vi.useRealTimers());

describe('Toast', () => {
  it('draws nothing but a polite live area when there is no toast', () => {
    const { container } = render(<Toast toast={null} dismissLabel="Dismiss" onDismiss={vi.fn()} />);

    expect(container.querySelector('.toast-area')).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the message and dismisses from the button', async () => {
    const onDismiss = vi.fn();

    render(
      <Toast toast={{ message: 'Saved' }} dismissLabel="Dismiss toast" onDismiss={onDismiss} />,
    );
    expect(screen.getByText('Saved')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss toast' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('marks an error toast', () => {
    render(
      <Toast
        toast={{ message: 'Failed', error: true }}
        dismissLabel="Dismiss"
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText('Failed').parentElement).toHaveClass('toast', 'toast-error');
  });

  it('dismisses itself after 4 s, and a parent re-render does not restart the clock', () => {
    vi.useFakeTimers();

    const onDismiss = vi.fn();
    const toast = { message: 'Saved' };
    const { rerender } = render(
      <Toast toast={toast} dismissLabel="Dismiss" onDismiss={() => onDismiss()} />,
    );

    act(() => vi.advanceTimersByTime(3000));
    rerender(<Toast toast={toast} dismissLabel="Dismiss" onDismiss={() => onDismiss()} />);
    act(() => vi.advanceTimersByTime(999));
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
