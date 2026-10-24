import { act, renderHook } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { useMotionGate } from '../../../../src/shared/motion/useMotionGate';

describe('useMotionGate', () => {
  it('is still while paused, and tells Motion to skip animations', () => {
    const { result, rerender } = renderHook(({ paused }) => useMotionGate(paused), {
      initialProps: { paused: false },
    });

    expect(result.current).toBe(false);
    expect(MotionGlobalConfig.skipAnimations).toBe(false);
    rerender({ paused: true });
    expect(result.current).toBe(true);
    expect(MotionGlobalConfig.skipAnimations).toBe(true);
  });

  it('is still while the tab is hidden', () => {
    const { result } = renderHook(() => useMotionGate(false));

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(true);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
});
