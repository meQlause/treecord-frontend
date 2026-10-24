// S10's recomputation (s10-reproduce.md §1): one module worker per page, terminated on unmount, answering one request at a
// time by id. A result is cached per block hash, so toggling the tamper test back reuses the real run (FR-206 acc. 2).
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import type { Hex } from 'viem';
import type { Reproduction } from './audit.api';
import type { WorkInput, WorkOutput } from './reproduce.worker';

type Request = Omit<WorkInput, 'id'>;

export type Recomputed = { seed: Hex; sample: string[]; reportHash: Hex | null };

type Waiting = { resolve: (value: Recomputed) => void; reject: (error: Error) => void };

function useWorker() {
  const worker = useRef<Worker | null>(null);
  const waiting = useRef(new Map<number, Waiting>());
  const counter = useRef(0);

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  const failAll = useCallback((): void => {
    waiting.current.forEach(({ reject }) => reject(new Error('The recomputation failed')));
    waiting.current.clear();
  }, []);

  return useCallback(
    (request: Request): Promise<Recomputed> => {
      if (worker.current === null) {
        const started = new Worker(new URL('./reproduce.worker.ts', import.meta.url), {
          type: 'module',
        });

        started.onmessage = (event: MessageEvent<WorkOutput>): void => {
          const answer = event.data;
          const entry = waiting.current.get(answer.id);

          waiting.current.delete(answer.id);

          if ('failed' in answer) {
            entry?.reject(new Error('The recomputation failed'));
          } else {
            entry?.resolve(answer);
          }
        };

        started.onerror = failAll;
        worker.current = started;
      }

      counter.current += 1;

      const id = counter.current;
      const target = worker.current;

      return new Promise<Recomputed>((resolve, reject) => {
        waiting.current.set(id, { resolve, reject });
        target.postMessage({ ...request, id } satisfies WorkInput);
      });
    },
    [failAll],
  );
}

/** The seed, sample and (for the real block hash of a closed session) the report hash for one block hash. */
export function useRecompute(data: Reproduction, blockHash: string, enabled: boolean) {
  const run = useWorker();
  const real = blockHash === data.blockHash;

  return useQuery({
    queryKey: ['reproduce-sample', data.sessionId, blockHash],
    queryFn: () =>
      run({
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
