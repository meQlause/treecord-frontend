// shell.md §6: `/` opens the landing page (a separate project), and the landing page's old hash links keep working
// (`/#/campaigns`, `/#/sign-in`); `/#` and `/#/` open `/campaigns` (FR-009, mockup main.jsx:236, 249).
import { safeReturn } from './return-to';

export const LANDING = '/landing/';

const CAMPAIGNS = '/campaigns';

/** `LANDING`, or the internal path after the `#` of a legacy link. */
export const legacyTarget = (href: string): string => {
  const { hash } = new URL(href);

  if (hash !== '') {
    const target = safeReturn(hash.slice(1), CAMPAIGNS);

    return target === '/' ? CAMPAIGNS : target;
  }

  // "/#" parses to an empty hash, so the bare "#" is read from the address itself
  return href.endsWith('#') ? CAMPAIGNS : LANDING;
};
