// What S24-S26 share: the not-found state with its way back, the error mapping of a failed read, the sticky rail's panel
// and the typed-but-unsent drafts (summary, notes) kept in `sessionStorage` under the account, wallet and chain.
import type { ReactNode } from 'react';
import { config } from '../../app/session/config';
import { useSession } from '../../app/session/session';
import { ErrorView } from '../../app/states/states';
import { ApiError } from '../../shared/api/errors';
import { Icon, type IconName } from '../../shared/art/Icon';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { EmptyState } from '../../shared/ui/EmptyState';
import { useDraftText } from '../carbon/draft';
import * as copy from './audit.copy';
import { draftKey } from './audit.rules';

const HEADING_ICON = 22;
const NOTE_ICON = 16;
const NOT_FOUND_CODES = new Set(['not_found', 'invalid_path']);

/** "Session not found" with the way back (FR-180 acc. 2: an unknown id and another auditor's id read the same). */
export function SessionNotFound() {
  return (
    <EmptyState variant="compact" title={copy.SESSION_NOT_FOUND}>
      <ArrowLink to="/app/audit">{copy.BACK_TO_AUDIT}</ArrowLink>
    </EmptyState>
  );
}

/** A failed page read by error-handling §5: not found → the session's own state, anything else the shared view. */
export function AuditError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return error instanceof ApiError && NOT_FOUND_CODES.has(error.code) ? (
    <SessionNotFound />
  ) : (
    <ErrorView error={error} onRetry={onRetry} />
  );
}

type PanelProps = {
  title: string;
  icon: IconName;
  eyebrow: ReactNode;
  note?: ReactNode;
  noteIcon?: IconName;
  children?: ReactNode;
};

/** The rail's aside (`cb-buy pl-panel`): heading, eyebrow, the body, then the one-line note. */
export function RailPanel({
  title,
  icon,
  eyebrow,
  note,
  noteIcon = 'check',
  children,
}: PanelProps) {
  return (
    <aside className="cb-buy pl-panel">
      <div className="cb-buy-heading">
        <h2>{title}</h2>
        <Icon name={icon} size={HEADING_ICON} />
      </div>
      <span className="eyebrow">{eyebrow}</span>
      {children}
      {note !== undefined && (
        <div className="cb-buy-note">
          <Icon name={noteIcon} size={NOTE_ICON} />
          <span>{note}</span>
        </div>
      )}
    </aside>
  );
}

/** A draft of this session (`summary`, `notes:<treeId>`); the key is known once the profile is. */
export function useAuditDraft(rest: string) {
  const session = useSession();
  const key = session.phase === 'ready' ? draftKey(session.profile, config().chainId, rest) : null;

  return useDraftText(key);
}
