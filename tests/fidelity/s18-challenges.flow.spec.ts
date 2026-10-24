// docs/FE/features/s18-challenges.md §7: one test per criterion #1..#7, in the browser, under the docs/FE/fidelity.md §2
// conditions (UTC for this row, the clock frozen at 2026-10-23T09:12:31Z). Sign-in uses the real Privy test account;
// `GET /me` follows the profile the spec holds and `GET /planter/challenges` is answered with the planter.md §3 body.
import type { Page } from '@playwright/test';
import { qrPath } from '../../src/shared/art/qrcode';
import { SARI } from './fixtures/accounts';
import type { Json } from './fixtures/campaigns';
import {
  CHALLENGE_FLAGGED,
  CHALLENGE_R4M9,
  CHALLENGE_T2X8,
  challengesOf,
} from './fixtures/challenges';
import { HELD_ID } from './fixtures/planter';
import { expect, refocus, test, type OpenOptions } from './helpers/flow';
import { answerPlanter } from './helpers/planter';
import { openSignedIn } from './helpers/signed-in';

const ROW = 'S18';
const PATH = '/app/planter/challenges';
const TEST_MS = 120_000;
const NEAR_EXPIRY = '2026-12-19T05:00:00.000Z';

test.describe.configure({ timeout: TEST_MS });

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

/** Signs in as Sari and opens S18, answering the one read of the challenges with `body`. */
const openChallenges = async (open: Open, body: Json): Promise<Page> => {
  const { page } = await openSignedIn(open, { row: ROW, profile: SARI, path: PATH }, (target) =>
    answerPlanter(target, () => ({ body }), []),
  );

  return page;
};

const BOTH = challengesOf([CHALLENGE_T2X8, CHALLENGE_R4M9]);

const ticketOf = (page: Page, code: string) =>
  page.locator('.pl-ticket').filter({ has: page.getByText(code, { exact: true }).first() });

test('#1 the meta reads "2 open" and the note "1 can be answered now"', async ({ open }) => {
  const page = await openChallenges(open, BOTH);

  await expect(page.locator('.results-meta')).toContainText('2 open');
  await expect(page.locator('.results-meta')).toContainText('1 can be answered now');
});

test('#2 R4M9 can be answered now: badge, dates, tree, campaign, tag step, days left and "Record response"', async ({
  open,
}) => {
  const page = await openChallenges(open, BOTH);
  const ticket = ticketOf(page, 'R4M9');

  await expect(ticket.locator('.badge')).toHaveText('Answer now');
  await expect(ticket).toContainText('Issued 21 Oct 2026');
  await expect(ticket.getByRole('link', { name: 'Tree #3001' })).toBeVisible();
  await expect(ticket).toContainText('Roots that stay · Banyumas, Central Java');
  await expect(ticket.locator('.pl-howto')).toContainText('Hold R4M9 beside tag TC-K7QM-3XRA');
  await expect(ticket.locator('.pl-expiry')).toContainText('58 days left · expires 20 Dec 2026');
  await expect(ticket.locator('.pl-ticket-art')).toContainText('58d');
  await expect(ticket.getByRole('link', { name: /Record response/ })).toHaveAttribute(
    'href',
    '/app/planter/record?tree=3001&kind=ALIVE',
  );
});

test('#3 "Print QR" downloads TCH-R4M9 as a 50 mm SVG with the challenge line and the QR', async ({
  open,
}) => {
  const page = await openChallenges(open, BOTH);
  const download = page.waitForEvent('download');

  await ticketOf(page, 'R4M9').getByRole('link', { name: 'Print QR' }).click();

  const file = await download;
  const chunks: Buffer[] = [];

  for await (const chunk of await file.createReadStream()) {
    chunks.push(chunk as Buffer);
  }

  const svg = Buffer.concat(chunks).toString('utf8');

  expect(file.suggestedFilename()).toBe('TCH-R4M9.svg');
  expect(svg).toContain('width="50mm"');
  expect(svg).toContain('Challenge · Tree #3001 · expires 20 Dec 2026');
  expect(svg).toContain(qrPath('TCH-R4M9').d);
});

test('#4 T2X8 says the check-in is already sent, with no "Record response" and a link to its evidence', async ({
  open,
}) => {
  const page = await openChallenges(open, BOTH);
  const ticket = ticketOf(page, 'T2X8');

  await expect(ticket.locator('.badge')).toHaveText('Check-in already sent');
  await expect(ticket.getByRole('link', { name: /Record response/ })).toHaveCount(0);
  await expect(
    ticket.getByRole('link', {
      name: 'Month 6 check-in needs review · the code rides on the next one',
    }),
  ).toHaveAttribute('href', `/app/evidence/${HELD_ID}`);
});

test('#5 a flagged tree reads "Paused · flagged" and offers no "Record response"', async ({
  open,
}) => {
  const page = await openChallenges(open, challengesOf([CHALLENGE_FLAGGED], { answerable: 0 }));
  const ticket = ticketOf(page, 'F9K3');

  await expect(ticket.locator('.badge')).toHaveText('Paused · flagged');
  await expect(ticket.getByRole('link', { name: /Record response/ })).toHaveCount(0);
});

test('#6 on the last day it reads "1 day left" and the ring turns to the warning colour', async ({
  open,
}) => {
  const page = await openChallenges(open, challengesOf([CHALLENGE_R4M9]));
  const ticket = ticketOf(page, 'R4M9');

  await page.clock.setFixedTime(new Date(NEAR_EXPIRY));
  await refocus(page);

  await expect(ticket.locator('.pl-expiry')).toContainText('1 day left · expires 20 Dec 2026');
  await expect(ticket.locator('.pl-ticket-art circle[stroke="#c98a5c"]')).toHaveCount(1);
});

test('#7 with no open challenge it says so and how one arrives', async ({ open }) => {
  const page = await openChallenges(open, challengesOf([], { answerable: 0 }));

  await expect(page.locator('main')).toContainText('No open challenges');
  await expect(page.locator('main')).toContainText(
    'New challenges appear here when an auditor issues one.',
  );
});
