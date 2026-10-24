// docs/FE/fidelity.md §2 "Render parity": every behaviour run renders under the same conditions, so a failure is a
// defect, never noise. Data-driven specs call `contextOptions` for `browser.newContext` and `applyConditions` right
// after, and finish with `expectNoBlocked`. Chromium itself comes from playwright.config.ts (SR-4).
import type { BrowserContext, BrowserContextOptions } from '@playwright/test';
import { VIEWPORTS, type MatrixRow } from './matrix';

export type Viewport = (typeof VIEWPORTS)[number];

/** The S18 choice: every screen document freezes here unless it names another instant. */
export const FROZEN_CLOCK = '2026-10-23T09:12:31.000Z';

/** Screen documents that name their own instant (S20; S18#6 sets 2026-12-19T05:00:00.000Z inside its own test). */
const CLOCK_OF_ROW: Readonly<Record<string, string>> = { S20: '2026-10-23T10:00:00.000Z' };

/** S16, S18, S20 and S23–S26 say UTC; S04, S12 and S14 chose Asia/Jakarta, and so does everything else. */
const UTC_ROWS: ReadonlySet<string> = new Set(['S16', 'S18', 'S20', 'S23', 'S24', 'S25', 'S26']);

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export const timezoneFor = (row: Pick<MatrixRow, 'id'>): string =>
  UTC_ROWS.has(row.id) ? 'UTC' : 'Asia/Jakarta';

export const clockFor = (row: Pick<MatrixRow, 'id'>): string =>
  CLOCK_OF_ROW[row.id] ?? FROZEN_CLOCK;

/** Options for `browser.newContext`: the §2 viewport, locale, time zone and reduced motion. */
export const contextOptions = (
  row: Pick<MatrixRow, 'id'>,
  viewport: Viewport = VIEWPORTS[0],
): BrowserContextOptions => ({
  viewport: { width: viewport.width, height: viewport.height },
  deviceScaleFactor: 1,
  locale: 'en-GB',
  timezoneId: timezoneFor(row),
  reducedMotion: 'reduce',
});

/**
 * May this request leave the browser? The app, the local API, local MinIO and Anvil are all on loopback; `extraHosts`
 * adds the Privy test harness for S02 only. Inline schemes (data, blob, about) never touch the network.
 */
// ".privy.io" admits every subdomain of privy.io and privy.io itself; any other entry is one exact host
const hostMatches = (hostname: string, host: string): boolean =>
  host.startsWith('.') ? hostname.endsWith(host) || hostname === host.slice(1) : hostname === host;

export const isAllowed = (url: string, extraHosts: readonly string[] = []): boolean => {
  const { protocol, hostname } = new URL(url);

  if (['data:', 'blob:', 'about:'].includes(protocol)) {
    return true;
  }

  return LOOPBACK.has(hostname) || extraHosts.some((host) => hostMatches(hostname, host));
};

export type Conditions = {
  /** URLs the allowlist aborted; a spec fails when this is not empty. */
  blocked: string[];
};

/** Freezes the clock and aborts every request the allowlist does not name, recording each one. */
export const applyConditions = async (
  context: BrowserContext,
  row: Pick<MatrixRow, 'id'>,
  extraHosts: readonly string[] = [],
): Promise<Conditions> => {
  const blocked: string[] = [];

  const instant = new Date(clockFor(row));

  await context.clock.install({ time: instant });
  await context.clock.setFixedTime(instant);
  await context.route('**/*', async (route) => {
    const url = route.request().url();

    if (isAllowed(url, extraHosts)) {
      await route.continue();

      return;
    }

    blocked.push(url);
    await route.abort('blockedbyclient');
  });

  return { blocked };
};

/** The spec fails on an aborted request (§2 Network). */
export const expectNoBlocked = ({ blocked }: Conditions): void => {
  if (blocked.length > 0) {
    throw new Error(`third-party requests were aborted:\n${blocked.join('\n')}`);
  }
};
