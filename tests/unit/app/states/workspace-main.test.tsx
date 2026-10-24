import { onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceMain } from '../../../../src/app/states/workspace-main';

const OFFLINE = 'Offline · showing saved data. Network actions are unavailable.';

const goOffline = () => act(() => onlineManager.setOnline(false));

describe('WorkspaceMain', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('SH-7: the page sits in the main landmark, enabled', () => {
    render(
      <WorkspaceMain>
        <button type="button">Save</button>
      </WorkspaceMain>,
    );

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.queryByText(OFFLINE)).toBeNull();
  });

  it('SH-9: offline shows the callout above the page and disables every control, keeping the content', () => {
    render(
      <WorkspaceMain>
        <p>cached data</p>
        <button type="button">Save</button>
      </WorkspaceMain>,
    );

    goOffline();

    expect(screen.getByText(OFFLINE)).toHaveClass('ws-callout');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText('cached data')).toBeInTheDocument();

    act(() => onlineManager.setOnline(true));

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.queryByText(OFFLINE)).toBeNull();
  });
});
