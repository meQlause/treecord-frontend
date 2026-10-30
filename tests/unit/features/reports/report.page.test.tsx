import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '../../../../src/features/reports/report.page';
import {
  ADDRESS,
  CURSOR,
  FIRST_PAGE,
  FUNDING_REPORT,
  MANGROVES_CARBON,
  REPORT,
  SECOND_PAGE,
} from '../../../fidelity/fixtures/report';
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

type Reply = { status?: number; body: unknown };

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const routes: RouteObject[] = [{ path: '/campaigns/:address/report', Component }];
const REPORT_URL = `/api/v1/reports/campaign/${ADDRESS}`;

const respond = ({ status = 200, body }: Reply): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const error = (code: string, status: number): Reply => ({
  status,
  body: { error: { code, message: code } },
});

/** Answers each URL (without its query) from `replies`; the last array entry repeats. */
const serve = (replies: Readonly<Record<string, Reply | Reply[]>>): void => {
  const used = new Map<string, number>();

  fetchMock.mockImplementation((url) => {
    const key = url.split('?')[0] ?? url;
    const reply = replies[key];
    const list = Array.isArray(reply) ? reply : [reply];
    const index = Math.min(used.get(key) ?? 0, list.length - 1);

    used.set(key, index + 1);

    return Promise.resolve(respond(list[index] ?? error('not_found', 404)));
  });
};

const open = (address = ADDRESS) => renderRoutes(routes, `/campaigns/${address}/report`);

const ready = () => screen.findByRole('heading', { level: 1 });

beforeEach(() => {
  resetPrivy();
  apiMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('S06 report page', () => {
  it('R-4: shows the heading, the title, the place, the UTC date and the back link', async () => {
    serve({ [REPORT_URL]: { body: { report: REPORT } } });
    open();

    expect(await ready()).toHaveTextContent('Roots that stay');
    expect(screen.getByText('CAMPAIGN IMPACT REPORT')).toBeInTheDocument();
    expect(screen.getByText('Active')).toHaveClass('badge');
    expect(screen.getByText('As of 21 Oct 2026 UTC')).toBeInTheDocument();
    expect(document.querySelector('.rp-heading p')).toHaveTextContent(
      'Banyumas, Central Java · Mahogany',
    );
    expect(screen.getByRole('link', { name: 'Back to campaign' })).toHaveAttribute(
      'href',
      `/campaigns/${ADDRESS}`,
    );
  });

  it('never sends a token, even to a signed-in viewer', async () => {
    signedInAs();
    apiMock.mockResolvedValue({ profile: SARI });
    serve({ [REPORT_URL]: { body: { report: REPORT } } });
    open();

    await ready();
    expect(new Headers(fetchMock.mock.calls[0]?.[1].headers).has('Authorization')).toBe(false);
  });

  it('R-6/R-7: the health legend, the funding ledger and the incentive figures', async () => {
    serve({ [REPORT_URL]: { body: { report: REPORT } } });
    open();
    await ready();

    expect(screen.getByText('Average age 186 days')).toBeInTheDocument();
    expect(screen.getByText('948')).toBeInTheDocument();
    expect(screen.getByText('18,000 USDC')).toBeInTheDocument();
    expect(screen.getByText('36 months')).toBeInTheDocument();
    expect(screen.getByText('2,500 m')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Funding' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByText('17%')).toBeInTheDocument();
    expect(screen.getByText('M12')).toBeInTheDocument();
  });

  it('R-5/R-8/E-2: a Funding campaign has a dash, no payouts and no evidence', async () => {
    serve({ [REPORT_URL]: { body: { report: FUNDING_REPORT } } });
    open();
    await ready();

    expect(screen.getByText('Mutually exclusive statuses')).toBeInTheDocument();
    expect(screen.getByText('No milestone payouts yet.')).toBeInTheDocument();
    expect(screen.getByText('No public evidence available.')).toBeInTheDocument();
    expect(document.querySelector('.pc-forest')).toBeNull();
  });
});

// FR-244, s06 §7 #17: forfeits the Chainlink keeper enforced, counted under "Forfeited".
describe('S06 report page, enforced by Chainlink', () => {
  const withEnforced = (chainlinkEnforced: number) => ({
    report: { ...REPORT, incentives: { ...REPORT.incentives, chainlinkEnforced } },
  });

  it('shows "3 enforced by Chainlink" when the keeper sent three forfeits', async () => {
    serve({ [REPORT_URL]: { body: withEnforced(3) } });
    open();
    await ready();

    expect(screen.getByText('3 enforced by Chainlink')).toBeInTheDocument();
  });

  it('shows no line when the keeper sent none', async () => {
    serve({ [REPORT_URL]: { body: withEnforced(0) } });
    open();
    await ready();

    expect(screen.queryByText(/enforced by Chainlink/)).not.toBeInTheDocument();
  });
});

describe('S06 report page, carbon and evidence', () => {
  it('R-9/R-13: no issuance shows the estimate apart and the empty carbon state', async () => {
    serve({ [REPORT_URL]: { body: { report: REPORT } } });
    open();
    await ready();

    expect(screen.getByText('8,005 units. Estimates are not issued credits.')).toBeInTheDocument();
    expect(screen.getByText('No carbon has been issued.')).toBeInTheDocument();
    expect(document.querySelector('.rp-funnel')).toBeNull();
  });

  it('R-9: no estimate says so', async () => {
    const carbon = {
      ...REPORT.carbon,
      estimate: { ...REPORT.carbon.estimate, estimatedAmount: null },
    };

    serve({ [REPORT_URL]: { body: { report: { ...REPORT, carbon } } } });
    open();
    await ready();

    expect(screen.getByText('Not estimated')).toBeInTheDocument();
    expect(
      screen.getByText('No estimate or method available. Estimates are not issued credits.'),
    ).toBeInTheDocument();
  });

  it('R-11/R-12: issued carbon shows the funnel and the batch table with its links', async () => {
    serve({ [REPORT_URL]: { body: { report: { ...REPORT, carbon: MANGROVES_CARBON } } } });
    open();
    await ready();

    const table = screen.getByRole('table', { name: 'Issuance batches' });

    expect(document.querySelector('.rp-funnel')).not.toBeNull();
    expect(within(table).getByRole('link', { name: '#101 · SRN PPI' })).toHaveAttribute(
      'href',
      '/carbon/101',
    );
    expect(within(table).getByText('16.000')).toBeInTheDocument();
    expect(screen.getByText(/22,000 issued units · 400 retired units/)).toBeInTheDocument();
  });

  it('R-18: the estimate method adds one line under the estimate', async () => {
    const estimate = { ...REPORT.carbon.estimate, method: { model: 'linear-maturity-v1' } };

    serve({
      [REPORT_URL]: { body: { report: { ...REPORT, carbon: { ...REPORT.carbon, estimate } } } },
    });
    open();
    await ready();

    expect(screen.getByText(/linear-maturity-v1/)).toHaveTextContent('Method · linear-maturity-v1');
  });

  it('R-14: a campaign without a title is named by its short address in the same h1', async () => {
    const campaign = { ...REPORT.campaign, title: null };

    serve({ [REPORT_URL]: { body: { report: { ...REPORT, campaign } } } });
    open();

    expect(await ready()).toHaveTextContent(/^Campaign 0x[0-9a-fA-F]{4}…[0-9a-fA-F]{4}$/u);
  });

  it('E-1: evidence rows link to the tree and the explorer; signed out has no roster note', async () => {
    serve({ [REPORT_URL]: { body: { report: REPORT } } });
    open();
    await ready();

    const rows = within(screen.getByRole('table', { name: 'Evidence record' })).getAllByRole('row');

    expect(rows).toHaveLength(4);
    expect(within(rows[1]!).getByRole('link', { name: '#3001' })).toHaveAttribute(
      'href',
      '/trees/3001',
    );
    expect(within(rows[1]!).getByText('0x70e9…0ba8')).toBeInTheDocument();
    expect(within(rows[1]!).getByRole('link', { name: '24118402' })).toHaveAttribute(
      'href',
      expect.stringContaining('/block/24118402'),
    );
    expect(screen.queryByText('This is not a complete tree roster.')).toBeNull();
  });

  it('E-3: signed in, the roster note shows', async () => {
    signedInAs();
    apiMock.mockResolvedValue({ profile: SARI });
    serve({ [REPORT_URL]: { body: { report: REPORT } } });
    open();
    await ready();

    expect(await screen.findByText('This is not a complete tree roster.')).toBeInTheDocument();
  });
});

describe('S06 report states', () => {
  it('R-1: the loading line shows at once, with no title and no skeleton block', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    open();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading impact report…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(document.querySelector('.skeleton')).toBeNull();
  });

  it('R-2: a 503 shows the unavailable state, never a figure; Try again reads it again', async () => {
    serve({ [REPORT_URL]: [error('service_unavailable', 503), { body: { report: REPORT } }] });
    open();

    expect(await screen.findByRole('alert')).toHaveTextContent('Report unavailable');
    expect(screen.getByText('Campaign totals could not be loaded.')).toBeInTheDocument();
    expect(screen.queryByText(/USDC/)).toBeNull();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));

    expect(await ready()).toHaveTextContent('Roots that stay');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('R-3: a 404 is "Report not found" with a link to all campaigns', async () => {
    serve({ [REPORT_URL]: error('not_found', 404) });
    open();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Report not found' }),
    ).toBeInTheDocument();
    expect(screen.getByText('This campaign is not in the catalog.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All campaigns' })).toHaveAttribute(
      'href',
      '/campaigns',
    );
  });

  it('R-3: a malformed address is not found without a request', () => {
    open('0x1234');

    expect(screen.getByRole('heading', { name: 'Report not found' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('S06 evidence paging', () => {
  const withCursor = { ...REPORT, evidence: FIRST_PAGE };
  const rowCount = (): number =>
    within(screen.getByRole('table', { name: 'Evidence record' })).getAllByRole('row').length - 1;

  it('E-4: load more sends the cursor, appends the rows and ends at the total', async () => {
    serve({
      [REPORT_URL]: { body: { report: withCursor } },
      [`${REPORT_URL}/evidence`]: { body: SECOND_PAGE },
    });
    open();
    await ready();

    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByTestId('evidence-more'));

    await waitFor(() => expect(rowCount()).toBe(3));
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(`${REPORT_URL}/evidence?cursor=${CURSOR}`);
    expect(screen.queryByTestId('evidence-more')).toBeNull();
  });

  it('E-5: while the next page is pending the button is busy', async () => {
    serve({ [REPORT_URL]: { body: { report: withCursor } } });
    open();
    await ready();
    fetchMock.mockReturnValue(new Promise(() => undefined));

    await userEvent.setup().click(screen.getByTestId('evidence-more'));

    await waitFor(() =>
      expect(screen.getByTestId('evidence-more')).toHaveAttribute('aria-busy', 'true'),
    );
    expect(screen.getByTestId('evidence-more')).toBeDisabled();
  });

  it('E-6: an invalid cursor keeps the rows, alerts, and Try again resends the same cursor', async () => {
    serve({
      [REPORT_URL]: { body: { report: withCursor } },
      [`${REPORT_URL}/evidence`]: [error('invalid_cursor', 400), { body: SECOND_PAGE }],
    });
    open();
    await ready();

    await userEvent.setup().click(screen.getByTestId('evidence-more'));
    expect(await screen.findByTestId('evidence-more-error')).toHaveAttribute('role', 'alert');
    expect(rowCount()).toBe(1);

    await userEvent.setup().click(
      within(screen.getByTestId('evidence-more-error')).getByRole('button', {
        name: 'Try again',
      }),
    );
    await waitFor(() => expect(rowCount()).toBe(3));

    const cursors = fetchMock.mock.calls
      .map(([url]) => url)
      .filter((url) => url.includes('/evidence'));

    expect(cursors).toEqual([
      `${REPORT_URL}/evidence?cursor=${CURSOR}`,
      `${REPORT_URL}/evidence?cursor=${CURSOR}`,
    ]);
  });

  it('a campaign that vanishes while paging is not found', async () => {
    serve({
      [REPORT_URL]: { body: { report: withCursor } },
      [`${REPORT_URL}/evidence`]: error('not_found', 404),
    });
    open();
    await ready();

    await userEvent.setup().click(screen.getByTestId('evidence-more'));

    expect(await screen.findByRole('heading', { name: 'Report not found' })).toBeInTheDocument();
  });
});
