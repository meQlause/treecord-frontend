import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HEALTH, HealthForest, type RenderGlyph } from '../../../../src/shared/ui/HealthForest';

const glyph: RenderGlyph = ({ kind }) => <circle data-kind={kind} />;
const tally = (container: HTMLElement): Record<string, number> => {
  const counts: Record<string, number> = {};

  container.querySelectorAll('[data-kind]').forEach((node) => {
    const kind = node.getAttribute('data-kind') ?? '';

    counts[kind] = (counts[kind] ?? 0) + 1;
  });

  return counts;
};

describe('HealthForest', () => {
  it('lists the five statuses in order', () => {
    expect(HEALTH.map(([kind]) => kind)).toEqual([
      'alive',
      'flagged',
      'dead',
      'removed',
      'completed',
    ]);
  });

  it('says the counts in words for assistive tech', () => {
    render(<HealthForest counts={[10, 2, 0, 1, 3]} glyph={glyph} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(
      '10 alive, 2 flagged, 0 dead, 1 removed, 3 completed',
    );
  });

  it('always draws forty glyphs, shared out in proportion', () => {
    const { container } = render(<HealthForest counts={[50, 25, 15, 5, 5]} glyph={glyph} />);

    expect(tally(container)).toEqual({ alive: 20, flagged: 10, dead: 6, removed: 2, completed: 2 });
  });

  it('keeps one glyph for a status that is rare but not zero', () => {
    const { container } = render(<HealthForest counts={[1000, 1, 0, 0, 0]} glyph={glyph} />);
    const drawn = tally(container);

    expect(drawn['flagged']).toBe(1);
    expect(drawn['dead']).toBeUndefined();
    expect(Object.values(drawn).reduce((total, value) => total + value, 0)).toBe(40);
  });

  it('puts twenty glyphs on each row', () => {
    const { container } = render(<HealthForest counts={[40, 0, 0, 0, 0]} glyph={glyph} />);

    expect(container.querySelectorAll('.rise')).toHaveLength(40);
  });
});
