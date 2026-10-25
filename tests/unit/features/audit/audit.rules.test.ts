import { describe, expect, it } from 'vitest';
import { auditSeed, reportHash, sampleTreeIds } from '../../../../src/features/audit/audit.rules';

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
