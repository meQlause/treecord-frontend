import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Skeleton, useAfter } from '../../../../src/shared/ui/Skeleton';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAfter', () => {
  it('turns true once the delay has passed (300 ms by default)', () => {
    const { result } = renderHook(() => useAfter());

    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('takes its own delay', () => {
    const { result } = renderHook(() => useAfter(50));

    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe(true);
  });
});

describe('Skeleton', () => {
  it('is a busy status that announces "Loading…" and draws no blocks in the first 300 ms', () => {
    const { container } = render(<Skeleton />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(container.querySelector('.skeleton')).toBeNull();
  });

  it('draws the blocks after 300 ms, hidden from assistive tech', () => {
    const { container } = render(<Skeleton />);

    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector('.skeleton')).not.toBeNull();
    expect(container.querySelector('.skeleton')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('shows the screen own loading line instead of "Loading…"', () => {
    render(<Skeleton label="Loading campaigns…" />);

    expect(screen.getByText('Loading campaigns…')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it.each([
    ['page', '.detail-layout .ws-skel-panel'],
    ['cards', '.campaign-grid .skeleton-card'],
    ['list', '.donor-list-skeleton'],
    ['panel', '.ws-panel .skeleton'],
    ['region', '.skeleton.small'],
  ] as const)('the %s shape lands as %s', (shape, selector) => {
    const { container } = render(<Skeleton shape={shape} />);

    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelector(selector)).not.toBeNull();
  });

  it('draws three cards in the cards shape', () => {
    const { container } = render(<Skeleton shape="cards" />);

    act(() => vi.advanceTimersByTime(300));
    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(3);
  });
});
