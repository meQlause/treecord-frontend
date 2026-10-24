import { onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppState } from '../../../../src/app/states/app-state';

const OFFLINE = 'Offline · showing saved data. Network actions are unavailable.';

const goOffline = () => act(() => onlineManager.setOnline(false));

describe('AppState (pattern 14)', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('is transparent online', () => {
    render(
      <AppState>
        <button type="button">Contribute</button>
      </AppState>,
    );

    expect(screen.getByRole('button', { name: 'Contribute' })).toBeEnabled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('offline: a banner with Refresh above the page, every control disabled', async () => {
    const reload = vi.fn();

    vi.stubGlobal('location', { ...window.location, reload });
    render(
      <AppState>
        <button type="button">Contribute</button>
      </AppState>,
    );
    goOffline();

    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE);
    expect(screen.getByRole('button', { name: 'Contribute' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(reload).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
