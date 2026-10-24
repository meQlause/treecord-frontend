// docs/FE/design-system.md §2.10 "The motion gate", row "Offscreen": one shared IntersectionObserver toggles
// `.offscreen`, and the CSS loops of anything off screen are paused (style.css: `.offscreen * { animation-play-state }`).
let sharedObserver: IntersectionObserver | undefined;

/** Starts watching `element`; returns the function that stops. One observer serves every watched element. */
export const watchOffscreen = (element: Element): (() => void) => {
  sharedObserver ??= new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('offscreen', !entry.isIntersecting));
  });
  sharedObserver.observe(element);

  return () => sharedObserver?.unobserve(element);
};
