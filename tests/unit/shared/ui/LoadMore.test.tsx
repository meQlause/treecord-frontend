import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoadMore } from '../../../../src/shared/ui/LoadMore';

describe('LoadMore', () => {
  it('while more exist: a button and "{shown} of {total}"; clicking asks for more', async () => {
    const onMore = vi.fn();

    render(<LoadMore shown={6} total={20} label="Load more" onMore={onMore} />);
    expect(screen.getByText('6 of 20')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Load more' }));
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it('takes its own meta line', () => {
    render(<LoadMore shown={6} total={20} label="Load more" meta="Showing 6" onMore={vi.fn()} />);

    expect(screen.getByText('Showing 6')).toBeInTheDocument();
  });

  it('loading: "Loading…", disabled, aria-busy and a spinning retry icon', () => {
    const { container } = render(
      <LoadMore shown={6} total={20} label="Load more" loading onMore={vi.fn()} />,
    );
    const button = screen.getByRole('button');

    expect(button).toHaveTextContent('Loading…');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.ic--retry.spinning')).not.toBeNull();
  });

  it('failed: an error banner above, the button stays, and Try again resends', async () => {
    const onMore = vi.fn();

    render(
      <LoadMore
        shown={6}
        total={20}
        label="Load more"
        failed="Could not load more"
        onMore={onMore}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load more');
    expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it('failed: uses the retry label it is given', () => {
    render(
      <LoadMore
        shown={6}
        total={20}
        label="More"
        failed="Oops"
        retryLabel="Retry"
        onMore={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('at the end: the button goes and the "no more" copy shows', () => {
    render(<LoadMore shown={20} total={20} label="Load more" end="That is all" onMore={vi.fn()} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('That is all')).toBeInTheDocument();
  });

  it('at the end with no copy: draws nothing', () => {
    const { container } = render(
      <LoadMore shown={20} total={20} label="Load more" onMore={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('testId: names the button, and the failure banner as {testId}-error', () => {
    render(
      <LoadMore
        shown={6}
        total={20}
        label="Load more"
        failed="No"
        onMore={vi.fn()}
        testId="more"
      />,
    );

    expect(screen.getByTestId('more')).toHaveTextContent('Load more');
    expect(screen.getByTestId('more-error')).toHaveAttribute('role', 'alert');
  });
});
