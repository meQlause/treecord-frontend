// The browser side of the audit specs (S23-S26): the auditor signs in through the real Privy test account, an audit page opens, and
// the list, the campaigns, a session, its report and the writes are answered by the spec (the backend does not run).
import type { Page } from '@playwright/test';
import { meBody, type MeProfile } from '../fixtures/accounts';
import { AUDITOR, CAMPAIGNS, CLOSED_ITEM, OPENED, OPEN_ITEM, sessionsOf } from '../fixtures/audit';
import type { Json } from '../fixtures/campaigns';
import { answerApi, failure, type ApiAnswer, type ApiCall } from './api';
import { signInWith, type OpenOptions } from './flow';

const NOT_FOUND = 404;
const CREATED = 201;
const HTTP_OK = 200;
const SESSION = /^\/audit\/sessions\/([^/]+)$/u;
const REPORT = /^\/audit\/sessions\/([^/]+)\/report$/u;
const CLOSE = /^\/audit\/sessions\/([^/]+)\/close$/u;

export type Scene = {
  profile?: MeProfile;
  /** The page to open; `/app/audit` by default. */
  path?: string;
  /** `GET /audit/sessions`; by default the two sessions of the contract, filtered by `status`. */
  sessions?: (call: ApiCall) => Json | ApiAnswer;
  campaigns?: () => Json | ApiAnswer;
  /** The answer to each open, by how many came before. */
  open?: (call: ApiCall, before: number) => ApiAnswer;
  /** `GET /audit/sessions/:id`, as each read finds it. */
  session?: (id: string) => Json | ApiAnswer;
  /** `GET /audit/sessions/:id/report`. */
  report?: (id: string) => Json | ApiAnswer;
  /** The answer to each close, by how many came before. */
  close?: (call: ApiCall, before: number) => ApiAnswer;
};

export type Visit = { page: Page; calls: ApiCall[]; opens: ApiCall[]; closes: ApiCall[] };

type Open = (options?: OpenOptions) => Promise<{ page: Page }>;

const asAnswer = (value: Json | ApiAnswer): ApiAnswer =>
  typeof (value as ApiAnswer).status === 'number' || 'body' in value
    ? (value as ApiAnswer)
    : { body: value };

const byStatus = (call: ApiCall): Json => {
  const status = call.params.get('status');
  const all = [CLOSED_ITEM, OPEN_ITEM];

  return sessionsOf(status === null ? all : all.filter((item) => item.status === status));
};

type Writes = { opens: ApiCall[]; closes: ApiCall[] };

const writeOf = (scene: Scene, call: ApiCall, { opens, closes }: Writes): ApiAnswer | undefined => {
  if (call.method !== 'POST') {
    return undefined;
  }

  if (call.path === '/audit/sessions') {
    opens.push(call);

    return scene.open?.(call, opens.length - 1) ?? { status: CREATED, body: OPENED };
  }

  if (CLOSE.test(call.path)) {
    closes.push(call);

    return scene.close?.(call, closes.length - 1) ?? { status: HTTP_OK, body: {} };
  }

  return undefined;
};

const idRead = (scene: Scene, path: string): ApiAnswer | undefined => {
  const report = REPORT.exec(path)?.[1];
  const session = SESSION.exec(path)?.[1];
  const found = report === undefined ? session : report;
  const read = report === undefined ? scene.session : scene.report;

  return found === undefined || read === undefined ? undefined : asAnswer(read(found));
};

const readOf = (scene: Scene, call: ApiCall): ApiAnswer => {
  const reads: Record<string, () => ApiAnswer> = {
    '/me': () => ({ fallback: true }),
    '/campaigns': () => asAnswer(scene.campaigns?.() ?? CAMPAIGNS),
    '/audit/sessions': () => asAnswer(scene.sessions?.(call) ?? byStatus(call)),
  };

  return reads[call.path]?.() ?? idRead(scene, call.path) ?? failure(NOT_FOUND, 'not_found');
};

const responderOf =
  (scene: Scene, writes: Writes) =>
  (call: ApiCall): ApiAnswer =>
    writeOf(scene, call, writes) ?? readOf(scene, call);

/** Signs in and presses "Continue" to the audit page (the page itself is for the spec to wait for). */
export const openAudit = async (open: Open, scene: Scene = {}): Promise<Visit> => {
  const { page } = await open({ row: 'S23' });
  const writes: Writes = { opens: [], closes: [] };
  const path = scene.path ?? '/app/audit';
  let calls: ApiCall[] = [];

  await signInWith(page, meBody(scene.profile ?? AUDITOR), {
    returnTo: path,
    setup: async () => {
      calls = await answerApi(page, responderOf(scene, writes));
    },
  });
  await page.getByRole('button', { name: /^Continue to/u }).click();
  await page.waitForURL(`**${path}`);

  return { page, calls, ...writes };
};
