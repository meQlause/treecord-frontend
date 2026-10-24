import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Facts, orDash } from '../../../../src/shared/ui/Facts';

describe('orDash', () => {
  it('turns null, undefined and an empty string into a dash', () => {
    expect(orDash(null)).toBe('—');
    expect(orDash(undefined)).toBe('—');
    expect(orDash('')).toBe('—');
  });

  it('keeps every real value, zero and false included', () => {
    expect(orDash('abc')).toBe('abc');
    expect(orDash(0)).toBe(0);
    expect(orDash(false)).toBe(false);
  });
});

describe('Facts', () => {
  it('lists label and value rows, and shows a dash for a missing value', () => {
    render(
      <Facts
        rows={[
          ['Species', 'Mahogany'],
          ['Hash', null],
          ['Note', ''],
          ['Trees', 0],
        ]}
      />,
    );

    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Species',
      'Hash',
      'Note',
      'Trees',
    ]);
    expect(screen.getAllByRole('definition').map((def) => def.textContent)).toEqual([
      'Mahogany',
      '—',
      '—',
      '0',
    ]);
  });
});
