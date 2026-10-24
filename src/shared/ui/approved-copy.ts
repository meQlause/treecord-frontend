import { shortAddress } from '../format/address';

// The approved text of every COPY-nnn id (docs/FE/copy-recommendations.md, option A, approved 24 Oct 2026),
// verbatim. `{name}` slots are filled by the caller (`Lorem` `values`) or, for a fixed limit, by COPY_CONSTANTS.

export const APPROVED_COPY: Record<string, string> = {
  'COPY-001': 'Some details aren’t valid. Check them and try again.',
  'COPY-002': 'The request couldn’t be read. Try again.',
  'COPY-003': 'This request couldn’t be sent. Try again.',
  'COPY-004': 'Accept the planter agreement below to become a planter.',
  'COPY-005': 'This recording’s details don’t match its upload. It is still saved on this device.',
  'COPY-006': 'Auditor and Operator accounts can’t switch role.',
  'COPY-007': 'Only contributors to this campaign can flag its trees.',
  'COPY-008': 'This wallet is already linked to another Treecord account.',
  'COPY-009': 'This request was already used for another action. Cancel and start again.',
  'COPY-010':
    'This account already has {max} active devices. Revoke one from a browser that still holds its key.',
  'COPY-011': 'This signing key is already registered. Register again to create a new one.',
  'COPY-012': 'The claim deadline has passed.',
  'COPY-013': 'Only {available} slots are available.',
  'COPY-014': 'This submission can no longer be approved. You can still reject it.',
  'COPY-015': 'Only Alive or Dead trees can be flagged.',
  'COPY-016': 'Only open flags can be resolved.',
  'COPY-017': 'Species unknown. The estimate can’t be computed.',
  'COPY-018': 'Campaign must be Active or Completed.',
  'COPY-019': 'The video didn’t reach the server. It is still saved on this device.',
  'COPY-021': 'This retirement is already marked done with a different registry reference.',
  'COPY-102': 'We couldn’t send a code to that email. Try again in a moment.',
  'COPY-103': 'Enter a display name of 1 to {displayNameMax} characters.',
  'COPY-104': 'This screen is for {roleA} or {roleB} accounts.',
  'COPY-150': 'Wallet rejected. Your inputs are preserved.',
  'COPY-151': 'Transaction failed. Your inputs are preserved.',
  'COPY-152': 'Wallet rejected. Nothing changed.',
  'COPY-153': 'Transaction failed. Nothing changed.',
  'COPY-154': 'Not enough USDC in your wallet for {amount} USDC.',
  'COPY-155': 'Not enough gas in your wallet to send this transaction.',
  'COPY-156': 'Your wallet is on another network. Switch to {network} and try again.',
  'COPY-157': 'Campaign {shortAddress}',
  'COPY-158': 'The claim job failed. Claim slots again to retry it.',
  'COPY-159': 'Replanted',
  'COPY-160': 'Flag resolved',
  'COPY-161': 'Policy score',
  'COPY-162': 'Evidence hash',
  'COPY-163': 'Transaction',
  'COPY-164': 'First keyframe of the evidence video for Tree #{id}.',
  'COPY-165': 'Confirm in wallet',
  'COPY-166': 'Load more records',
  'COPY-167': 'Loading…',
  'COPY-168': 'Couldn’t load more. Your records are still here.',
  'COPY-169': 'Tree died',
  'COPY-170': 'Tree replanted',
  'COPY-171': 'Survival check',
  'COPY-172': 'Load more campaigns',
  'COPY-173': 'Loading…',
  'COPY-174': 'Couldn’t load more. Your campaigns are still here.',
  'COPY-175':
    'These campaign settings can’t be created. Nothing was sent; your inputs are preserved.',
  'COPY-176': 'Survival check',
  'COPY-200': 'Load more {noun}',
  'COPY-201': 'Couldn’t load more. Your {noun} are still here.',
  'COPY-202': 'This browser’s signing key is no longer registered. Register this device again.',
  'COPY-203': 'Uploading…',
  'COPY-204': 'Couldn’t upload. The recording is still on this device.',
  'COPY-205': 'This recording is larger than {maxUploadMiB} MiB and can’t be uploaded. Retake it.',
  'COPY-206': 'This browser can’t record video. Try another browser.',
  'COPY-207': 'Upload not finished. Send it again from Uploads on the phone that recorded it.',
  'COPY-208': 'Video not used before',
  'COPY-209': 'Campaign is Active',
  'COPY-210': 'You hold this tree',
  'COPY-211': 'No open challenge on this tree',
  'COPY-212': 'An account can sign evidence from up to {max} devices at a time.',
  'COPY-213':
    '{count} recordings waiting on this browser were signed with this key. Upload them before revoking: afterwards the server rejects them.',
  'COPY-214': 'Couldn’t reach the server. Nothing changed on this device.',
  'COPY-250': 'Reason saved; no on-chain flag or pause yet.',
  'COPY-251': 'Rejected by an operator',
  'COPY-300': 'Enter a whole number from {minSampleSize} to {maxSampleSize}.',
  'COPY-301': 'Load more sessions',
  'COPY-302': 'Couldn’t load more. Your sessions are still here.',
  'COPY-303': 'Signed text matches the payload',
  'COPY-304': 'Evidence hash matches payload and signature',
  'COPY-305': 'Not checked',
  'COPY-306': 'Device revoked',
  'COPY-307': 'This browser could not recompute the sample; nothing stored has changed.',
  'COPY-350': 'Planter accounts receive activity incentives only, not carbon credits.',
  'COPY-351':
    'The price changed to {usdcPerTonne} USDC / tonne. Check the new total before you buy.',
  'COPY-352': 'Loading retirement record…',
  'COPY-353': 'Load more retirements',
  'COPY-354': 'Couldn’t load more. Your retirements are still here.',
  'COPY-400': 'Your session ended. Sign in again to continue.',
  'COPY-401': 'Couldn’t copy. Copy the link from the address bar.',
  'COPY-402': 'Couldn’t copy. Select the hash to copy it.',
  'COPY-403': 'No matching slots',
  'COPY-404': 'No matching recordings',
  'COPY-405': 'No matching sessions',
  'COPY-406': 'The remaining amount changed. Check the new amount, then confirm again.',
  'COPY-407': 'This campaign is no longer taking contributions. Nothing was sent from your wallet.',
  'COPY-408': 'Refunds can’t be started right now. The campaign status below is up to date.',
  'COPY-409': 'up to 6 decimals',
  'COPY-410': '{reasonMin}–{reasonMax} characters',
  'COPY-411': '1–{displayNameMax} characters',
  'COPY-412': '1–64 characters',
  'COPY-413': '0x + 40 hex characters',
  'COPY-414': '1–{max}',
  'COPY-415': '2–64 characters',
  'COPY-416': '2000–2100',
  'COPY-417': '1–200 characters',
  'COPY-418': 'Creator wallet',
  'COPY-419': 'Defaults to your own wallet. To create on a donor’s behalf, enter their wallet.',
  'COPY-420': 'Method',
  'COPY-421': 'Expired',
  'COPY-422': 'more than 0, up to 3 decimals',
};

export type CopyValues = Record<string, string | number>;

// The slots whose value is a fixed limit, the same on every screen (frozen MAX_ACTIVE_DEVICES, profile NAME_MAX,
// tree REASON_MIN/REASON_MAX, MAX_UPLOAD_BYTES in MiB, the audit sample range, the network the app runs on).
const COPY_CONSTANTS: Record<string, CopyValues> = {
  'COPY-010': { max: 3 },
  'COPY-212': { max: 3 },
  'COPY-103': { displayNameMax: 80 },
  'COPY-411': { displayNameMax: 80 },
  'COPY-410': { reasonMin: 10, reasonMax: 2000 },
  'COPY-205': { maxUploadMiB: 25 },
  'COPY-300': { minSampleSize: 1, maxSampleSize: 100 },
  'COPY-156': { network: 'Base Sepolia' },
};

/** The approved text of `id` with its slots filled; an id with no approved text is returned as it is. */
export const fillCopy = (id: string, values: CopyValues = {}): string => {
  const all = { ...COPY_CONSTANTS[id], ...values };

  return (APPROVED_COPY[id] ?? id).replace(/\{(\w+)\}/gu, (slot, name: string) =>
    String(all[name] ?? slot),
  );
};

/** COPY-157: the title of a campaign that has none, named by its short address (S03–S06, S13, the donor home). */
export const untitledCampaign = (address: string): string =>
  fillCopy('COPY-157', { shortAddress: shortAddress(address) });
