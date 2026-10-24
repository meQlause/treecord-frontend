import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useRef } from 'react';
import { syncMotion } from '../../shared/motion/sync';
import { SHELL_COPY } from './shell.copy';

gsap.registerPlugin(useGSAP);

// Mockup shell.jsx:191. "Every tree," and the word after it rolls through the record, planted to proven.
const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const HIDE_BELOW = 110;
const SHOW_SECONDS = 0.55;
const HIDE_SECONDS = 0.4;
const HOLD = '+=1.2';
const HOLD_LAST = '+=2.6';

/** Screen readers get the finished sentence; the rolling words are decoration. */
export function FooterLine() {
  const root = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const element = root.current;

      if (element === null) {
        return undefined;
      }

      const media = gsap.matchMedia();

      media.add(MOTION_OK, () => {
        const words = gsap.utils.toArray<Element>('.ft-word', element);
        const timeline = gsap.timeline({ repeat: -1 });

        gsap.set(words, { yPercent: HIDE_BELOW, opacity: 0 });
        words.forEach((word, index) =>
          timeline
            .to(word, { yPercent: 0, opacity: 1, duration: SHOW_SECONDS, ease: 'power3.out' })
            .to(
              word,
              { yPercent: -HIDE_BELOW, opacity: 0, duration: HIDE_SECONDS, ease: 'power2.in' },
              index === words.length - 1 ? HOLD_LAST : HOLD,
            ),
        );

        return syncMotion(element, [timeline]);
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <span className="ft-line" ref={root}>
      <span className="sr-only">{SHELL_COPY.footerSpoken}</span>
      <span aria-hidden="true">
        {SHELL_COPY.footerLead}
        <span className="ft-words">
          {SHELL_COPY.footerWords.map((word) => (
            <em key={word} className="ft-word">
              {word}
            </em>
          ))}
        </span>
      </span>
    </span>
  );
}
