import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SkipLink } from '../../../../src/app/shell/SkipLink';

describe('SkipLink', () => {
  it('moves focus to the page main without changing the URL (SH-AC3)', async () => {
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Page
        </main>
      </>,
    );

    await userEvent.setup().click(screen.getByRole('link', { name: 'Skip to content' }));

    expect(document.activeElement?.id).toBe('main-content');
    expect(window.location.hash).toBe('');
  });
});
