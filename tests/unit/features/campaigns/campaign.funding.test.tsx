import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from '../../../../src/features/campaigns/campaign.funding';

describe('useCountUp', () => {
  beforeEach(() =>
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] }),
  );

  afterEach(() => vi.useRealTimers());

  it('shows the value at once while motion is still', () => {
    const { result } = renderHook(() => useCountUp(6_840_000_000n, true));

    expect(result.current).toBe(6_840_000_000n);
  });

  it('counts up from zero to the exact value without a float amount', () => {
    const { result } = renderHook(() => useCountUp(6_840_000_000n, false));

    expect(result.current).toBe(0n);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current).toBeGreaterThan(0n);
    expect(result.current).toBeLessThan(6_840_000_000n);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current).toBe(6_840_000_000n);
  });
});
