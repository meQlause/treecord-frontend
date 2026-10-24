// The certificate's entrance (mockup my-carbon.jsx:121-137): the guilloche draws, the lines rise, the amount counts up,
// the seal lands, the signature is written and the journey fills. Plays once; the seal's rosette turns on. Everything
// goes through the motion gate (Pause motion, reduced motion, off screen), design-system §2.10.
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { RefObject } from 'react';
import { tonnes } from '../../shared/format/carbon';
import { syncMotion } from '../../shared/motion/sync';

gsap.registerPlugin(useGSAP);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const SPIN_SECONDS = 40;
const FULL_TURN = 360;

export function useCertificateMotion(root: RefObject<HTMLElement | null>, amount: string): void {
  useGSAP(
    () => {
      const element = root.current;

      if (element === null) {
        return undefined;
      }

      const select = gsap.utils.selector(root);
      const media = gsap.matchMedia();

      media.add(MOTION_OK, () => {
        const figure = select('.rc-amount strong')[0];
        const count = { units: 0 };

        gsap.set(select('.rc-rosette'), { svgOrigin: '0 0' });
        const entrance = gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from(select('.rc-guilloche path'), {
            strokeDashoffset: 1,
            duration: 1.6,
            stagger: 0.12,
            ease: 'power2.inOut',
          })
          .from(select('.rc-line'), { y: 14, opacity: 0, duration: 0.6, stagger: 0.08 }, '0.15')
          .to(
            count,
            {
              units: Number(amount),
              duration: 1.3,
              ease: 'power2.out',
              onUpdate: () => {
                if (figure !== undefined) {
                  figure.textContent = tonnes(String(Math.round(count.units)));
                }
              },
            },
            '0.4',
          )
          .from(
            select('.rc-seal'),
            {
              scale: 0,
              rotation: -120,
              duration: 0.9,
              ease: 'back.out(1.8)',
              transformOrigin: '50% 40%',
            },
            '0.8',
          )
          .from(
            select('.rc-sign path'),
            { strokeDashoffset: 1, duration: 1.2, ease: 'power1.inOut' },
            '1.2',
          )
          .from(
            select('.rc-track b'),
            { scaleX: 0, duration: 1.2, ease: 'power2.inOut', transformOrigin: '0 50%' },
            '0.6',
          )
          .from(
            select('.rc-node'),
            { scale: 0, duration: 0.45, stagger: 0.28, ease: 'back.out(2.4)' },
            '0.6',
          );
        const spin = gsap.to(select('.rc-rosette'), {
          rotation: FULL_TURN,
          duration: SPIN_SECONDS,
          ease: 'none',
          repeat: -1,
        });

        return syncMotion(element, [entrance, spin]);
      });

      return () => media.revert();
    },
    { scope: root, dependencies: [amount], revertOnUpdate: true },
  );
}
