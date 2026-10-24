// The refresh dim of a list (ui-gaps pattern 2): the cards of a filter that is loading fade only if it takes a while, so a fast
// answer never flickers. Shared by S16 and S20.
import { useEffect, useState } from 'react';

export const FADE_AFTER_MS = 300;

/** True once `active` has held for `delay` ms: the cards of a filter that is loading fade only if it takes a while. */
export function useFadeAfter(active: boolean, delay: number): boolean {
  const [late, setLate] = useState(false);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = setTimeout(() => setLate(true), delay);

    return () => {
      clearTimeout(timer);
      setLate(false);
    };
  }, [active, delay]);

  return late;
}
