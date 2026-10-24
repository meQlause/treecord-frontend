// Opening a private screen as a signed-in person (the pattern of every /app spec): the real Privy test account signs in,
// `GET /me` follows the profile the spec holds, and `routes` answers the screen's own reads before the page opens.
import type { Page } from '@playwright/test';
import { meBody, type MeProfile } from '../fixtures/accounts';
import { signInWith, type OpenOptions } from './flow';
import { meFollows, type MeState } from './profile';
import { VIEWPORTS } from '../matrix';

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

export type Where = {
  row: string;
  profile: MeProfile;
  path: string;
  viewport?: (typeof VIEWPORTS)[number];
};

export type Signed = { page: Page; account: MeState };

export const openSignedIn = async (
  open: Open,
  { row, profile, path, viewport = VIEWPORTS[1] }: Where,
  routes: (page: Page, account: MeState) => Promise<void>,
): Promise<Signed> => {
  const { page } = await open({ row, viewport });
  const account: MeState = { current: profile };

  await signInWith(page, meBody(profile), {
    returnTo: path,
    setup: async (target) => {
      await meFollows(target, account);
      await routes(target, account);
    },
  });
  await page.getByRole('button', { name: /^Continue to/ }).click();
  await page.waitForURL(`**${path.split('?')[0] ?? path}*`);

  return { page, account };
};
