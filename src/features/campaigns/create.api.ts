// S14's two API calls (s14-create-campaign.md §2, §5): saving the metadata the contract will point to, and waiting until the
// indexer shows the new campaign (404 `not_found` means "still indexing", not a failure, campaigns.md §2).
import { api } from '../../app/session/api';
import { ApiError } from '../../shared/api/errors';
import type { metadataBody } from './create.rules';

const POLL_FIRST_MS = 2000;
const POLL_MAX_MS = 5000;
const POLL_BACKOFF = 1.5;
const POLL_TRIES = 90;

export type Saved = { id: string; metadataURI: string };

/** `POST /campaigns/metadata`: no idempotency key, the server does not dedupe, reuse is the screen's (campaigns.md §4). */
export const saveMetadata = (body: ReturnType<typeof metadataBody>): Promise<Saved> =>
  api<Saved>('/campaigns/metadata', { method: 'POST', body });

const sleep = (millis: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, millis);
  });

/** One look at the catalog: shown, or not yet (a 404 or a 5xx); only a refused token ends the wait. */
const shown = (address: string): Promise<boolean> =>
  api(`/campaigns/${address}`).then(
    () => true,
    (error: unknown) => {
      if (error instanceof ApiError && error.class === 'navigation') {
        throw error;
      }

      return false;
    },
  );

/** Polls `GET /campaigns/:address` with a gentle backoff until it answers 200. */
export const untilIndexed = async (address: string): Promise<void> => {
  let wait = POLL_FIRST_MS;

  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    if (await shown(address)) {
      return;
    }

    await sleep(wait);
    wait = Math.min(wait * POLL_BACKOFF, POLL_MAX_MS);
  }

  // shortcut: gives up after ~6 minutes of polling; the campaign exists, the catalog just has not shown it
  throw new Error('The campaign is not in the catalog yet');
};
