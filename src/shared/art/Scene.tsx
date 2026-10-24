import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useRef, type ReactNode, type RefObject } from 'react';
import { syncMotion } from '../motion/sync';

gsap.registerPlugin(useGSAP);

// K5. Mockup planter-pages.jsx:17-23. GSAP plays the scenes, Motion the cards (design-system §2.10).
const MOTION_OK = '(prefers-reduced-motion: no-preference)';

/** Finds elements of the scene by CSS selector, scoped to its own SVG. */
export type Selector = (target: string) => Element[];

type Animation = gsap.core.Animation;

/** Draws one scene's loop(s). Every returned animation is paused and resumed by the motion gate. */
export type Build = (select: Selector) => Animation | Animation[];

/**
 * Runs `build` once the SVG in `root` is mounted and motion is allowed, and hands what it returns to the motion gate
 * (Pause motion, reduced motion, off screen, hidden tab). Everything is reverted on unmount, or on a change of `deps`.
 * Every GSAP loop of the art goes through this (design-system §3 rule 7).
 */
export function useSceneLoop(
  root: RefObject<SVGSVGElement | null>,
  build: Build,
  deps: unknown[] = [],
): void {
  useGSAP(
    () => {
      const element = root.current;

      if (element === null) {
        return undefined;
      }

      const select: Selector = gsap.utils.selector(root);
      const media = gsap.matchMedia();

      media.add(MOTION_OK, () => syncMotion(element, [build(select)].flat()));

      return () => media.revert();
    },
    { scope: root, dependencies: deps, revertOnUpdate: true },
  );
}

// the sky and the two hills every heading scene stands on
const SKY = (
  <>
    <defs>
      <linearGradient id="pl-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#eef2e6" />
        <stop offset="1" stopColor="#dde7d2" />
      </linearGradient>
    </defs>
    <rect width="480" height="240" fill="url(#pl-sky)" />
    <polygon points="0,198 90,184 200,196 300,182 400,194 480,186 480,240 0,240" fill="#c4d4b3" />
    <polygon points="0,220 140,208 280,222 420,210 480,216 480,240 0,240" fill="#9db892" />
  </>
);

type SceneProps = {
  /** Draws the scene's loop; it finds the scene's own elements with `select('.class')`. */
  build: Build;
  /** Rebuild the loop when these change; the default builds once. */
  deps?: unknown[];
  children: ReactNode;
};

/** K5. A heading scene (480x240): the shared sky and hills, its own drawing, and one GSAP loop from `build`. Decorative. */
export function Scene({ build, deps, children }: SceneProps) {
  const root = useRef<SVGSVGElement>(null);

  useSceneLoop(root, build, deps);

  return (
    <svg
      ref={root}
      className="landscape batch-art"
      viewBox="0 0 480 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {SKY}
      {children}
    </svg>
  );
}
