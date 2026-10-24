import { describe, expect, it } from 'vitest';
import { MILESTONES, growth, growthGeometry } from '../../../../src/app/shell/growth-geometry';

describe('growth', () => {
  it('starts at 8 % of the ruler and reaches the top at month 36', () => {
    expect(growth(0)).toBeCloseTo(0.08);
    expect(growth(36)).toBeCloseTo(1);
  });

  it('only ever grows', () => {
    const shares = MILESTONES.map(({ month }) => growth(month));

    expect(shares).toEqual([...shares].sort((first, second) => first - second));
  });
});

describe('growthGeometry', () => {
  it('puts each milestone tip higher up the box than the one before', () => {
    const { tips, ground, top } = growthGeometry(500);

    expect(tips).toHaveLength(MILESTONES.length);
    expect(tips.at(-1)).toBeCloseTo(top);
    expect(tips[0]).toBeLessThan(ground);
    expect([...tips].sort((first, second) => second - first)).toEqual(tips);
  });

  it('draws three tiers in a short box and four in a tall one', () => {
    expect(growthGeometry(400).tiers).toHaveLength(3);
    expect(growthGeometry(500).tiers).toHaveLength(4);
  });

  it('keeps the soil below the ground line, inside the box', () => {
    const geometry = growthGeometry(420);

    expect(geometry.height - geometry.ground).toBe(54);
  });
});
