import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReviewAction, type ReviewCopy } from '../../../../src/shared/ui/ReviewAction';

const copy: ReviewCopy = {
  region: 'Review Release',
  summary: 'Review this action before confirming.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  close: 'Close',
  done: 'Done. Release is on its way.',
};

const user = userEvent.setup();
const confirmButton = () => screen.getByRole('button', { name: /^(Confirm|Processing)/ });

describe('ReviewAction', () => {
  it('idle: one button with the label; clicking opens the review region', async () => {
    render(<ReviewAction label="Release" copy={copy} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Release' }));

    const region = screen.getByRole('region', { name: 'Review Release' });

    expect(region).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('heading', { name: 'Release' })).toBeInTheDocument();
    expect(screen.getByText(copy.summary)).toBeInTheDocument();
  });

  it('idle: the button can be disabled', () => {
    render(<ReviewAction label="Release" copy={copy} onConfirm={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: 'Release' })).toBeDisabled();
  });

  it('cancel goes back to the button', async () => {
    render(<ReviewAction label="Release" copy={copy} onConfirm={vi.fn()} stage="review" />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('button', { name: 'Release' })).toBeInTheDocument();
  });

  it('shows children, destructive target rows and the error banner inside the review', () => {
    render(
      <ReviewAction
        label="Release"
        copy={copy}
        onConfirm={vi.fn()}
        stage="review"
        target={[['Destroys', '12 tCO2e']]}
        error="Someone else changed this"
      >
        <input aria-label="Reason" />
      </ReviewAction>,
    );

    const region = screen.getByRole('region');

    expect(region).toContainElement(screen.getByText('12 tCO2e'));
    expect(region).toContainElement(screen.getByRole('textbox', { name: 'Reason' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Someone else changed this');
  });

  it('Confirm stays disabled until ready', () => {
    render(
      <ReviewAction label="Release" copy={copy} onConfirm={vi.fn()} stage="review" ready={false} />,
    );

    expect(confirmButton()).toBeDisabled();
  });

  it('confirm -> done: a status with the done line, a link and Close back to idle', async () => {
    const onConfirm = vi.fn();

    render(
      <ReviewAction
        label="Release"
        copy={copy}
        onConfirm={onConfirm}
        stage="review"
        doneLink={<a href="/job">Track</a>}
      />,
    );
    await user.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(copy.done);
    expect(screen.getByRole('link', { name: 'Track' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Release' })).toBeInTheDocument();
  });

  it('stage="done" opens at the done line', () => {
    render(<ReviewAction label="Release" copy={copy} onConfirm={vi.fn()} stage="done" />);

    expect(screen.getByRole('status')).toHaveTextContent(copy.done);
  });
});
describe('ReviewAction while busy and when confirm is async', () => {
  it('stage="busy": Processing…, Cancel disabled, region aria-busy', () => {
    render(
      <ReviewAction
        label="Release"
        copy={copy}
        onConfirm={vi.fn()}
        stage="busy"
        busyLabel="Releasing…"
      />,
    );

    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Releasing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('busy without a label of its own says Processing…', () => {
    render(<ReviewAction label="Release" copy={copy} onConfirm={vi.fn()} stage="busy" />);

    expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled();
  });

  it('async confirm: busy until it settles (one in flight), then done', async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    render(<ReviewAction label="Release" copy={copy} onConfirm={onConfirm} stage="review" />);
    await user.click(confirmButton());

    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect(screen.getByRole('status')).toHaveTextContent(copy.done);
  });

  it.each([
    ['returns false', () => false],
    ['rejects', () => Promise.reject(new Error('nope'))],
  ])('stays in the review, enabled again, when onConfirm %s', async (_name, onConfirm) => {
    render(
      <ReviewAction
        label="Release"
        copy={copy}
        onConfirm={onConfirm}
        stage="review"
        error="Try again later"
      />,
    );
    await user.click(confirmButton());

    expect(screen.getByRole('region')).not.toHaveAttribute('aria-busy');
    expect(confirmButton()).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Try again later');
    expect(screen.queryByText(copy.done)).toBeNull();
  });
});
