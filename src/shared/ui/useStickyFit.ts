import { useEffect, useRef, type RefObject } from 'react';

const DEFAULT_TOP = 84;

type StickyFit = {
  /** The CSS variable that receives the height the column may take (`--side-room`, `--rail-room`). */
  roomVar: string;
  /** Set, the column is also pulled up when it is taller than the screen, so its bottom stays in view. */
  topVar?: string;
  /** The sticky offset below the header in px. Left out, it is read from the element's own `top` (84 if unset). */
  top?: number;
  /** Space kept free at the bottom of the screen in px. */
  gap?: number;
};

/**
 * K7. A sticky column that fits the screen below the header and never runs past the layout it sits in (end of page).
 * Mockup shell.jsx:37 (sidebar) and carbon.jsx:129 (rail). Returns the ref to put on the column.
 */
export function useStickyFit<T extends HTMLElement>({
  roomVar,
  topVar,
  top,
  gap = 0,
}: StickyFit): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    const parent = element?.parentElement;

    if (!element || !parent) {
      return undefined;
    }

    const offset = (): number =>
      top ?? (Number.parseFloat(getComputedStyle(element).top) || DEFAULT_TOP);
    const fit = (): void => {
      const room = Math.min(
        window.innerHeight - offset() - gap,
        parent.getBoundingClientRect().bottom - offset(),
      );

      element.style.setProperty(roomVar, `${room}px`);
    };

    const measure = (): void => {
      if (topVar !== undefined) {
        // measure the column at its natural height, then keep its bottom in view on short screens
        element.style.setProperty(roomVar, '0px');
        element.style.setProperty(
          topVar,
          `${Math.min(offset(), window.innerHeight - element.offsetHeight - gap)}px`,
        );
      }

      fit();
    };

    // jsdom has no ResizeObserver; the window listeners still cover every other case
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);

    resize?.observe(parent);
    measure();
    window.addEventListener('scroll', fit, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      resize?.disconnect();
      window.removeEventListener('scroll', fit);
      window.removeEventListener('resize', measure);
    };
  }, [roomVar, topVar, top, gap]);

  return ref;
}
