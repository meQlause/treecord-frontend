import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GlyphKind } from '../../../../src/shared/art/Glyph';
import {
  TreeCardArt,
  type Milestone,
  type MilestoneStatus,
} from '../../../../src/shared/art/TreeCardArt';

const MONTHS = [0, 6, 12, 24, 36];
const track = (...statuses: MilestoneStatus[]): Milestone[] =>
  statuses.map((status, index) => ({ month: MONTHS[index] ?? 0, status }));

const draw = (kind: GlyphKind, milestones: Milestone[], seed = 0): HTMLElement =>
  render(<TreeCardArt kind={kind} milestones={milestones} seed={seed} />).container;

describe('TreeCardArt', () => {
  it('is decorative and draws one labelled dot per milestone', () => {
    const container = draw('alive', track('Paid', 'Open', 'Upcoming', 'Upcoming', 'Upcoming'));

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(Array.from(container.querySelectorAll('text')).map((text) => text.textContent)).toEqual([
      'M0',
      'M6',
      'M12',
      'M24',
      'M36',
    ]);
  });

  it('colours each dot by status and pulses only the open one', () => {
    const container = draw('alive', track('Paid', 'Open', 'Paused', 'Forfeited', 'Missed'));
    const dots = Array.from(container.querySelectorAll('circle'));

    expect(dots.map((dot) => dot.getAttribute('fill'))).toEqual([
      '#6f9a58',
      '#fffef9',
      '#cfd2c4',
      '#e9dcc8',
      '#e9dcc8',
    ]);
    expect(dots.map((dot) => dot.classList.contains('pl-pulse'))).toEqual([
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it('ticks a paid milestone and runs the green track up to the last paid one', () => {
    const container = draw('alive', track('Paid', 'Paid', 'Open', 'Upcoming', 'Upcoming'));

    expect(container.querySelectorAll('path[stroke="#fff"]')).toHaveLength(2);
    expect(container.querySelector('.pl-glint')).toHaveAttribute('d', 'M38 154H86');
  });

  it('draws no green run while only the first milestone is paid', () => {
    const container = draw('alive', track('Paid', 'Open', 'Upcoming', 'Upcoming', 'Upcoming'));

    expect(container.querySelector('.pl-glint')).toBeNull();
  });

  it('raises a coin for a living or completed tree that has been paid', () => {
    expect(draw('completed', track('Paid', 'Paid')).querySelector('.pl-coin-rise')).not.toBeNull();
    expect(draw('alive', track('Open', 'Upcoming')).querySelector('.pl-coin-rise')).toBeNull();
    expect(draw('flagged', track('Paid', 'Paused')).querySelector('.pl-coin-rise')).toBeNull();
  });

  it('gives each state its own loop: sway, march for a removed spot, none for a dead tree', () => {
    const loop = (kind: GlyphKind): string | null | undefined =>
      draw(kind, track('Open')).querySelector('svg > g:nth-of-type(2)')?.getAttribute('class');

    expect(loop('alive')).toBe('pl-sway');
    expect(loop('removed')).toBe('pl-march');
    expect(loop('dead')).toBeNull();
  });

  it('staggers the loops by the seed', () => {
    const first = draw('alive', track('Open'), 1).querySelector('.pl-cloud') as HTMLElement;
    const second = draw('alive', track('Open'), 2).querySelector('.pl-cloud') as HTMLElement;

    expect(first.style.animationDelay).toBe('-0.7s');
    expect(second.style.animationDelay).toBe('-1.4s');
  });
});
