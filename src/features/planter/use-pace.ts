// Polling that backs off (NFR-063): 2 s, then 1.5 times longer after each poll that found the same data, up to 5 s; a change
// starts over. `pace(data, moving)` is a TanStack `refetchInterval` body: `false` once nothing is moving.
import { useRef } from 'react';
import { FIRST_POLL_MS, pollDelay } from '../accounts/accounts.rules';

export function usePace(): (data: unknown, moving: boolean) => number | false {
  const last = useRef<{ seen: unknown; delay: number }>({ seen: undefined, delay: FIRST_POLL_MS });

  return (data, moving) => {
    if (!moving) {
      return false;
    }

    last.current = {
      seen: data,
      delay: pollDelay(last.current.delay, data !== last.current.seen),
    };

    return last.current.delay;
  };
}
