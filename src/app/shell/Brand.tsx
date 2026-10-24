import { Logo } from '../../shared/art/Logo';
import { SHELL_COPY } from './shell.copy';

const MARK_SIZE = 36;

/** "treecord." to the landing project: a plain link, so the browser does a full navigation (shell.md §4). */
export function Brand() {
  return (
    <a href="/landing/" className="brand" aria-label={SHELL_COPY.brandHome}>
      <span className="brand-mark">
        <Logo size={MARK_SIZE} />
      </span>
      {SHELL_COPY.brandName}
      <span className="brand-period">{SHELL_COPY.brandPeriod}</span>
    </a>
  );
}
