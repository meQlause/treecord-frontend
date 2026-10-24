import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageMotion } from '../../../../src/app/shell/PageMotion';
import { renderShell } from './harness';

const scrollTo = vi.fn();

function Layout() {
  return (
    <>
      <Link to="/b">to b</Link>
      <Link to="/a?filter=1">filter a</Link>
      <PageMotion />
    </>
  );
}

const renderPages = () =>
  renderShell(
    <Routes>
      <Route element={<Layout />}>
        <Route path="/a" element={<p>Page A</p>} />
        <Route path="/b" element={<p>Page B</p>} />
      </Route>
    </Routes>,
    '/a',
  );

beforeEach(() => {
  window.scrollTo = scrollTo;
  // the leaving page goes at once, so the new one can be found
  MotionGlobalConfig.skipAnimations = true;
});
afterEach(() => {
  scrollTo.mockClear();
  MotionGlobalConfig.skipAnimations = false;
});

describe('PageMotion', () => {
  it('shows the routed page inside .page-motion', () => {
    const { container } = renderPages();

    expect(container.querySelector('.page-motion')).toHaveTextContent('Page A');
  });

  it('swaps the page on a path change and scrolls to the top', async () => {
    renderPages();
    await userEvent.setup().click(screen.getByRole('link', { name: 'to b' }));

    expect(await screen.findByText('Page B')).toBeInTheDocument();
    expect(screen.queryByText('Page A')).toBeNull();
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
  });

  it('does not replay on a query-only change: same page, no scroll reset', async () => {
    renderPages();
    scrollTo.mockClear();

    const page = screen.getByText('Page A');

    await userEvent.setup().click(screen.getByRole('link', { name: 'filter a' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/a?filter=1');
    expect(screen.getByText('Page A')).toBe(page);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
