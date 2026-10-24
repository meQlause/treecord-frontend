// QR codes (ISO/IEC 18004) for the short ids the planter prints: byte mode, error correction H (survives a dirty,
// creased card), versions 1-2, so up to 14 bytes. Port of the mockup's qr.js (FE-implementation/src/qr.js), pure and
// node-testable; QR.tsx draws qrPath() as one SVG path.
// ponytail: versions 1-2 only (one Reed-Solomon block, one alignment pattern); longer payloads need block interleaving.
const GF_SIZE = 256;
const GF_PERIOD = 255;
const GF_HIGH_BIT = 128;
const GF_POLY = 0x11d;
const EXP = new Uint8Array(GF_SIZE * 2);
const LOG = new Uint8Array(GF_SIZE);

for (let power = 0, value = 1; power < GF_PERIOD; power += 1) {
  EXP[power] = value;
  LOG[value] = power;
  value = (value << 1) ^ ((value & GF_HIGH_BIT) === 0 ? 0 : GF_POLY);
}

for (let power = GF_PERIOD; power < EXP.length; power += 1) {
  EXP[power] = EXP[power - GF_PERIOD] ?? 0;
}

const range = (count: number): number[] => [...new Array<number>(count).keys()];

const multiply = (left: number, right: number): number =>
  left === 0 || right === 0 ? 0 : (EXP[(LOG[left] ?? 0) + (LOG[right] ?? 0)] ?? 0);

/** Level H codewords per version (index 0 is version 1). */
const VERSIONS = [
  { data: 9, ecc: 17 },
  { data: 16, ecc: 28 },
];
const MAX_BYTES = 14;
const V1_BYTES = 7;
const SIZE_BASE = 17;
const SIZE_STEP = 4;
const LEVEL_H = 2;
const MODE_BYTE = 4;
const MODE_BITS = 4;
const COUNT_BITS = 8;
const BYTE_BITS = 8;
const PAD_A = 0xec;
const PAD_B = 0x11;
const PADS = [PAD_A, PAD_B];

/** Reed-Solomon error correction codewords over GF(256), generator with roots a^0..a^(count-1). */
export function rsEcc(data: number[], count: number): number[] {
  let generator = [1];

  for (let root = 0; root < count; root += 1) {
    const next: number[] = new Array<number>(generator.length + 1).fill(0);

    generator.forEach((coef, pos) => {
      next[pos] = (next[pos] ?? 0) ^ coef;
      next[pos + 1] = (next[pos + 1] ?? 0) ^ multiply(coef, EXP[root] ?? 0);
    });
    generator = next;
  }

  const rest: number[] = new Array<number>(count).fill(0);

  data.forEach((word) => {
    const factor = word ^ (rest.shift() ?? 0);

    rest.push(0);
    range(count).forEach((pos) => {
      rest[pos] = (rest[pos] ?? 0) ^ multiply(generator[pos + 1] ?? 0, factor);
    });
  });

  return rest;
}

const FORMAT_MASK = 0x5412;
const FORMAT_POLY = 0x537;
const FORMAT_BCH_BITS = 10;
const FORMAT_TOP_BIT = 9;
const MASK_BITS = 3;

/** The 15 format bits: error level bits (L 1, M 0, Q 3, H 2) and mask, BCH(15,5), XOR 0x5412. */
export function formatBits(level: number, mask: number): number {
  const data = (level << MASK_BITS) | mask;
  let rest = data;

  for (let step = 0; step < FORMAT_BCH_BITS; step += 1) {
    rest = (rest << 1) ^ ((rest >>> FORMAT_TOP_BIT) * FORMAT_POLY);
  }

  return ((data << FORMAT_BCH_BITS) | rest) ^ FORMAT_MASK;
}

const THIRD = 3;
const PRODUCT_MODS = (col: number, row: number): number =>
  ((col * row) % 2) + ((col * row) % THIRD);
const MASKS: ((col: number, row: number) => boolean)[] = [
  (col, row) => (col + row) % 2 === 0,
  (_col, row) => row % 2 === 0,
  (col) => col % THIRD === 0,
  (col, row) => (col + row) % THIRD === 0,
  (col, row) => (Math.floor(col / THIRD) + Math.floor(row / 2)) % 2 === 0,
  (col, row) => PRODUCT_MODS(col, row) === 0,
  (col, row) => PRODUCT_MODS(col, row) % 2 === 0,
  (col, row) => (((col + row) % 2) + ((col * row) % THIRD)) % 2 === 0,
];

type Cell = { col: number; row: number };
type Grid = { size: number; dark: boolean[]; fixed: boolean[] };

const makeGrid = (size: number): Grid => ({
  size,
  dark: new Array<boolean>(size * size).fill(false),
  fixed: new Array<boolean>(size * size).fill(false),
});

/** Marks a function-pattern module: it is drawn once and never masked. */
const setFixed = (grid: Grid, col: number, row: number, dark: boolean): void => {
  grid.dark[row * grid.size + col] = dark;
  grid.fixed[row * grid.size + col] = true;
};

const TIMING = 6;
const FINDER_CENTER = 3;
const FINDER_REACH = 4;
const FINDER_RING = 2;
const ALIGN_CENTER = 18;
const ALIGN_RING = 1;

const FINDER_SPAN = 9;
const ALIGN_SPAN = 5;
const offsets = (span: number): number[] => range(span).map((step) => step - (span - 1) / 2);

/** Cells within `span` of `center`, each with its distance ring (Chebyshev) from it. */
const squareAround = (center: Cell, span: number): (Cell & { ring: number })[] =>
  offsets(span).flatMap((distRow) =>
    offsets(span).map((distCol) => ({
      col: center.col + distCol,
      row: center.row + distRow,
      ring: Math.max(Math.abs(distCol), Math.abs(distRow)),
    })),
  );

function drawFinders(grid: Grid): void {
  const { size } = grid;
  const centers: Cell[] = [
    { col: FINDER_CENTER, row: FINDER_CENTER },
    { col: size - FINDER_REACH, row: FINDER_CENTER },
    { col: FINDER_CENTER, row: size - FINDER_REACH },
  ];

  centers
    .flatMap((center) => squareAround(center, FINDER_SPAN))
    .filter(({ col, row }) => col >= 0 && row >= 0 && col < size && row < size)
    .forEach(({ col, row, ring }) =>
      setFixed(grid, col, row, ring !== FINDER_RING && ring !== FINDER_REACH),
    );
}

function drawTiming(grid: Grid): void {
  range(grid.size).forEach((pos) => {
    setFixed(grid, TIMING, pos, pos % 2 === 0);
    setFixed(grid, pos, TIMING, pos % 2 === 0);
  });
}

function drawAlignment(grid: Grid, version: number): void {
  if (version === 2) {
    squareAround({ col: ALIGN_CENTER, row: ALIGN_CENTER }, ALIGN_SPAN).forEach(
      ({ col, row, ring }) => setFixed(grid, col, row, ring !== ALIGN_RING),
    );
  }
}

const FORMAT_LEN = 15;
const FORMAT_AXIS = 8;

// bits 6, 7, 8 of the copy beside the top-left finder step round the timing row
const NEAR_BEND: Cell[] = [
  { col: FORMAT_AXIS, row: TIMING + 1 },
  { col: FORMAT_AXIS, row: FORMAT_AXIS },
  { col: FORMAT_AXIS - 1, row: FORMAT_AXIS },
];

const nearCell = (bit: number): Cell => {
  if (bit < TIMING) {
    return { col: FORMAT_AXIS, row: bit };
  }

  return NEAR_BEND[bit - TIMING] ?? { col: FORMAT_LEN - 1 - bit, row: FORMAT_AXIS };
};

const farCell = (bit: number, size: number): Cell =>
  bit < FORMAT_AXIS
    ? { col: size - 1 - bit, row: FORMAT_AXIS }
    : { col: FORMAT_AXIS, row: size - FORMAT_LEN + bit };

/** Where each of the 15 format bits sits, in both copies. */
const formatCells = (size: number): (Cell & { bit: number })[] =>
  range(FORMAT_LEN).flatMap((bit) => [
    { bit, ...nearCell(bit) },
    { bit, ...farCell(bit, size) },
  ]);

function drawFormat(grid: Grid, bits: number): void {
  formatCells(grid.size).forEach(({ bit, col, row }) =>
    setFixed(grid, col, row, ((bits >>> bit) & 1) === 1),
  );
  setFixed(grid, FORMAT_AXIS, grid.size - FORMAT_AXIS, true); // the dark module
}

/** Data modules in placement order: two-module columns right to left, zigzagging, skipping the timing column. */
function dataOrder(size: number): { col: number; row: number }[] {
  const order: { col: number; row: number }[] = [];

  for (let right = size - 1; right >= 1; right -= 2) {
    const start = right <= TIMING ? right - 1 : right;
    const upward = ((start + 1) & 2) === 0;

    for (let vert = 0; vert < size; vert += 1) {
      const row = upward ? size - 1 - vert : vert;

      order.push({ col: start, row }, { col: start - 1, row });
    }
  }

  return order;
}

/** Mode, length, payload and terminator as a bit list, padded with zeros to a whole byte. */
function dataBits(bytes: number[], capacity: number): number[] {
  const bits: number[] = [];
  const push = (value: number, length: number): void =>
    range(length).forEach((index) => bits.push((value >>> (length - 1 - index)) & 1));

  push(MODE_BYTE, MODE_BITS);
  push(bytes.length, COUNT_BITS);
  bytes.forEach((byte) => push(byte, BYTE_BITS));
  push(0, Math.min(MODE_BITS, capacity - bits.length));
  push(0, (BYTE_BITS - (bits.length % BYTE_BITS)) % BYTE_BITS);

  return bits;
}

function dataWords(bytes: number[], version: number): number[] {
  const capacity = VERSIONS[version - 1]?.data ?? 0;
  const bits = dataBits(bytes, capacity * BYTE_BITS);
  const words = range(bits.length / BYTE_BITS).map((index) =>
    Number.parseInt(bits.slice(index * BYTE_BITS, (index + 1) * BYTE_BITS).join(''), 2),
  );

  while (words.length < capacity) {
    words.push(PADS[(words.length - bits.length / BYTE_BITS) % 2] ?? PAD_A);
  }

  return words;
}

// the four penalty rules: runs of 5+, 2x2 blocks, finder-like 1011101 next to 4 light, dark/light balance
const PENALTY_FINDER = 40;
const PENALTY_BLOCK = 3;
const PENALTY_BALANCE = 10;
const PERCENT = 100;
const HALF_PERCENT = 50;
const BALANCE_STEP = 5;

const bitString = (grid: Grid, pick: (major: number, minor: number) => number): string[] =>
  range(grid.size).map((major) =>
    range(grid.size)
      .map((minor) => Number(grid.dark[pick(major, minor)] === true))
      .join(''),
  );

function linePenalty(line: string): number {
  const runs = (line.match(/0{5,}|1{5,}/g) ?? []).reduce((sum, run) => sum + run.length - 2, 0);

  return runs + PENALTY_FINDER * (line.match(/(?=10111010000|00001011101)/g) ?? []).length;
}

function blockPenalty(grid: Grid): number {
  const { size, dark } = grid;
  let count = 0;

  range(size - 1).forEach((row) =>
    range(size - 1).forEach((col) => {
      const here = row * size + col;
      const block = [dark[here], dark[here + 1], dark[here + size], dark[here + size + 1]];

      count += block.every((cell) => cell === block[0]) ? 1 : 0;
    }),
  );

  return count * PENALTY_BLOCK;
}

function penalty(grid: Grid): number {
  const { size } = grid;
  const lines = [
    ...bitString(grid, (row, col) => row * size + col),
    ...bitString(grid, (col, row) => row * size + col),
  ];
  const share = (grid.dark.filter(Boolean).length * PERCENT) / (size * size);
  const balance = PENALTY_BALANCE * Math.floor(Math.abs(share - HALF_PERCENT) / BALANCE_STEP);

  return lines.reduce((sum, line) => sum + linePenalty(line), 0) + blockPenalty(grid) + balance;
}

/** A copy of `grid` with the data modules flipped by `mask` and the format bits for that mask drawn in. */
function masked(grid: Grid, maskIndex: number): Grid {
  const mask = MASKS[maskIndex] ?? ((): boolean => false);
  const copy: Grid = { size: grid.size, dark: [...grid.dark], fixed: [...grid.fixed] };

  copy.dark.forEach((value, pos) => {
    if (!grid.fixed[pos]) {
      copy.dark[pos] = value !== mask(pos % grid.size, Math.floor(pos / grid.size));
    }
  });
  drawFormat(copy, formatBits(LEVEL_H, maskIndex));

  return copy;
}

/** Bit `pos` of the codeword stream, most significant bit first. */
const wordBit = (words: number[], pos: number): boolean =>
  (((words[Math.floor(pos / BYTE_BITS)] ?? 0) >>> (BYTE_BITS - 1 - (pos % BYTE_BITS))) & 1) === 1;

/** The module grid (true = dark), [row][column], without the quiet zone. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];

  if (bytes.length > MAX_BYTES) {
    throw new Error(`QR payload too long: ${bytes.length} bytes (max ${MAX_BYTES})`);
  }

  const version = bytes.length <= V1_BYTES ? 1 : 2;
  const data = dataWords(bytes, version);
  const words = [...data, ...rsEcc(data, VERSIONS[version - 1]?.ecc ?? 0)];
  const grid = makeGrid(SIZE_BASE + SIZE_STEP * version);

  drawTiming(grid); // the finders overwrite its ends, so it goes first
  drawFinders(grid);
  drawAlignment(grid, version);
  drawFormat(grid, 0); // reserves the format areas

  dataOrder(grid.size)
    .filter(({ col, row }) => !grid.fixed[row * grid.size + col])
    .forEach(({ col, row }, pos) => {
      grid.dark[row * grid.size + col] = wordBit(words, pos);
    });

  const best = range(MASKS.length)
    .map((index) => masked(grid, index))
    .reduce((winner, candidate) => (penalty(candidate) < penalty(winner) ? candidate : winner));

  return range(best.size).map((row) =>
    range(best.size).map((col) => best.dark[row * best.size + col] === true),
  );
}

const QUIET_ZONE = 4;

/** An SVG path of the dark modules inside a 4-module quiet zone; draw it in a `0 0 size size` viewBox. */
export function qrPath(text: string, quiet = QUIET_ZONE): { size: number; d: string } {
  const matrix = qrMatrix(text);
  const parts: string[] = [];

  matrix.forEach((line, row) =>
    line.forEach((dark, col) => {
      if (dark) {
        parts.push(`M${col + quiet} ${row + quiet}h1v1h-1z`);
      }
    }),
  );

  return { size: matrix.length + quiet * 2, d: parts.join('') };
}
