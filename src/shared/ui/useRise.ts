import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { RefObject } from 'react';

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)';
const VISIBLE_SHARE = 0.25;
const GROW_SECONDS = 1;
const RISE_SECONDS = 0.45;
const RISE_START = 0.1;
const RISE_STAGGER = 0.018;
const RISE_DISTANCE = '+=10';
const RISE_EASE = 'back.out(2)';

/**
 * A one-time entrance for a picture: `.grow` bars widen and `.rise` pieces float up when the card first shows.
 * Reduced motion shows the picture as is. Mockup donor.jsx:128.
 */
export function useRise(root: RefObject<SVGSVGElement | null>): void {
  useGSAP(
    () => {
      const svg = root.current;

      if (svg === null) {
        return undefined;
      }

      const media = gsap.matchMedia();

      media.add(NO_PREFERENCE, () => {
        const rise = svg.querySelectorAll('.rise');
        const grow = svg.querySelectorAll('.grow');
        const timeline = gsap.timeline({ paused: true });

        if (grow.length > 0) {
          timeline.from(
            grow,
            { scaleX: 0, transformOrigin: '0 50%', duration: GROW_SECONDS, ease: 'power2.out' },
            0,
          );
        }

        if (rise.length > 0) {
          const options = {
            y: RISE_DISTANCE,
            opacity: 0,
            duration: RISE_SECONDS,
            stagger: RISE_STAGGER,
            ease: RISE_EASE,
          };

          timeline.from(rise, options, RISE_START);
        }

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting === true) {
              timeline.play();
              observer.disconnect();
            }
          },
          { threshold: VISIBLE_SHARE },
        );

        observer.observe(svg);

        return () => observer.disconnect();
      });

      // the observer is not tied to the hook's context, so it is reverted here
      return () => media.revert();
    },
    { scope: root },
  );
}
