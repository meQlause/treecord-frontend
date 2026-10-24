// S15's display rules (s15-my-carbon.md §4, §5), pure: the shares of a card, the figures, the meta counts, the ledger stacks
// of the heading art and what D10 accepts. Carbon amounts arrive as decimal strings of thousandths; bigint is only for the
// checks, never for display arithmetic.
import { localDate } from '../../shared/format/datetime';
import { parseUnits } from './buy.rules';
import { BENEFICIARY_RULE, AMOUNT_RULE, TABS } from './my-carbon.copy';
import type { Balance, Holdings, Reservation } from './holdings.api';

const PERCENT = 100;
const STACK_MAX = 7;

export type Tab = (typeof TABS)[number];

const [ISSUED_TAB, RESERVATIONS_TAB, RETIREMENTS_TAB] = TABS;

const TAB_PARAM: Readonly<Record<string, Tab>> = {
  issued: ISSUED_TAB,
  reservations: RESERVATIONS_TAB,
  retirements: RETIREMENTS_TAB,
};

const PARAM_OF: Readonly<Record<Tab, string>> = {
  [ISSUED_TAB]: 'issued',
  [RESERVATIONS_TAB]: 'reservations',
  [RETIREMENTS_TAB]: 'retirements',
};

/** The section in `?tab=`; anything else is "Issued balances". */
export const parseTab = (param: string | null): Tab => TAB_PARAM[param ?? ''] ?? ISSUED_TAB;

export const tabParam = (tab: Tab): string | undefined =>
  tab === ISSUED_TAB ? undefined : PARAM_OF[tab];

const share = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * PERCENT);

/** The share of a batch still held: `amount / (amount + retired)`. */
export const heldShare = ({ amount, retiredAmount }: Balance): number =>
  share(Number(amount), Number(amount) + Number(retiredAmount));

/** The share of a reservation already issued: `allocated / reserved` (the reserved amount is the total). */
export const issuedShare = ({ allocatedAmount, reservedAmount }: Reservation): number =>
  share(Number(allocatedAmount), Number(reservedAmount));

/** The card date: the viewer's zone, date only. */
export const cardDate = (iso: string): string => localDate(Date.parse(iso));

/** The three section counts the meta line reads. */
export const countOf = (tab: Tab, holdings: Holdings): number => {
  if (tab === ISSUED_TAB) {
    return holdings.balances.length;
  }

  return tab === RESERVATIONS_TAB ? holdings.reservations.length : holdings.retirements.total;
};

/** The coins in one stack of the ledger art: at least one when there is any, else scaled to the tallest of three. */
export const stackOf = (value: number, figures: [number, number, number]): number =>
  Math.max(value > 0 ? 1 : 0, Math.round((value / Math.max(...figures, 1)) * STACK_MAX));

export type Retire = { units: bigint; beneficiary: string; purpose: string };

/** D10's first broken rule, or the amount in units: amount first, then beneficiary; the amount within the balance. */
export const retireProblem = (
  draft: { amount: string; beneficiary: string; purpose: string },
  balance: string,
): { field: 'amount' | 'beneficiary'; text: string } | Retire => {
  const units = parseUnits(draft.amount);

  if (units === null || units > BigInt(balance)) {
    return { field: 'amount', text: AMOUNT_RULE };
  }

  const beneficiary = draft.beneficiary.trim();

  return beneficiary === ''
    ? { field: 'beneficiary', text: BENEFICIARY_RULE }
    : { units, beneficiary, purpose: draft.purpose.trim() };
};

/** The retirement draft's key: by account, wallet, chain and batch (NFR-051). */
export const retireDraftKey = (
  profile: { id: string; walletAddress: string | null },
  chainId: number,
  batchId: string,
): string =>
  `treecord:draft:carbon-retire:${profile.id}:${profile.walletAddress ?? 'no-wallet'}:${chainId}:${batchId}`;
