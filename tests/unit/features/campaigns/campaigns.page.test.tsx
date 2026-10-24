import { onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '../../../../src/features/campaigns/campaigns.page';
import { ApiError } from '../../../../src/shared/api/errors';
import { apiMock, resetPrivy } from '../../session-mocks';
import { renderAt } from './harness';

vi.mock('@privy-io/react-auth', async () => (await import('../../session-mocks')).privyModule);
vi.mock(
  '../../../../src/app/session/api',
  async () => (await import('../../session-mocks')).apiModule,
);
vi.mock(
  '../../../../src/app/session/config',
  async () => (await import('../../session-mocks')).configModule,
);

const SPECIES = {
  items: [
    { code: 'DURIO_ZIBETHINUS', name: 'Durian' },
    { code: 'FALCATARIA_FALCATA', name: 'Sengon' },
  ],
  nextCursor: null,
  total: 2,
};

const DEMAK = {
  address: '0x0000000000000000000000000000000000000001',
  status: 'funding',
  title: 'A new tide for Demak',
  species: { code: 'RHIZOPHORA_MUCRONATA', name: 'Rhizophora mangrove' },
  region: { name: 'Demak, Central Java' },
  treeTarget: 1000,
  commitmentUnits: 36,
  fundingTarget: '10000000000',
  fundedAmount: '6840000000',
  progressBps: 6840,
  daysLeft: 18,
  fundingDeadlinePassed: false,
};

const SENGON = {
  ...DEMAK,
  address: '0x0000000000000000000000000000000000000002',
  title: 'Room for a forest',
  fundingTarget: '8000000000',
  fundedAmount: '4200000000',
  progressBps: 5250,
  daysLeft: 24,
};

const UNAVAILABLE = new ApiError({ code: 'service_unavailable', message: 'down', status: 503 });
const CURSOR = 'next-page';
const routes = [{ path: '/campaigns', Component }];

const answer = (list: (options: { query?: Record<string, unknown> }) => unknown) =>
  apiMock.mockImplementation((path: string, options: { query?: Record<string, unknown> } = {}) =>
    path === '/species' ? Promise.resolve(SPECIES) : Promise.resolve(list(options)),
  );

const listCalls = () => apiMock.mock.calls.filter(([path]) => path === '/campaigns');

beforeEach(() => {
  resetPrivy();
  apiMock.mockReset();
});

afterEach(() => onlineManager.setOnline(true));

describe('S03 campaigns page', () => {
  it('C-2: draws the cards with their figures and the count line', async () => {
    answer(() => ({ items: [DEMAK, SENGON], nextCursor: null, total: 2 }));
    renderAt(routes, '/campaigns');

    const card = (await screen.findByText('A new tide for Demak')).closest('article');

    expect(card).toHaveTextContent('6,840 USDC');
    expect(card).toHaveTextContent('68%');
    expect(card).toHaveTextContent('of 10,000 USDC');
    expect(card).toHaveTextContent('18 days left');
    expect(within(card as HTMLElement).getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '68',
    );
    expect(screen.getByText('2 campaigns')).toBeInTheDocument();
    expect(screen.getByText('Newest first')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more campaigns' })).toBeNull();
  });

  it('C-1: shows six skeleton cards and the finding line while the first page is pending', () => {
    apiMock.mockReturnValue(new Promise(() => undefined));
    renderAt(routes, '/campaigns');

    expect(
      screen.getByLabelText('Loading campaigns').querySelectorAll('.skeleton-card'),
    ).toHaveLength(6);
    expect(screen.getByText('Finding your next forest…')).toBeInTheDocument();
  });

  it('C-11: loads the next page with the cursor and appends it', async () => {
    answer(({ query }) =>
      query?.cursor === undefined
        ? { items: [DEMAK], nextCursor: CURSOR, total: 2 }
        : { items: [SENGON], nextCursor: null, total: 2 },
    );
    renderAt(routes, '/campaigns');

    expect(await screen.findByText('1 of 2 campaigns')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more campaigns' }));

    expect(await screen.findByText('Room for a forest')).toBeInTheDocument();
    expect(screen.getByText('A new tide for Demak')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more campaigns' })).toBeNull();
    expect(listCalls()[1]?.[1]).toMatchObject({ query: { cursor: CURSOR } });
  });

  it('C-13: a failed next page keeps the cards and Try again resends the cursor', async () => {
    let fail = true;

    answer(({ query }) => {
      if (query?.cursor === undefined) {
        return { items: [DEMAK], nextCursor: CURSOR, total: 2 };
      }

      if (fail) {
        throw UNAVAILABLE;
      }

      return { items: [SENGON], nextCursor: null, total: 2 };
    });
    renderAt(routes, '/campaigns');
    await userEvent.click(await screen.findByRole('button', { name: 'Load more campaigns' }));

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Couldn’t load more. Your campaigns are still here.');
    expect(screen.getByText('A new tide for Demak')).toBeInTheDocument();
    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Room for a forest')).toBeInTheDocument();
  });
});

describe('S03 campaigns page, filters', () => {
  it('FR-032: the URL names the status and the species, and only their request values are sent', async () => {
    answer(() => ({ items: [SENGON], nextCursor: null, total: 1 }));
    renderAt(routes, '/campaigns?status=Active&species=Sengon&region=%20java%20');

    await screen.findByText('Room for a forest');

    expect(listCalls()[0]?.[1]).toMatchObject({
      query: { status: 'active', species: 'FALCATARIA_FALCATA', region: 'java' },
    });
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Filter by species')).toHaveValue('Sengon');
    expect(screen.getByLabelText('Filter by region')).toHaveValue('java');
  });

  it('FR-032: an unknown status and an unknown species are not sent', async () => {
    answer(() => ({ items: [DEMAK], nextCursor: null, total: 1 }));
    renderAt(routes, '/campaigns?status=Paused&species=Teak');

    await screen.findByText('A new tide for Demak');

    expect(listCalls()[0]?.[1]).toMatchObject({
      query: { status: undefined, species: undefined },
    });
    expect(screen.getByRole('button', { name: 'All campaigns' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('FR-032: a status tab writes the URL and "Clear filters" empties it, region text included', async () => {
    answer(() => ({ items: [DEMAK], nextCursor: null, total: 1 }));
    renderAt(routes, '/campaigns?region=java');
    await screen.findByText('A new tide for Demak');

    await userEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.getByTestId('where')).toHaveTextContent(
      '/campaigns?region=java&status=Completed',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/campaigns$/));
    expect(screen.getByLabelText('Filter by region')).toHaveValue('');
    expect(screen.getByText('Newest first')).toBeInTheDocument();
  });

  it('FR-032: the region reaches the URL 300 ms after the last key, and Clear region at once', async () => {
    answer(() => ({ items: [DEMAK], nextCursor: null, total: 1 }));
    renderAt(routes, '/campaigns');
    await screen.findByText('A new tide for Demak');

    await userEvent.type(screen.getByLabelText('Filter by region'), 'java');
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/campaigns$/);
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('/campaigns?region=java'),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Clear region' }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/campaigns$/));
  });
});

describe('S03 campaigns page, states', () => {
  it('C-8: an empty catalog has no button', async () => {
    answer(() => ({ items: [], nextCursor: null, total: 0 }));
    renderAt(routes, '/campaigns');

    expect(await screen.findByText('The next forest starts here')).toBeInTheDocument();
    expect(screen.getByText('No campaigns to show yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('C-9: an empty filtered catalog offers Clear filters', async () => {
    answer(() => ({ items: [], nextCursor: null, total: 0 }));
    renderAt(routes, '/campaigns?species=Durian');

    expect(await screen.findByText('No matching campaigns')).toBeInTheDocument();
    expect(screen.getByText('Try another species, region, or status.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clear filters' }).length).toBeGreaterThan(0);
  });

  it('C-10: a failed first page shows the hiccup and Try again asks once more', async () => {
    apiMock.mockImplementation((path: string) =>
      path === '/species' ? Promise.resolve(SPECIES) : Promise.reject(UNAVAILABLE),
    );
    renderAt(routes, '/campaigns');

    expect(await screen.findByText('Couldn’t load campaigns')).toBeInTheDocument();
    expect(screen.getByText('Campaigns unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('article')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(listCalls()).toHaveLength(2));
  });

  it('C-10: a failed species list with a species in the URL is the same failure', async () => {
    apiMock.mockRejectedValue(UNAVAILABLE);
    renderAt(routes, '/campaigns?species=Sengon');

    expect(await screen.findByText('Couldn’t load campaigns')).toBeInTheDocument();
    expect(listCalls()).toHaveLength(0);
  });

  it('C-6: an untitled campaign still has a title link and a named View campaign link', async () => {
    answer(() => ({ items: [{ ...DEMAK, title: null }], nextCursor: null, total: 1 }));
    renderAt(routes, '/campaigns');

    expect(await screen.findByTestId('campaign-title')).toHaveTextContent(/\S/);
    expect(screen.getByRole('link', { name: /^View campaign: \S/ })).toBeInTheDocument();
  });

  it('C-15 / C-16: offline puts the cached cards under a banner until Refresh succeeds', async () => {
    answer(() => ({ items: [DEMAK], nextCursor: null, total: 1 }));
    renderAt(routes, '/campaigns');
    await screen.findByText('A new tide for Demak');

    act(() => onlineManager.setOnline(false));
    expect(
      await screen.findByText('You’re offline · Showing cached campaigns'),
    ).toBeInTheDocument();
    expect(screen.getByText('A new tide for Demak')).toBeInTheDocument();

    act(() => onlineManager.setOnline(true));
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByText('Campaigns refreshed')).toBeInTheDocument();
    expect(screen.queryByText('You’re offline · Showing cached campaigns')).toBeNull();
  });
});
