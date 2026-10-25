import type { Hex } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  auditSeed,
  flip,
  reportHash,
  sampleTreeIds,
} from '../../../../src/features/audit/audit.rules';
import { NOTES, NOTES_HASH, REPORT, REPORT_HASH } from '../../../fidelity/fixtures/audit-report';

// REG-002 / NFR-070 (docs/BE/features/audit.md §10): the browser copy must hash exactly like the server, so these are the
// shared vectors the server's own REG-002 test asserts.
describe('audit.rules: the shared vectors', () => {
  it('FR-192: the canonical-JSON object hashes to the server vector', () => {
    expect(reportHash({ b: 1, a: [2, { d: null, c: 'x' }] })).toBe(
      '0x2ab4646d9bddae1eccca6d103cffefb892e463a60753a7dc105f52fa1288dae0',
    );
  });

  it('FR-192: key order does not change the hash', () => {
    expect(reportHash({ a: [2, { c: 'x', d: null }], b: 1 })).toBe(
      reportHash({ b: 1, a: [2, { d: null, c: 'x' }] }),
    );
  });

  it('FR-184: the seed of "demo-audit" and the block 0x39e4…a4cd, in any letter case', () => {
    const block = '0x39e41cfd9e316d39bb6ad8058c9cfbbb2d19fa7938c68e1e32009e56e735a4cd';
    const seed = '0xa920a9cc6dde5a31395e6f39b670ecb780509133c1ea75b57713966abc442fc9';

    expect(auditSeed('demo-audit', block)).toBe(seed);
    expect(auditSeed('DEMO-AUDIT', block)).toBe(seed);
  });

  it('FR-184: the closed demo session draws the published seed', () => {
    expect(
      auditSeed(
        '868c029f-2a97-4721-b005-f66b88e3768b',
        '0xd0e38899a3d5c3657e22f95fdada4f0da6aa36ea51545d334455da8663d50701',
      ),
    ).toBe('0x791f45521e15b6066b8e598549c8dd5f59d9283ffe919c1cb3418767d3534c49');
  });

  it('NFR-064: a 5,000-tree population draws its sample, the same one each time', () => {
    const population = Array.from({ length: 5000 }, (...[, index]) => BigInt(index + 1));
    const seed = auditSeed(
      'demo-audit',
      '0x39e41cfd9e316d39bb6ad8058c9cfbbb2d19fa7938c68e1e32009e56e735a4cd',
    );
    const sample = sampleTreeIds(population, seed, 50);

    expect(sample).toHaveLength(50);
    expect(sampleTreeIds([...population].reverse(), seed, 50)).toEqual(sample);
  });
});

const flipped = (hash: Hex): Hex => flip(hash) as Hex;

describe('audit.rules: the S10 vectors (NFR-070)', () => {
  const block = '0x39e41cfd9e316d39bb6ad8058c9cfbbb2d19fa7938c68e1e32009e56e735a4cd';
  const ids = [3001n, 3020n, 3021n, 3091n, 3092n, 3103n, 3104n];

  it('FR-184: the sample of "demo-audit", and of the block with its last bit flipped (FR-206)', () => {
    const seed = auditSeed('demo-audit', block);

    expect(sampleTreeIds(ids, seed, 3)).toEqual([3001n, 3091n, 3104n]);
    expect(sampleTreeIds(ids, auditSeed('demo-audit', flipped(block)), 3)).toEqual([
      3103n,
      3001n,
      3091n,
    ]);
  });

  it('the uuid session e9219997 draws the published seed and, flipped, 3020, 3091, 3001', () => {
    const id = 'e9219997-5281-4602-b694-f3c4b08cf7c3';

    expect(auditSeed(id, block)).toBe(
      '0x09c2dea7c3ba4fc471025dabff6ef8967bbe0efb0c99a832da02e3e8f0d75778',
    );
    expect(sampleTreeIds(ids, auditSeed(id, flipped(block)), 3)).toEqual([3020n, 3091n, 3001n]);
  });

  it('the closed session: its public report and its sealed notes hash to the published values', () => {
    expect(reportHash(REPORT as never)).toBe(REPORT_HASH);
    expect(reportHash(NOTES as never)).toBe(NOTES_HASH);
  });
});
