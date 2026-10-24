// FR-016: `document.title = '{page} · Treecord'`, from the route's name; an unknown route is "Not found" (SH-14).
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { matchPath, type DataRouter } from 'react-router';
import { PAGE_TITLES, TITLE_FALLBACK, TITLE_SUFFIX } from './app.copy';

export const titleFor = (pathname: string): string => {
  const page = PAGE_TITLES.find(([pattern]) => matchPath(pattern, pathname) !== null)?.[1];

  return `${page ?? TITLE_FALLBACK} · ${TITLE_SUFFIX}`;
};

/** Sets the title now and after every navigation. Runs before React commits the page, so a page may refine it. */
export const watchTitle = (router: Pick<DataRouter, 'state' | 'subscribe'>): (() => void) => {
  const apply = (): void => {
    document.title = titleFor(router.state.location.pathname);
  };

  apply();

  return router.subscribe(apply);
};
