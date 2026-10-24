import type { HTMLMotionProps } from 'motion/react';

// Framer-style presets shared by the React state transitions (GSAP keeps the SVG scenes). Mockup art.jsx:173-184,
// design-system §2.10.
const EASE_SOFT = 0.2;
const EASE_STEEP = 0.8;

export const EASE = [EASE_SOFT, EASE_STEEP, EASE_SOFT, 1] as const;

const CARD_RISE = 18;
const CARD_RISE_SECONDS = 0.45;
const CARD_STAGGER = 0.06;
const CARD_COLUMNS = 3;
const CARD_VIEW_AMOUNT = 0.12;
const CARD_EXIT_SECONDS = 0.15;
const CARD_EXIT_SCALE = 0.97;
const CARD_SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const;
const CARD_LIFT = -4;
const CARD_TAP_SCALE = 0.99;

/** A catalog card: rises in once when scrolled to, slides when a filter reflows the grid, lifts on hover. */
export const cardMotion = (index = 0, lift = true): HTMLMotionProps<'div'> => ({
  layout: 'position',
  initial: { opacity: 0, y: CARD_RISE },
  whileInView: {
    opacity: 1,
    y: 0,
    transition: {
      duration: CARD_RISE_SECONDS,
      ease: EASE,
      delay: (index % CARD_COLUMNS) * CARD_STAGGER,
    },
  },
  viewport: { once: true, amount: CARD_VIEW_AMOUNT },
  exit: { opacity: 0, scale: CARD_EXIT_SCALE, transition: { duration: CARD_EXIT_SECONDS } },
  transition: CARD_SPRING,
  ...(lift ? { whileHover: { y: CARD_LIFT }, whileTap: { scale: CARD_TAP_SCALE } } : {}),
});

/** A dialog or popover opening with a spring; `exit` plays when it is unmounted inside AnimatePresence. */
export const popMotion = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: CARD_EXIT_SECONDS } },
  transition: { type: 'spring', stiffness: 420, damping: 32 },
} as const;
