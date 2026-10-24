import { MotionConfig } from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useMotionGate } from '../../shared/motion/useMotionGate';

// shell.md §4 "Pause motion": the one place the preference lives. `still` is what `.app` turns into `motion-paused`.
const STORAGE_KEY = 'treecord-motion';
const REDUCED = '(prefers-reduced-motion: reduce)';

type MotionState = {
  paused: boolean;
  reduced: boolean;
  hidden: boolean;
  /** paused, reduced or hidden: every loop and transition stops. */
  still: boolean;
  toggle: () => void;
};

const MotionContext = createContext<MotionState | null>(null);

const readPaused = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'paused';
  } catch {
    return false;
  }
};

const writePaused = (paused: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, paused ? 'paused' : 'playing');
  } catch {
    // storage blocked: the choice lives in memory until the tab closes
  }
};

const subscribeReduced = (notify: () => void): (() => void) => {
  const query = window.matchMedia(REDUCED);

  query.addEventListener('change', notify);

  return () => query.removeEventListener('change', notify);
};

const subscribeHidden = (notify: () => void): (() => void) => {
  document.addEventListener('visibilitychange', notify);

  return () => document.removeEventListener('visibilitychange', notify);
};

export function MotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(readPaused);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches);
  const hidden = useSyncExternalStore(subscribeHidden, () => document.hidden);
  // the gate also writes MotionGlobalConfig.skipAnimations, so Motion stops with the toggle
  const still = useMotionGate(paused);
  const toggle = useCallback(() => {
    writePaused(!paused);
    setPaused(!paused);
  }, [paused]);
  const value = useMemo(
    () => ({ paused, reduced, hidden, still, toggle }),
    [paused, reduced, hidden, still, toggle],
  );

  return (
    <MotionContext.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </MotionContext.Provider>
  );
}

export function useMotion(): MotionState {
  const state = useContext(MotionContext);

  if (state === null) {
    throw new Error('useMotion needs a MotionProvider above it');
  }

  return state;
}
