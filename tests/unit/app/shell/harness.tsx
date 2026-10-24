import { render } from '@testing-library/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { MemoryRouter, useLocation } from 'react-router';
import type { ReactElement } from 'react';
import { MotionProvider } from '../../../../src/app/shell/motion-context';
import { ToastProvider } from '../../../../src/app/shell/toast-context';

function Where() {
  const { pathname, search } = useLocation();

  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

/** The shell providers around `ui`, at `path`; the current URL is in the `where` test id. */
export function renderShell(page: ReactElement, path = '/campaigns') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MotionProvider>
        <ToastProvider>
          {page}
          <Where />
        </ToastProvider>
      </MotionProvider>
    </MemoryRouter>,
  );
}

/** Says whether the system asks for reduced motion; returns the function that puts the stub back. */
export function setReducedMotion(reduced: boolean): () => void {
  const original = window.matchMedia;

  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof window.matchMedia;

  return () => {
    window.matchMedia = original;
  };
}
