// Opening S20 as Sari for the S20 and S20-states specs: the one local row and its clip seeded into this phone's IndexedDB,
// the planter uploads list and the evidence endpoints answered by the spec (the backend does not run).
import type { Page } from '@playwright/test';
import { SARI } from '../fixtures/accounts';
import type { Json } from '../fixtures/campaigns';
import { SUBMIT_202, TARGET_3001, UPLOAD_201 } from '../fixtures/record';
import { LOCAL_ROW, NEEDS_REVIEW, ONCHAIN, REJECTED, uploadsOf } from '../fixtures/uploads';
import type { OpenOptions } from './flow';
import { answerPlanter, type PlanterResponder } from './planter';
import { answerEvidence, seedQueue, type EvidenceServer, type Recorded } from './record';
import { openSignedIn } from './signed-in';

const ROW = 'S20';

const UPLOADS_PATH = '/app/planter/uploads';

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

export type UploadsSetup = {
  local?: boolean;
  /** The local row; defaults to the fixture's. */
  row?: Json;
  /** What the list answers for `filter`; defaults to the three fixture items. */
  list?: (filter: string, record: Recorded) => Json;
  /** Full control of the list answer (cursor, status, a gate); wins over `list`. */
  answer?: PlanterResponder;
  server?: Partial<EvidenceServer>;
};

export type OpenedUploads = { page: Page; record: Recorded; lists: URL[] };

export const THREE: Json[] = [NEEDS_REVIEW, REJECTED, ONCHAIN];

export const ofFilter = (filter: string, items: Json[]): Json[] => {
  if (filter === 'sent') {
    return items.filter((item) => item.status !== 'rejected');
  }

  return filter === 'rejected' ? items.filter((item) => item.status === 'rejected') : items;
};

const SERVER: EvidenceServer = {
  target: { body: TARGET_3001 },
  uploadUrl: { status: 201, body: UPLOAD_201 },
  submit: { status: 202, body: SUBMIT_202 },
};

export const openUploads = async (open: Open, setup: UploadsSetup = {}): Promise<OpenedUploads> => {
  const record: Recorded = { api: [], puts: [] };
  const lists: URL[] = [];
  const responder: PlanterResponder =
    setup.answer ??
    (({ url }) => {
      const filter = url.searchParams.get('filter') ?? 'all';

      return { body: setup.list?.(filter, record) ?? uploadsOf(ofFilter(filter, THREE)) };
    });
  const { page } = await openSignedIn(
    open,
    { row: ROW, profile: SARI, path: UPLOADS_PATH },
    async (target) => {
      if (setup.local !== false) {
        await seedQueue(target, [(setup.row ?? LOCAL_ROW) as { id: string }]);
      }

      await answerPlanter(target, responder, lists);
      await answerEvidence(target, { ...SERVER, ...setup.server }, record);
    },
  );

  return { page, record, lists };
};

export const cards = (page: Page) => page.locator('.campaign-card');

export const localCard = (page: Page) => cards(page).filter({ hasText: 'Waiting' });
