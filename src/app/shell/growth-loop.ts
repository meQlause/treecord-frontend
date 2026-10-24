/* eslint-disable no-magic-numbers -- GSAP timings and ruler marks of the sidebar art, ported from shell.jsx:88 */
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { RefObject } from 'react';
import type { Selector } from '../../shared/art/Scene';
import { syncMotion } from '../../shared/motion/sync';
import { MILESTONES, growth, type Geometry } from './growth-geometry';

gsap.registerPlugin(useGSAP);

// One timeline tells the story bottom-up: a seed lands, roots draw, then the tree grows milestone by milestone up the
// 36-month ruler, each one pinged by the GPS satellite; at M36 the verified badge pops and "proven." lands with its
// underline. It loops; the motion gate pauses it (Pause motion, off screen, hidden tab); reduced motion shows the
// finished picture.
const MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
};
const INK_ON = { fill: '#6f9a58', stroke: '#6f9a58' };
const INK_OFF = { fill: '#f6f9f1', stroke: '#b9cba6' };
const LABEL_ON = { fill: '#2f5130' };
const LABEL_OFF = { fill: '#9aa88c' };
const WORD = '.ga-word';
const TREE = '.ga-tree';
const BADGE = '.ga-badge';
const PROG = '.ga-prog';
const TICK = '.ga-tick';
const LAB = '.ga-lab';
const BEAM = '.ga-beam';
const SEED = '.ga-seed';
const LIFE = '.ga-life,.ga-text';
const STROKES = '.ga-line,.ga-check,.ga-root';
const SOON = '<0.1';
const EASE_OUT = 'power2.out';

type Line = gsap.core.Timeline;

/** The `index`-th match of `query`, as a list (empty when there is none). */
const nth = (select: Selector, query: string, index: number): Element[] =>
  select(query).slice(index, index + 1);

function showEndPose(select: Selector): void {
  gsap.set(select(WORD), { yPercent: 0, opacity: 1 });
  gsap.set(select(STROKES), { strokeDashoffset: 0 });
  gsap.set(select(TREE), { scale: 1, opacity: 1 });
  gsap.set(select(PROG), { strokeDashoffset: 0 });
  gsap.set(select(BADGE), { scale: 1, opacity: 1 });
  gsap.set(select(TICK), INK_ON);
  gsap.set(select(LAB), LABEL_ON);
}

function intro(timeline: Line, select: Selector, geo: Geometry): void {
  timeline
    .set(select(WORD), { yPercent: 110, opacity: 0 })
    .set(select(`${STROKES},${BEAM}`), { strokeDashoffset: 1 })
    .set(select(PROG), { strokeDashoffset: 1 })
    .set(select(TICK), INK_OFF)
    .set(select(LAB), LABEL_OFF)
    .set(select(TREE), { scale: 0, rotation: 0, opacity: 1 })
    .set(select(BADGE), { scale: 0, opacity: 0 })
    .set(select(LIFE), { opacity: 1 })
    .to(nth(select, WORD, 0), { yPercent: 0, opacity: 1, duration: 0.6 })
    .to(nth(select, WORD, 1), { yPercent: 0, opacity: 1, duration: 0.6 }, '<0.15')
    .fromTo(
      select(SEED),
      { y: 0, opacity: 0 },
      { y: geo.ground - geo.top + 4, opacity: 1, duration: 0.75, ease: 'power2.in' },
      SOON,
    )
    .to(select(SEED), { opacity: 0, duration: 0.15 })
    .to(
      select('.ga-root'),
      { strokeDashoffset: 0, duration: 0.8, stagger: 0.08, ease: EASE_OUT },
      '<',
    );
}

function milestone(timeline: Line, select: Selector, geo: Geometry, index: number): void {
  const month = MILESTONES[index]?.month ?? 0;
  const duration = index ? 0.6 : 0.4;
  const ring = select('.ga-ring');

  timeline
    .to(select(TREE), { scale: growth(month), duration, ease: EASE_OUT }, index ? '+=0.15' : SOON)
    .to(select(PROG), { strokeDashoffset: 1 - growth(month), duration, ease: EASE_OUT }, '<')
    .fromTo(
      nth(select, BEAM, index),
      { opacity: 0.9 },
      { strokeDashoffset: 0, duration: 0.25, ease: 'power1.in' },
      '>-0.05',
    )
    .set(ring, { attr: { cy: geo.tips[index] ?? geo.ground } })
    .fromTo(
      ring,
      { attr: { r: 2 }, opacity: 0.9 },
      { attr: { r: 13 }, opacity: 0, duration: 0.6, ease: EASE_OUT },
    )
    .to(nth(select, TICK, index), { ...INK_ON, duration: 0.2 }, '<')
    .to(nth(select, LAB, index), { ...LABEL_ON, duration: 0.2 }, '<')
    .to(nth(select, BEAM, index), { opacity: 0, duration: 0.35, ease: 'power1.in' }, SOON);
}

function finale(timeline: Line, select: Selector): void {
  timeline
    .to(select(BADGE), { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(3)' }, '+=0.1')
    .to(nth(select, WORD, 2), { yPercent: 0, opacity: 1, duration: 0.6 }, '<')
    .to(select('.ga-check'), { strokeDashoffset: 0, duration: 0.35, ease: 'power1.out' }, '<0.25')
    .to(select('.ga-line'), { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, SOON)
    .to(select(TREE), { rotation: 1.4, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: 1 })
    .to(select(LIFE), { opacity: 0, duration: 0.5, ease: 'power1.in' })
    .to(select(TICK), { ...INK_OFF, duration: 0.5 }, '<')
    .to(select(LAB), { ...LABEL_OFF, duration: 0.5 }, '<');
}

function play(select: Selector, geo: Geometry): gsap.core.Animation[] {
  const timeline = gsap.timeline({
    repeat: -1,
    repeatDelay: 0.3,
    defaults: { ease: 'power3.out' },
  });

  intro(timeline, select, geo);
  MILESTONES.forEach((_unused, index) => milestone(timeline, select, geo, index));
  finale(timeline, select);

  const bob = gsap.to(select('.ga-sat'), {
    y: -3,
    duration: 1.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  return [timeline, bob];
}

/** Draws the sidebar art's loop once the SVG exists (`geo.height > 0`); redraws when the box changes height. */
export function useGrowthLoop(root: RefObject<HTMLDivElement | null>, geo: Geometry): void {
  useGSAP(
    () => {
      const element = root.current;

      if (element === null || geo.height === 0) {
        return undefined;
      }

      const select: Selector = gsap.utils.selector(root);
      const media = gsap.matchMedia();

      media.add(MEDIA, (context) => {
        gsap.set(select(TREE), { svgOrigin: `${geo.trunkX} ${geo.ground}` });
        gsap.set(select(BADGE), { svgOrigin: `${geo.badge.x} ${geo.badge.y}` });

        if (context.conditions?.reduce) {
          showEndPose(select);

          return undefined;
        }

        return syncMotion(element, play(select, geo));
      });

      return () => media.revert();
    },
    { scope: root, dependencies: [geo.height], revertOnUpdate: true },
  );
}

/* eslint-enable no-magic-numbers */
