// docs/FE/fidelity.md §1 is the source; these checks keep matrix.ts honest against it (phases.md F0b 3/3).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MATRIX, VIEWPORTS, statesOf } from './matrix';

const FEATURES = '../docs/FE/features';
const DOCUMENT_ROWS = 29;
const DOCUMENT_STATES = 625;

describe('matrix', () => {
  it('holds every row of the document: 29 rows, 625 states', () => {
    const states = MATRIX.reduce((sum, row) => sum + row.stateCount, 0);

    expect(MATRIX).toHaveLength(DOCUMENT_ROWS);
    expect(states).toBe(DOCUMENT_STATES);
    expect(MATRIX[0]?.id).toBe('Shell');
    expect(MATRIX.map((row) => row.id).slice(1)).toEqual(
      Array.from(
        { length: DOCUMENT_ROWS - 1 },
        (_value, index) => `S${String(index + 2).padStart(2, '0')}`,
      ),
    );
  });

  it.each(MATRIX)('$id lists as many states as the document counts', (row) => {
    expect(statesOf(row)).toHaveLength(row.stateCount);
    expect(new Set(statesOf(row)).size).toBe(row.stateCount);
  });

  it.each(MATRIX)('$id names a route, a fixture builder and a screen document', (row) => {
    expect(row.route).not.toBe('');
    expect(row.fixture).not.toBe('');
    expect(existsSync(`${FEATURES}/${row.doc}.md`)).toBe(true);
  });

  it('checks every row at a phone and a wide desktop width (NFR-034)', () => {
    expect(VIEWPORTS.map((viewport) => viewport.width)).toEqual([360, 1920]);
  });

  it('the document still says 29 rows, 625 states', () => {
    expect(readFileSync('../docs/FE/fidelity.md', 'utf8')).toContain(
      `**Totals:** ${DOCUMENT_ROWS} rows, ${DOCUMENT_STATES} states, 2 viewports`,
    );
  });
});
