import { AnimatePresence, motion } from 'motion/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useLocation, useOutlet } from 'react-router';
import { useEffect } from 'react';

// Mockup main.jsx:341. The content changes, the shell (header, sidebar, footer) stays. Keyed by pathname, so a
// filter in the query string never replays it.
const ENTER = { opacity: 0, y: 12 };
const SHOWN = { opacity: 1, y: 0 };
const LEAVE = { opacity: 0, y: -8 };
const FADE = { duration: 0.22, ease: 'easeOut' } as const;

export function PageMotion() {
  const { pathname } = useLocation();
  // the outlet element is read here, so the page that is leaving keeps its own route while it fades out
  const outlet = useOutlet();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="page-motion"
        initial={ENTER}
        animate={SHOWN}
        exit={LEAVE}
        transition={FADE}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
