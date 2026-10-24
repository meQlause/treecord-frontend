import { describe, expect, it } from 'vitest';
import { formatBits, qrMatrix, qrPath, rsEcc } from '../../../../src/shared/art/qrcode';

const draw = (text: string): string[] =>
  qrMatrix(text).map((row) => row.map((dark) => (dark ? '#' : '.')).join(''));

// Golden grid: what the mockup's qr.js (the reference this file ports) draws for the planter's short id.
const K7Q2 = [
  '#######.#..##.#######',
  '#.....#.##..#.#.....#',
  '#.###.#.#.#.#.#.###.#',
  '#.###.#..#.##.#.###.#',
  '#.###.#..###..#.###.#',
  '#.....#.#.#...#.....#',
  '#######.#.#.#.#######',
  '........#.#.#........',
  '..###.#.#.#..###..###',
  '#.#.##...#..##.#.####',
  '###.#.#..#####..##...',
  '..###...#..#.#.######',
  '#...#.##........###.#',
  '........#.####....#..',
  '#######....#.#.#.###.',
  '#.....#...#..##...#..',
  '#.###.#.##.....#.#.#.',
  '#.###.#.##.#####..#..',
  '#.###.#.#..#.#..#....',
  '#.....#....#.#.##.#..',
  '#######....#.##.#.##.',
];

describe('qrcode', () => {
  it('draws a short id as the same stable 21x21 grid every time', () => {
    expect(draw('K7Q2')).toEqual(K7Q2);
    expect(draw('K7Q2')).toEqual(draw('K7Q2'));
  });

  it('grows to version 2 (25x25) past seven bytes and refuses past fourteen', () => {
    expect(qrMatrix('TREE-0001')).toHaveLength(25);
    expect(qrMatrix('ABCDEFGHIJKLMN')).toHaveLength(25);
    expect(() => qrMatrix('ABCDEFGHIJKLMNO')).toThrow(/too long/);
  });

  it('puts a finder pattern in three corners', () => {
    const grid = qrMatrix('TREE-0001');
    const last = grid.length - 1;

    expect([grid[0]?.[0], grid[0]?.[last], grid[last]?.[0]]).toEqual([true, true, true]);
    expect(grid[3]?.[3]).toBe(true);
  });

  it('computes the Reed-Solomon codewords of the ISO 18004 worked example', () => {
    expect(rsEcc([32, 65, 205, 69, 41, 220, 46, 128, 236], 17)).toEqual([
      42, 159, 74, 221, 244, 169, 239, 150, 138, 70, 237, 85, 224, 96, 74, 219, 61,
    ]);
  });

  it('encodes level H and mask 0 as the standard format word', () => {
    expect(formatBits(2, 0).toString(2).padStart(15, '0')).toBe('001011010001001');
  });

  it('wraps the grid in a four-module quiet zone as one path', () => {
    const { size, d } = qrPath('K7Q2');

    expect(size).toBe(29);
    expect(d.startsWith('M4 4h1v1h-1z')).toBe(true);
  });
});
