import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Dialog } from '../../../../src/shared/ui/Dialog';

// jsdom has <dialog> but neither showModal nor close; opening and closing are all the component needs from it
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

const escape = (element: HTMLElement): boolean =>
  fireEvent(element, new Event('cancel', { cancelable: true }));

const setup = (busy = false) => {
  const onClose = vi.fn();

  render(
    <Dialog
      title="Make it count."
      description="Batch 7"
      closeLabel="Close"
      busy={busy}
      onClose={onClose}
    >
      <p>Body</p>
    </Dialog>,
  );

  return onClose;
};

describe('Dialog', () => {
  it('opens as a modal named by its title, with description and body', () => {
    setup();

    expect(screen.getByRole('dialog', { name: 'Make it count.' })).toBeInTheDocument();
    expect(screen.getByText('Batch 7')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('closes from the close button and from Escape', async () => {
    const onClose = setup();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(escape(screen.getByRole('dialog'))).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('cannot close while busy: the button is disabled and Escape is swallowed', () => {
    const onClose = setup(true);

    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(escape(screen.getByRole('dialog'))).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks page scroll while open and restores it on unmount', () => {
    document.body.style.overflow = 'auto';

    const { unmount } = render(
      <Dialog title="T" closeLabel="Close" onClose={vi.fn()}>
        x
      </Dialog>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('closes the dialog before it gives the focus back, so the opener is no longer inert', () => {
    const opener = document.createElement('button');
    const order: string[] = [];

    document.body.append(opener);
    opener.focus();
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(() => {
      order.push('close');
    });
    vi.spyOn(opener, 'focus').mockImplementation(() => {
      order.push('focus');
    });

    const { unmount } = render(
      <Dialog title="T" closeLabel="Close" onClose={vi.fn()}>
        x
      </Dialog>,
    );

    unmount();
    expect(order).toEqual(['close', 'focus']);
    vi.restoreAllMocks();
    opener.remove();
  });
});
