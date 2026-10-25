// S10's recomputation (s10-reproduce.md §1): the work runs in a module worker, off the page thread. A result is cached per block hash, so toggling the tamper test back reuses the real run (FR-206 acc. 2).
import { useQuery } from '@tanstack/react-query';
import type { Hex } from 'viem';
import type { Reproduction } from './audit.api';
import type { WorkInput, WorkOutput } from './reproduce.worker';

type Request = Omit<WorkInput, 'id'>;

export type Recomputed = { seed: Hex; sample: string[]; reportHash: Hex | null };

/**
 * One module worker per recomputation, ended as soon as it answers: nothing outlives the page, and a mount that React
 * undoes and repeats (StrictMode) cannot end a worker that a pending query is still waiting on.
 */
const recompute = (request: Request): Promise<Recomputed> =>
  new Promise<Recomputed>((resolve, reject) => {
    const worker = new Worker(new URL('./reproduce.worker.ts', import.meta.url), {
      type: 'module',
    });
    const fail = (): void => {
      worker.terminate();
      reject(new Error('The recomputation failed'));
    };

    worker.onmessage = (event: MessageEvent<WorkOutput>): void => {
      worker.terminate();

      if ('failed' in event.data) {
        reject(new Error('The recomputation failed'));
      } else {
        resolve(event.data);
      }
    };

    worker.onerror = fail;
    worker.postMessage({ ...request, id: 1 } satisfies WorkInput);
  });

/** The seed, sample and (for the real block hash of a closed session) the report hash for one block hash. */
export function useRecompute(data: Reproduction, blockHash: string, enabled: boolean) {
  const real = blockHash === data.blockHash;

  return useQuery({
    queryKey: ['reproduce-sample', data.sessionId, blockHash],
    queryFn: () =>
      recompute({
        sessionId: data.sessionId,
        blockHash: blockHash as Hex,
        population: data.population,
        sampleSize: data.sampleSize,
        report: real ? data.report : null,
      }),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}
