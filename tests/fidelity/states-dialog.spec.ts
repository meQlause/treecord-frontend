// S8 pattern 23, dialog modality (docs/FE/ui-gaps-treatments.md §23, NFR-073 as reworded): D09 and D10 are the modal
// dialogs. A modal dialog makes the page behind it inert, keeps Tab inside, and gives the focus back to the control that
// opened it when it closes. (Busy blocks Escape and Close: s15-my-carbon-wallet.flow.spec.ts #10.)
import type { Page } from '@playwright/test';
import { HOLDINGS } from './fixtures/holdings';
import { expect, test } from './helpers/flow';
import { openCarbon } from './helpers/my-carbon-page';

const TEST_MS = 120_000;
const TABS = 12;

test.describe.configure({ timeout: TEST_MS });

const dialog = (page: Page) => page.getByRole('dialog');

/** Focus is in the dialog, or on `body` while it is in the browser's own controls: never on the page behind. */
const behindDialog = (page: Page): Promise<boolean> =>
  page.evaluate(
    () =>
      document.activeElement !== document.body &&
      document.activeElement?.closest('dialog') === null,
  );

test('pattern 23 dialog modality: D10 is modal, keeps focus inside, and Escape returns it to "Retire credits"', async ({
  open,
}) => {
  const { page } = await openCarbon(open, { holdings: () => HOLDINGS });
  const opener = page.getByRole('button', { name: 'Retire credits' });

  await opener.click();
  await expect(dialog(page)).toBeVisible();
  expect(await dialog(page).evaluate((element) => element.matches(':modal'))).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  expect(await behindDialog(page)).toBe(false);

  for (let press = 0; press < TABS; press += 1) {
    await page.keyboard.press('Tab');
    expect(await behindDialog(page)).toBe(false);
  }

  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('pattern 23 dialog modality: D09 closes with its Close button and gives the focus back too', async ({
  open,
}) => {
  const { page } = await openCarbon(open, { holdings: () => HOLDINGS });

  await page.getByRole('button', { name: 'Reservations', exact: true }).click();

  const opener = page.getByRole('button', { name: 'Decline unfilled share' }).first();

  await opener.click();
  await expect(dialog(page)).toContainText('Release your reservation.');
  await dialog(page).getByRole('button', { name: 'Close' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
});
