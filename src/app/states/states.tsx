import type { ReactNode } from 'react';
import { ApiError } from '../../shared/api/errors';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton';
import {
  ERROR_BODY,
  ERROR_TITLE,
  LOADING,
  NOT_FOUND,
  OTHER_ROLE,
  ROLE_UNAVAILABLE,
  TRY_AGAIN,
  roleBody,
} from './states.copy';

// The workspace states of shell.md §3 (SH-2, SH-8, SH-10, SH-11, SH-13). A timeout is a network failure and shows the
// error state too (pattern 15).

/** SH-2: the session or the page is still resolving. */
export function LoadingState() {
  return <Skeleton shape="list" label={LOADING} />;
}

/** SH-8 / SH-10: a read failed with a `retry` code; "Try again" re-runs only that read. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState tone="error" title={ERROR_TITLE} description={ERROR_BODY}>
      <Button icon="retry" onClick={onRetry}>
        {TRY_AGAIN}
      </Button>
    </EmptyState>
  );
}

/** SH-11 / SH-12: the page is not mounted. `children` is the body; without it, the generic one. */
export function ForbiddenState({ children }: { children?: ReactNode }) {
  return (
    <EmptyState variant="compact" title={ROLE_UNAVAILABLE}>
      <p>{children ?? roleBody(OTHER_ROLE)}</p>
    </EmptyState>
  );
}

/** SH-13 / SH-14: `title` is the screen's error-handling §5.1 title. */
export function NotFoundState({ title }: { title: string | undefined }) {
  return <EmptyState variant="compact" title={title ?? NOT_FOUND} />;
}

const NOT_FOUND_CODES = new Set(['not_found', 'invalid_path']);

/**
 * What a failed page read shows, by error-handling §5: 403 `forbidden_role` → Role unavailable, 404 `not_found` /
 * 400 `invalid_path` → the screen's not-found title, anything else (retry class, timeout, offline) → Try again.
 * A refused token (401) is handled once for the whole app and never reaches a screen.
 */
export function ErrorView({
  error,
  onRetry,
  notFoundTitle,
}: {
  error: unknown;
  onRetry: () => void;
  notFoundTitle?: string;
}) {
  const code = error instanceof ApiError ? error.code : '';

  if (code === 'forbidden_role') {
    return <ForbiddenState />;
  }

  return NOT_FOUND_CODES.has(code) ? (
    <NotFoundState title={notFoundTitle} />
  ) : (
    <ErrorState onRetry={onRetry} />
  );
}
