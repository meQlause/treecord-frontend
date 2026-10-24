import { MotionGlobalConfig } from 'motion/react';
import { useEffect, useState } from 'react';

const REDUCED = '(prefers-reduced-motion: reduce)';

/**
 * K6. True while motion must be still: the user paused it, reduced motion is on, or the tab is hidden. The shell puts
 * it on `.app` as `motion-paused`; Motion's own animations stop with it (design-system §2.10, NFR-030–NFR-032).
 */
export const useMotionGate = (paused: boolean): boolean => {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED).matches);
  const [hidden, setHidden] = useState(() => document.hidden);

  useEffect(() => {
    const query = window.matchMedia(REDUCED);
    const onReduced = (): void => setReduced(query.matches);
    const onVisibility = (): void => setHidden(document.hidden);

    query.addEventListener('change', onReduced);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      query.removeEventListener('change', onReduced);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const still = paused || reduced || hidden;

  useEffect(() => {
    MotionGlobalConfig.skipAnimations = still;
  }, [still]);

  return still;
};
