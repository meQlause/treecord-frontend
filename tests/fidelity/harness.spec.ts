// Proves the §2 conditions of docs/FE/fidelity.md hold in the real browser the specs use. No app is needed: the
// conditions live on the context.
import { expect, test } from '@playwright/test';
import { applyConditions, contextOptions, expectNoBlocked } from './fidelity.setup';
import { MATRIX, VIEWPORTS } from './matrix';

const row = (id: string) => MATRIX.find((candidate) => candidate.id === id) ?? MATRIX[0]!;

for (const viewport of VIEWPORTS) {
  test(`the context renders at ${viewport.width} wide, en-GB, reduced motion, 1:1 pixels`, async ({
    browser,
  }) => {
    const context = await browser.newContext(contextOptions(row('S03'), viewport));
    const page = await context.newPage();

    const facts = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      ratio: window.devicePixelRatio,
      language: navigator.language,
      zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }));

    expect(facts).toEqual({
      width: viewport.width,
      height: viewport.height,
      ratio: 1,
      language: 'en-GB',
      zone: 'Asia/Jakarta',
      reduced: true,
    });
    await context.close();
  });
}

test('the clock is frozen, and a screen document can name another instant and zone', async ({
  browser,
}) => {
  const frozen = await browser.newContext(contextOptions(row('S03')));
  const upload = await browser.newContext(contextOptions(row('S20')));

  await applyConditions(frozen, row('S03'));
  await applyConditions(upload, row('S20'));
  const read = async (context: typeof frozen) => {
    const page = await context.newPage();

    return page.evaluate(() => ({
      now: new Date().toISOString(),
      zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
  };

  expect(await read(frozen)).toEqual({ now: '2026-10-23T09:12:31.000Z', zone: 'Asia/Jakarta' });
  expect(await read(upload)).toEqual({ now: '2026-10-23T10:00:00.000Z', zone: 'UTC' });
  await frozen.close();
  await upload.close();
});

test('a third-party request is aborted and recorded; loopback passes; the Privy host passes for S02 only', async ({
  browser,
}) => {
  const context = await browser.newContext(contextOptions(row('S02')));
  const conditions = await applyConditions(context, row('S02'), ['auth.privy.test']);
  const page = await context.newPage();
  const attempt = (url: string) =>
    page.evaluate(
      (target) =>
        fetch(target).then(
          () => 'sent',
          () => 'failed',
        ),
      url,
    );

  await attempt('https://images.unsplash.com/photo-1');
  await attempt('http://localhost:1/api');
  await attempt('https://auth.privy.test/ok');

  expect(conditions.blocked).toEqual(['https://images.unsplash.com/photo-1']);
  expect(() => expectNoBlocked(conditions)).toThrow(/images\.unsplash\.com/);
  await context.close();
});
