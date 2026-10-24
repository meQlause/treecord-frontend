// S10's worker (s10-reproduce.md §1, NFR-064): the seed, the sample and the report re-hash, off the page thread. A 5,000-tree
// population is 4,999 keccak calls plus one canonical-JSON hash; the page only posts and receives. One message in, one out.
import type { Hex } from 'viem';
import type { Json } from './audit.api';
import { auditSeed, reportHash, sampleTreeIds } from './audit.rules';

export type WorkInput = {
  id: number;
  sessionId: string;
  blockHash: Hex;
  population: string[];
  sampleSize: number;
  /** The public report to re-hash, or `null` (an open session, or a tampered block hash). */
  report: Json | null;
};

export type WorkOutput =
  | { id: number; seed: Hex; sample: string[]; reportHash: Hex | null }
  | { id: number; failed: true };

self.onmessage = (event: MessageEvent<WorkInput>): void => {
  const { id, sessionId, blockHash, population, sampleSize, report } = event.data;

  try {
    const seed = auditSeed(sessionId, blockHash);
    const sample = sampleTreeIds(population.map(BigInt), seed, sampleSize).map(String);

    self.postMessage({
      id,
      seed,
      sample,
      reportHash: report === null ? null : reportHash(report),
    } satisfies WorkOutput);
  } catch {
    self.postMessage({ id, failed: true } satisfies WorkOutput);
  }
};
