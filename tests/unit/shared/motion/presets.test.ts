import { describe, expect, it } from 'vitest';
import { cardMotion, EASE, popMotion } from '../../../../src/shared/motion/presets';

describe('motion presets', () => {
  it('staggers cards by their column, three to a row', () => {
    const delay = (index: number) =>
      (cardMotion(index).whileInView as { transition: { delay: number } }).transition.delay;

    expect(delay(0)).toBe(0);
    expect(delay(1)).toBeCloseTo(0.06);
    expect(delay(3)).toBe(0);
  });

  it('lifts on hover unless told not to', () => {
    expect(cardMotion(0).whileHover).toEqual({ y: -4 });
    expect(cardMotion(0, false).whileHover).toBeUndefined();
  });

  it('shares the soft ease and a spring pop', () => {
    expect(EASE).toEqual([0.2, 0.8, 0.2, 1]);
    expect(popMotion.transition.type).toBe('spring');
  });
});
