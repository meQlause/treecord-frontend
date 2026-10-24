// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useLocation } from 'react-router';
import { useEffect, useRef, useState, type RefObject } from 'react';

// shell.md §4 Header, mockup main.jsx:275-290. Compact once the page heading has scrolled away (120 px on pages
// without one). The progress line goes straight to a CSS variable, so scrolling never re-renders React.
const HEADING_OVERLAP = 64;
const NO_HEADING_LIMIT = 120;
const PROGRESS_DIGITS = 4;

const compactLimit = (): number => {
  const heading = document.querySelector<HTMLElement>('.page-heading');

  return heading ? heading.offsetTop + heading.offsetHeight - HEADING_OVERLAP : NO_HEADING_LIMIT;
};

const progressOf = (): string => {
  const max = document.documentElement.scrollHeight - window.innerHeight;

  return max > 0 ? Math.min(1, window.scrollY / max).toFixed(PROGRESS_DIGITS) : '0';
};

/** The ref for the <header> and whether it is compact. */
export function useHeaderScroll(): { ref: RefObject<HTMLElement | null>; compact: boolean } {
  const ref = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    let frame = 0;
    const update = (): void => {
      frame = 0;
      setCompact(window.scrollY > compactLimit());
      ref.current?.style.setProperty('--progress', progressOf());
    };

    const onScroll = (): void => {
      frame ||= requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // the page changes under the same header, so measure again on every route
  }, [pathname]);

  return { ref, compact };
}
