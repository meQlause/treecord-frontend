import type { MouseEvent } from 'react';
import { SHELL_COPY } from './shell.copy';

// shell.md §4 Header: "Skip to content" moves focus to the page's <main id="main-content" tabIndex={-1}>.
const focusMain = (event: MouseEvent): void => {
  event.preventDefault();
  document.getElementById('main-content')?.focus();
};

export function SkipLink() {
  return (
    <a className="skip-link" href="#main-content" onClick={focusMain}>
      {SHELL_COPY.skipLink}
    </a>
  );
}
