import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Banner } from '../../../../src/shared/ui/Banner';

describe('Banner', () => {
  it('info (default): a status with the clock icon', () => {
    const { container } = render(<Banner>You are offline</Banner>);

    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
    expect(screen.getByRole('status')).toHaveClass('state-banner');
    expect(container.querySelector('.ic--clock')).not.toBeNull();
  });

  it('error: an alert with the warning icon in the error look', () => {
    const { container } = render(<Banner tone="error">Save failed</Banner>);

    expect(screen.getByRole('alert')).toHaveClass('state-banner', 'error-banner');
    expect(container.querySelector('.ic--warning')).not.toBeNull();
  });

  it('callout: an alert with no icon', () => {
    const { container } = render(<Banner tone="callout">Wallet not ready</Banner>);

    expect(screen.getByRole('alert')).toHaveClass('ws-callout');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('icon overrides the tone icon, and null removes it', () => {
    const { container, rerender } = render(<Banner icon="wifi">Offline</Banner>);

    expect(container.querySelector('.ic--wifi')).not.toBeNull();

    rerender(<Banner icon={null}>Offline</Banner>);
    expect(container.querySelector('svg')).toBeNull();
  });

  it.each(['info', 'error', 'callout'] as const)(
    '%s: one action button fires onAction',
    async (tone) => {
      const onAction = vi.fn();

      render(
        <Banner tone={tone} action="Try again" onAction={onAction}>
          Failed
        </Banner>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));

      expect(onAction).toHaveBeenCalledTimes(1);
    },
  );

  it('has no button without an action', () => {
    render(<Banner>Hello</Banner>);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('testId: lands on the banner itself', () => {
    render(
      <Banner tone="error" testId="note">
        No
      </Banner>,
    );

    expect(screen.getByTestId('note')).toHaveAttribute('role', 'alert');
  });
});
