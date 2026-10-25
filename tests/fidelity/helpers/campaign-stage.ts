// What the S04 wallet specs stage on anvil and find on the page: the actions panel, the review regions, and the three
// campaigns they use (Demak mid-funding, one whose funding deadline lapsed, one in Refunding).
import type { Page } from '@playwright/test';
import type { Address } from 'viem';
import { DONOR_KEY, expect, type Chain } from './chain';
import type { Visit } from './wallet-page';

export const USDC = 1_000_000n;

export const HOUR = 3600;

export const actions = (page: Page) => page.locator('#campaign-actions');

export const field = (page: Page) => actions(page).locator('input');

export const review = (page: Page, name: string) =>
  page.getByRole('region', { name: `Review ${name}` });

export const press = (page: Page, name: string) =>
  actions(page).getByRole('button', { name, exact: true });

/** Demak's numbers: target 10,000, raised 6,840 of which the donor gave 250, the donor holding USDC besides. */
export const demak = async (chain: Chain, extra: { raised?: bigint } = {}): Promise<Address> => {
  const campaign = await chain.createCampaign();

  await chain.contributeFrom(campaign, (extra.raised ?? 6840n * USDC) - 250n * USDC);
  await chain.contributeFrom(campaign, 250n * USDC, DONOR_KEY);
  await chain.fund(500n * USDC);

  return campaign;
};

export const toReview = async (visit: Visit, amount: string): Promise<void> => {
  await field(visit.page).fill(amount);
  await press(visit.page, 'Contribute').click();
  await expect(review(visit.page, 'Contribute')).toBeVisible();
};

/** A campaign whose funding deadline has passed unfunded, the donor having given 250. */
export const lapsed = async (chain: Chain): Promise<Address> => {
  const campaign = await chain.createCampaign({ fundingDeadlineIn: HOUR });

  await chain.contributeFrom(campaign, 250n * USDC, DONOR_KEY);
  await chain.warp(2 * HOUR);

  return campaign;
};

/** A campaign in Refunding that the donor gave 250 to. */
export const refunding = async (chain: Chain): Promise<Address> => {
  const campaign = await lapsed(chain);

  await chain.startRefunding(campaign);

  return campaign;
};
