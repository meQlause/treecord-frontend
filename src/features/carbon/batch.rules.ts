// S08's display rules (s08-batch.md §4). No React here.
import { tonnes } from '../../shared/format/carbon';
import { usdc } from '../../shared/format/money';
import { utcDateTime } from '../../shared/format/datetime';
import type { BatchDetail } from './carbon.api';
import { UNIT } from './carbon.copy';
import {
  STEP_AVAILABLE,
  STEP_EVIDENCE,
  STEP_MIRRORED,
  STEP_NETWORK,
  STEP_PLANTED,
  STEP_VERIFIED,
  issuanceStep,
  NO_VALUE,
} from './batch.copy';
import { NOT_AVAILABLE } from './certificate.copy';

/** The five stops of the credit journey: [title, note] (s08 §3 "Always visible"). */
export const journeySteps = (batch: BatchDetail): [string, string][] => [
  [STEP_PLANTED, batch.campaign.region],
  [STEP_VERIFIED, STEP_EVIDENCE],
  [issuanceStep(batch.registry), `Vintage ${batch.vintage}`],
  [STEP_MIRRORED, STEP_NETWORK],
  [STEP_AVAILABLE, `${tonnes(batch.inventoryAmount)} ${UNIT}`],
];

/** "Issued on": UTC with the time, or the placeholder when the block time is not known yet (FR-221). */
export const issuedOn = (issuedAt: string | null): string =>
  issuedAt === null ? NOT_AVAILABLE : utcDateTime(issuedAt);

/** The price as the panel and the journey tag print it: `null` is "—", "0" is "0". */
export const priceText = (usdcPerTonne: string | null): string =>
  usdcPerTonne === null ? NO_VALUE : usdc(usdcPerTonne);

const ODOMETER_SAMPLES = 5;

/** Five serials from the first to the last, for the heading art's odometer (`SRN-2025-00001` … `SRN-2025-16000`). */
export const serialSamples = ({ serialStart, issuedAmount }: BatchDetail): string[] => {
  // the number is what follows the last dash; the prefix keeps its dash
  const prefix = serialStart.slice(0, serialStart.lastIndexOf('-') + 1);
  const width = serialStart.length - prefix.length;

  return Array.from({ length: ODOMETER_SAMPLES }, (_item, sample) =>
    String(
      Math.max(1, Math.round((Number(issuedAmount) * sample) / (ODOMETER_SAMPLES - 1))),
    ).padStart(width, '0'),
  ).map((serial) => prefix + serial);
};

/** A note over 28 characters is cut at 27 and an ellipsis (SVG text cannot wrap); the aria-label keeps all of it. */
const NOTE_MAX = 28;
const NOTE_CUT = 27;

export const captionNote = (note: string): string =>
  note.length > NOTE_MAX ? `${note.slice(0, NOTE_CUT).trimEnd()}…` : note;
