type Playable = { pause: () => unknown; play: () => unknown };

/**
 * Keeps GSAP loops in step with the app's motion toggle and pauses them off screen (mockup art.jsx:163). GSAP ignores
 * CSS `animation-play-state`, so every `useGSAP` returns this. Returns the observers' cleanup.
 */
export const syncMotion = (element: Element, animations: Playable[]): (() => void) => {
  const app = element.closest('.app');
  let visible = true;
  const sync = (): void => {
    const paused = app?.classList.contains('motion-paused') === true || !visible;

    animations.forEach((animation) => (paused ? animation.pause() : animation.play()));
  };

  const mutations = new MutationObserver(sync);
  const intersections = new IntersectionObserver((entries) => {
    visible = entries.at(-1)?.isIntersecting ?? visible;
    sync();
  });

  if (app !== null) {
    mutations.observe(app, { attributes: true, attributeFilter: ['class'] });
  }

  intersections.observe(element);
  sync();

  return () => {
    mutations.disconnect();
    intersections.disconnect();
  };
};
