import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ErrorState,
  ErrorView,
  ForbiddenState,
  LoadingState,
  NotFoundState,
} from '../../../../src/app/states/states';
import { ApiError } from '../../../../src/shared/api/errors';

const fail = (code: string, status: number) => new ApiError({ code, message: code, status });

describe('workspace states', () => {
  it('SH-2: loading is a busy status with the workspace line', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading workspace…')).toBeInTheDocument();
  });

  it('SH-8: the error state is an alert with the title, the body and a Try again that retries', async () => {
    const onRetry = vi.fn();

    render(<ErrorState onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load this pageYour inputs and local records are unchanged.',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('SH-11: forbidden names the role in the body', () => {
    render(<ForbiddenState>This screen is for Operator accounts.</ForbiddenState>);

    expect(screen.getByRole('heading', { name: 'Role unavailable' })).toBeInTheDocument();
    expect(screen.getByText('This screen is for Operator accounts.')).toBeInTheDocument();
  });

  it('SH-13 / SH-14: not found takes the screen’s title, else "Not found"', () => {
    const { rerender } = render(<NotFoundState title="Job not found" />);

    expect(screen.getByRole('heading', { name: 'Job not found' })).toBeInTheDocument();

    rerender(<NotFoundState title={undefined} />);

    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});

describe('ErrorView (error-handling §5)', () => {
  it.each([
    ['internal_error', 500],
    ['service_unavailable', 503],
    ['network', 0],
    ['timeout', 0],
  ])('%s → Could not load this page, retry', async (code, status) => {
    const onRetry = vi.fn();

    render(<ErrorView error={fail(code, status)} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Could not load this page')).toBeInTheDocument();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it.each([
    ['not_found', 404],
    ['invalid_path', 400],
  ])('%s → the screen’s not-found title', (code, status) => {
    render(
      <ErrorView error={fail(code, status)} onRetry={vi.fn()} notFoundTitle="Job not found" />,
    );

    expect(screen.getByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('forbidden_role → Role unavailable', () => {
    render(<ErrorView error={fail('forbidden_role', 403)} onRetry={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Role unavailable' })).toBeInTheDocument();
  });

  it('anything that is not an ApiError falls to the retry state', () => {
    render(<ErrorView error={new Error('boom')} onRetry={vi.fn()} />);

    expect(screen.getByText('Could not load this page')).toBeInTheDocument();
  });
});
