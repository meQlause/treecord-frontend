import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SignInButton } from '../../../../src/app/shell/SignInButton';
import { renderShell } from './harness';

const press = () => userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));

describe('SignInButton', () => {
  it('goes to sign-in, carrying the current path and query to come back to', async () => {
    renderShell(<SignInButton />, '/carbon?batch=3');
    await press();

    expect(screen.getByTestId('where')).toHaveTextContent(
      `/sign-in?returnTo=${encodeURIComponent('/carbon?batch=3')}`,
    );
  });

  it('returns to /app from the sign-in page itself (FR-004 #3)', async () => {
    renderShell(<SignInButton />, '/sign-in?returnTo=%2Fcarbon');
    await press();

    expect(screen.getByTestId('where')).toHaveTextContent('/sign-in?returnTo=%2Fapp');
  });
});
