import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Component as NotFound } from '../../../src/app/not-found.page';
import { renderRoutes } from '../session-mocks';

describe('not-found (SH-14)', () => {
  it('titles an unknown public route and frames it in the main landmark', () => {
    renderRoutes([{ path: '*', Component: NotFound }], '/nowhere');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('under /app the frame is the guard’s, so it adds none', () => {
    renderRoutes([{ path: '*', Component: NotFound }], '/app/nope');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.queryByRole('main')).toBeNull();
  });
});
