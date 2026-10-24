import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '../../../../src/features/trees/tree.page';
import { ApiError } from '../../../../src/shared/api/errors';
import {
  ALEX_3103,
  DEAD_TREE,
  EMPTY_TIMELINE,
  SARI_3001,
  SARI_3104,
  TREE_3001,
  TREE_3021,
  TREE_3091,
} from '../../../fidelity/fixtures/tree';
import { SARI, apiMock, renderRoutes, resetPrivy, signedInAs } from '../../session-mocks';

vi.mock('@privy-io/react-auth', async () => (await import('../../session-mocks')).privyModule);
vi.mock(
  '../../../../src/app/session/api',
  async () => (await import('../../session-mocks')).apiModule,
);
vi.mock(
  '../../../../src/app/session/config',
  async () => (await import('../../session-mocks')).configModule,
);

const routes: RouteObject[] = [{ path: '/trees/:treeId', Component }];

/** Answers `/me` as `role` and `/trees/:id` with `body`. */
const serve = (body: unknown, role: 'planter' | 'operator' | 'donor' = 'planter'): void => {
  apiMock.mockImplementation((path: string) =>
    path === '/me' ? Promise.resolve({ profile: { ...SARI, role } }) : Promise.resolve(body),
  );
};

const fails = (code: string, status: number): void => {
  apiMock.mockImplementation((path: string) =>
    path === '/me'
      ? Promise.resolve({ profile: SARI })
      : Promise.reject(new ApiError({ code, message: code, status })),
  );
};

const open = (id = '3001') => renderRoutes(routes, `/trees/${id}`);

const ready = () => screen.findByRole('heading', { level: 1 });

const fact = (label: string): HTMLElement => {
  const term = screen.getAllByText(label, { selector: 'dt' })[0]!;

  return term.parentElement!.querySelector('dd')!;
};

const treeCalls = (): unknown[][] => apiMock.mock.calls.filter(([path]) => path !== '/me');

beforeEach(() => {
  resetPrivy();
  apiMock.mockReset();
});

describe('S05 tree page, signed out', () => {
  beforeEach(() => serve(TREE_3001));

  it('T-5/T-11: the heading, the provenance card and an approximate location', async () => {
    open();

    expect(await ready()).toHaveTextContent('Tree #3001');
    expect(document.querySelector('.hero-coordinate')).toHaveTextContent(
      'TREE #3001 / BANYUMAS, CENTRAL JAVA',
    );
    expect(document.querySelector('.tr-hero .ws-tag')).toHaveTextContent('Alive');
    expect(screen.getByText(/^Mahogany · planted \d+ Apr 2026$/)).toBeInTheDocument();
    expect(fact('Location')).toHaveTextContent('-7.432, 109.247 · Approximate');
    expect(fact('Tree tag')).toHaveTextContent('TC-K7QM-3XRA');
    expect(fact('Replant deadline')).toHaveTextContent('—');
    expect(fact('Payout clock')).toHaveTextContent('Milestone windows');
    expect(document.body.innerHTML).not.toContain('-7.431205');
  });

  it('links the provenance card to the campaign and the record to its report', async () => {
    open();
    await ready();

    expect(document.querySelector('a.tr-hero')).toHaveAttribute(
      'href',
      '/campaigns/0x0000000000000000000000000000000000000003',
    );
    expect(screen.getByRole('link', { name: 'Impact report' })).toHaveAttribute(
      'href',
      '/campaigns/0x0000000000000000000000000000000000000003/report',
    );
  });

  it('M-1: the schedule has six rows with their amounts and statuses', async () => {
    open();
    await ready();

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);

    expect(rows).toHaveLength(6);
    expect(rows[0]).toHaveTextContent('Month 0');
    expect(rows[0]).toHaveTextContent('1.05 USDC');
    expect(rows[0]).toHaveTextContent('Paid');
    expect(rows[2]).toHaveTextContent('Open');
    expect(rows[5]).toHaveTextContent('4.2 USDC');
    expect(screen.queryByText(/Chain windows, pause duration/)).toBeNull();
  });

  it('TL-2/TL-3/TL-8: the timeline rows with the score, the short hash and the transaction link', async () => {
    open();
    await ready();

    const rows = within(screen.getByRole('list', { name: '' })).getAllByRole('listitem');

    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole('heading', { name: 'Planted' })).toBeInTheDocument();
    expect(
      within(rows[1]!).getByRole('heading', { name: 'Survival check · month 3' }),
    ).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Milestone paid.')).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('9230');
    expect(rows[1]!.querySelector('code')).toHaveTextContent('0x2903…513e');
    expect(rows[1]!.querySelector('.tl-ev-facts a')).toHaveAttribute(
      'href',
      expect.stringMatching(/\/tx\/0xfc1aa443/),
    );
  });

  it('TL-9: a thumbnail that fails to load is removed and the row stays', async () => {
    open();
    await ready();

    const image = document.querySelector('img.ev-thumb')!;

    expect(image).toHaveAttribute('loading', 'lazy');
    fireEvent.error(image);

    expect(document.querySelector('img.ev-thumb')).not.toBe(image);
    expect(screen.getByRole('heading', { name: 'Planted' })).toBeInTheDocument();
  });

  it('M-3/M-5: the payouts, the lifecycle card and no flags', async () => {
    open();
    await ready();

    expect(fact('Recorded payouts')).toHaveTextContent('2 milestones · 2.1 USDC');
    expect(fact('Planter / transaction')).toHaveTextContent('0x4b9e…9d0e · 0xfc1aa443…');
    expect(fact('Forfeited')).toHaveTextContent('None');

    const card = screen.getByLabelText('Lifecycle');

    expect(card).toHaveTextContent('2/6');
    expect(card).toHaveTextContent('Alive · month 6');
    expect(card).toHaveTextContent('Of 10.5 USDC per tree; payouts follow the milestone windows.');
    expect(screen.getByText('No on-chain flags.')).toBeInTheDocument();
  });

  it('shows neither Reprint, nor a flag field, nor a planter action', async () => {
    open();
    await ready();

    expect(screen.queryByText('Reprint')).toBeNull();
    expect(screen.queryByLabelText('Flag reason')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Record check-in' })).toBeNull();
  });

  it('is read without a viewer: one GET of the tree', async () => {
    open();
    await ready();

    expect(treeCalls()).toEqual([['/trees/3001', expect.anything()]]);
  });
});

describe('S05 tree page, other records', () => {
  it('TL-1: no events says so', async () => {
    serve(EMPTY_TIMELINE);
    open();
    await ready();

    expect(screen.getByRole('heading', { name: 'No indexed events' })).toBeInTheDocument();
  });

  it('T-15: a campaign without a title shows the placeholder, same element', async () => {
    serve({
      ...TREE_3001,
      tree: { ...TREE_3001.tree, campaign: { ...TREE_3001.tree.campaign, title: null } },
    });
    open();
    await ready();

    expect(document.querySelector('.tr-hero h2 [data-copy="COPY-157"]')).not.toBeNull();
  });

  it('T-7: a dead tree shows its replant deadline', async () => {
    serve(DEAD_TREE);
    open('3050');
    await ready();

    expect(document.querySelector('.tr-hero .ws-tag')).toHaveTextContent('Dead');
    expect(fact('Replant deadline')).toHaveTextContent(/^\d+ Nov 2026$/);
  });

  it('T-8: a removed tree forfeits every unpaid milestone', async () => {
    serve(TREE_3021);
    open('3021');
    await ready();

    expect(fact('Forfeited')).toHaveTextContent('Unpaid milestones forfeited');
    expect(screen.getAllByText('Forfeited', { selector: '.ws-tag' })).toHaveLength(4);
  });
});

describe('S05 tree page, flagged', () => {
  it('T-6/F-2: a flagged tree pauses the clock and lists its flag', async () => {
    serve(TREE_3091);
    open('3091');
    await ready();

    expect(document.querySelector('.tr-hero .ws-tag')).toHaveTextContent('Flagged');
    expect(fact('Payout clock')).toHaveTextContent('Paused');
    expect(screen.getAllByText('Paused', { selector: '.ws-tag' })).toHaveLength(4);
    expect(fact('Flag')).toHaveTextContent('#1f6c2a9e');
    expect(fact('Resolution')).toHaveTextContent('Not resolved');
    expect(screen.getByLabelText('Lifecycle')).toHaveTextContent(
      'the payout clock is paused by a flag.',
    );
  });

  it('F-3: an operator gets the Resolve flag link; a donor does not', async () => {
    signedInAs();
    serve(TREE_3091, 'operator');
    open('3091');

    expect(await screen.findByRole('link', { name: 'Resolve flag' })).toHaveAttribute(
      'href',
      '/app/operator/trees/3091/flags/1f6c2a9e-4b7d-4e15-9a3c-8d2e5f0b7a61',
    );
  });

  it('F-3: not for a donor', async () => {
    signedInAs();
    serve(TREE_3091, 'donor');
    open('3091');
    await ready();

    expect(await screen.findByText(/Chain windows, pause duration/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Resolve flag' })).toBeNull();
  });

  it('F-13: a pending flag shows the callout without a second full stop, and no form', async () => {
    signedInAs();
    serve(ALEX_3103, 'donor');
    open('3103');

    const callout = await screen.findByText(/^Pending ·/);

    expect(callout).toHaveTextContent(
      'Pending · Reason saved; wallet transaction has not been confirmed. Reason saved; no on-chain flag or pause yet.',
    );
    expect(fact('Payout clock')).toHaveTextContent('Milestone windows');
    expect(screen.queryByLabelText('Flag reason')).toBeNull();
  });
});

describe('S05 tree page, signed in', () => {
  it('T-10/T-13: the planter sees the exact location, Reprint and the capture links', async () => {
    signedInAs();
    serve(SARI_3001);
    open();

    expect(await screen.findByText(/Chain windows, pause duration/)).toBeInTheDocument();
    expect(fact('Location')).toHaveTextContent('-7.431205, 109.247813');

    const reprint = screen.getByRole('link', { name: 'Reprint' });

    expect(reprint).toHaveAttribute('download', 'TC-K7QM-3XRA.svg');
    expect(decodeURIComponent(reprint.getAttribute('href') ?? '')).toContain(
      'Tree #3001 · Roots that stay',
    );
    expect(screen.getByRole('link', { name: 'Record check-in' })).toHaveAttribute(
      'href',
      '/app/planter/record?tree=3001&kind=ALIVE',
    );
    expect(screen.getByRole('link', { name: 'Report dead' })).toHaveClass('tr-warn');
  });

  it('A-2: a live check-in replaces the record link', async () => {
    signedInAs();
    serve(SARI_3104);
    open('3104');

    expect(
      await screen.findByRole('link', { name: 'Month 6 check-in · needs review' }),
    ).toHaveAttribute('href', '/app/evidence/9c2b7e4a-3d1f-4a8e-b6c5-0f9e8d7a6b53');
    expect(screen.queryByRole('link', { name: 'Record check-in' })).toBeNull();
  });

  it('keeps the account in the cache key: the signed-in read waits for the session', async () => {
    signedInAs();
    serve(SARI_3001);
    const { queryClient } = open();

    await screen.findByText(/Chain windows, pause duration/);

    const cached = queryClient.getQueryCache().getAll();

    expect(cached.find((query) => query.queryKey[0] === 'tree')?.state.data).toBeDefined();
    expect(cached.find((query) => query.queryKey[0] === 'public')?.state.data).toBeUndefined();
    expect(treeCalls()).toHaveLength(1);
  });
});

describe('S05 tree page, other states', () => {
  it('T-1: the loading line shows while the tree is read', () => {
    apiMock.mockReturnValue(new Promise(() => undefined));
    open();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading workspace…')).toBeInTheDocument();
  });

  it('T-2: an unknown tree is not found, with a link to the campaigns', async () => {
    fails('not_found', 404);
    open('99999');

    expect(
      await screen.findByRole('heading', { name: 'Tree #99999 doesn’t exist' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No campaign issues this tree id.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Campaigns' })).toHaveAttribute('href', '/campaigns');
  });

  it('T-2: a malformed id is not found without a request', () => {
    open('0');

    expect(screen.getByRole('heading', { name: 'Tree #0 doesn’t exist' })).toBeInTheDocument();
    expect(treeCalls()).toEqual([]);
  });

  it('T-3: a 503 shows the shared error state; Try again reads it once more', async () => {
    fails('service_unavailable', 503);
    open();

    expect(await screen.findByText('Could not load this page')).toBeInTheDocument();

    serve(TREE_3001);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));

    expect(await ready()).toHaveTextContent('Tree #3001');
    expect(treeCalls()).toHaveLength(2);
  });
});
