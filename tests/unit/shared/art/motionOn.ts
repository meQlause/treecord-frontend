// tests/unit/setup.ts says "no motion preference" never matches, so GSAP's matchMedia skips every scene. A test of an
// animated piece calls this to say the visitor allows motion; it returns the function that puts the stub back.
export function motionOn(): () => void {
  const original = window.matchMedia;

  window.matchMedia = ((query: string) => ({
    matches: query.includes('no-preference'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof window.matchMedia;

  return () => {
    window.matchMedia = original;
  };
}
