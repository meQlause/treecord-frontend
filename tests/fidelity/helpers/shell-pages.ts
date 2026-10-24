// The pages S03 and S11 are not built yet (src/features/**/*.page.tsx hold a heading only), but two shell criteria
// speak of what a page holds: SH-AC16 of its buttons, SH-AC26 of its heading and its length. Where the real page does
// not have them, these add them to the page the shell mounted, so the shell is judged on what it owns (the offline
// fieldset, the header scroll). Once the real page has them nothing is added.
import type { Page } from '@playwright/test';

const FIELDSET = 'fieldset.ws-state-body';
const TALL = 4000;
const HEADING = 300;

/** Buttons named `names` inside the shell's page frame (`<fieldset className="ws-state-body">`), if absent. */
export const standInControls = async (page: Page, names: readonly string[]): Promise<void> => {
  await page.evaluate(
    ({ selector, labels }) => {
      const frame = document.querySelector(selector);

      for (const label of labels) {
        const present = [...document.querySelectorAll('button')].some(
          (button) => button.textContent === label,
        );

        if (frame && !present) {
          const button = document.createElement('button');

          button.type = 'button';
          button.textContent = label;
          frame.append(button);
        }
      }
    },
    { selector: FIELDSET, labels: names },
  );
};

/** A `.page-heading` and enough height to scroll, if the page has neither. */
export const standInTallPage = async (page: Page): Promise<void> => {
  await page.evaluate(
    ({ height, heading }) => {
      const host = document.querySelector('.page-motion') ?? document.body;

      if (!document.querySelector('.page-heading')) {
        const block = document.createElement('div');

        block.className = 'page-heading';
        block.style.height = `${heading}px`;
        host.prepend(block);
      }

      if (document.documentElement.scrollHeight <= window.innerHeight * 2) {
        const spacer = document.createElement('div');

        spacer.style.height = `${height}px`;
        host.append(spacer);
      }
    },
    { height: TALL, heading: HEADING },
  );
};
