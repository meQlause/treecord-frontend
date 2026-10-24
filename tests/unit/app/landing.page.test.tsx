import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Component as Landing } from '../../../src/app/landing.page';
import { renderRoutes } from '../session-mocks';

const Stop = () => <p>landed</p>;

describe('landing (shell.md §6)', () => {
  const replace = vi.fn();
  const open = (href: string) => {
    vi.stubGlobal('location', { href, replace });

    return renderRoutes(
      [
        { path: '/', Component: Landing },
        { path: '/campaigns', Component: Stop },
        { path: '/sign-in', Component: Stop },
      ],
      '/',
    );
  };

  afterEach(() => {
    replace.mockClear();
    vi.unstubAllGlobals();
  });

  it('SH-AC12: the bare address leaves for the landing page, a full navigation', () => {
    open('http://app.test/');

    expect(replace).toHaveBeenCalledWith('/landing/');
  });

  it.each([
    ['http://app.test/#/campaigns', '/campaigns'],
    ['http://app.test/#/sign-in', '/sign-in'],
    ['http://app.test/#', '/campaigns'],
  ])('%s replaces to %s inside the app', async (href, path) => {
    const { router } = open(href);

    await waitFor(() => expect(router.state.location.pathname).toBe(path));

    expect(replace).not.toHaveBeenCalled();
  });
});
