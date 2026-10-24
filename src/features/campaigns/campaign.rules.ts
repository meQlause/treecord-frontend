// S04's rules (s04-campaign.md §2-§3): the client math (bigint base units, never floats), the dates and which parts of
// the "Campaign actions" panel apply. No React here.
import { localDate, localDateTime } from '../../shared/format/datetime';
import type { CampaignDetail, Viewer } from './campaigns.api';
import {
  CLOSED,
  CTA_AUDITOR,
  CTA_OPERATOR,
  CTA_PLANTER,
  ctaDonor,
  signInToContribute,
} from './campaigns.copy';

const ZERO = BigInt(0);
const ONE = BigInt(1);
const MICRO = 1_000_000n;
const BPS = 10_000n;
const PERCENT = 100;
const TREE_ICONS = 25;

export const DEFAULT_AMOUNT = 100;

const CHIPS = { first: 25, second: 50, third: 100, fourth: 250 };

export const AMOUNT_CHIPS = Object.values(CHIPS);

/** Wholly derived from the page's own figures: the typed amount never reaches the API (campaigns.md §2 "Preview"). */
export const previewFor = (
  amount: number,
  {
    fundingTarget,
    treeTarget,
    split,
  }: Pick<CampaignDetail, 'fundingTarget' | 'treeTarget' | 'split'>,
) => {
  const units = BigInt(amount) * MICRO;
  const target = BigInt(fundingTarget);
  const bought = target === ZERO ? ZERO : (units * BigInt(treeTarget)) / target;

  return {
    trees: Number(bought < ONE ? ONE : bought),
    share: (units * BigInt(split.incentivesBps)) / BPS,
  };
};

/** `part` of `trees` as a whole number of `cells` (the plot grid has 100, the preview row 25). */
export const cellsOf = (part: number, trees: number, cells = PERCENT): number =>
  trees === 0 ? 0 : Math.round((part / trees) * cells);

/** How many of the preview row's 25 trees are lit: the amount's trees while Funding, else the planted share. */
export const litTrees = (campaign: CampaignDetail, bought: number): number =>
  campaign.status === 'funding'
    ? Math.min(TREE_ICONS, bought)
    : cellsOf(campaign.slots.planted, campaign.treeTarget, TREE_ICONS);

/** "Closed" once passed; display only, never an action rule. `fundingDeadlinePassed` exists while Funding only. */
export const fundingClosed = (campaign: CampaignDetail, now: number): boolean =>
  campaign.status === 'funding'
    ? campaign.fundingDeadlinePassed
    : Date.parse(campaign.fundingDeadline) <= now;

export type Deadline = { text: string; instant: string | null };

const deadline = (closed: boolean, iso: string): Deadline =>
  closed ? { text: CLOSED, instant: null } : { text: localDate(iso), instant: iso };

export const deadlinesOf = (campaign: CampaignDetail, now: number) => ({
  funding: deadline(fundingClosed(campaign, now), campaign.fundingDeadline),
  claim: deadline(campaign.claimDeadlinePassed, campaign.claimDeadline),
});

/** The `<time>` element's title: the instant with its zone named (decision a, ui-gaps 21). */
export const instantTitle = (iso: string): string => localDateTime(iso);

const CTA_BY_ROLE: Record<Viewer['role'], (amount: number) => string> = {
  donor: ctaDonor,
  planter: () => CTA_PLANTER,
  operator: () => CTA_OPERATOR,
  auditor: () => CTA_AUDITOR,
};

/** FR-041 / §3.2: the funding panel's one button, by who is looking. */
export const ctaLabel = (viewer: Viewer | null, amount: number): string =>
  viewer === null ? signInToContribute(amount) : CTA_BY_ROLE[viewer.role](amount);

/** Sign in, then come back here (FR-041 #1). */
export const signInPath = (address: string): string =>
  '/sign-in?' + new URLSearchParams({ returnTo: ['/campaigns', address].join('/') }).toString();

const passed = (campaign: CampaignDetail): boolean =>
  campaign.status === 'funding' && campaign.fundingDeadlinePassed;

const canContribute = (campaign: CampaignDetail, viewer: Viewer): boolean =>
  viewer.role === 'donor' && campaign.status === 'funding' && !passed(campaign);

const canStartRefund = (campaign: CampaignDetail, viewer: Viewer): boolean =>
  passed(campaign) && viewer.role !== 'auditor';

const canRefund = (campaign: CampaignDetail, viewer: Viewer): boolean =>
  viewer.role === 'donor' &&
  (campaign.status === 'refunding' || campaign.status === 'completed') &&
  BigInt(viewer.contributedAmount) > ZERO;

/** Which rows of §3.3 apply. The wallet rows (Start refund, D04, D05, D06) still need the chain or the job API. */
export const branchesFor = (campaign: CampaignDetail, viewer: Viewer) => {
  const flags = {
    contribute: canContribute(campaign, viewer),
    startRefund: canStartRefund(campaign, viewer),
    claim: viewer.role === 'planter',
    refund: canRefund(campaign, viewer),
    operator: viewer.role === 'operator',
    donorActive: viewer.role === 'donor' && campaign.status === 'active',
  };
  const walletAction = flags.contribute || flags.startRefund || flags.claim || flags.refund;

  return {
    ...flags,
    walletMissing: walletAction && viewer.walletAddress === null,
    readOnly: !(walletAction || flags.operator || flags.donorActive),
  };
};
