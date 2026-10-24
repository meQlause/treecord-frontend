import type { ReactNode } from 'react';
import { Icon } from '../art/Icon';
import { Banner } from './Banner';
import { Button } from './Button';

// The S03 load-more row (pattern 10). While more exist: outline button + "{shown} of {total}". `loading` disables it and
// spins the retry icon; `failed` (copy) puts an error Banner above it, the loaded rows stay, and Try again resends the
// same cursor (onMore). At the end the button goes and `end` (the list's "no more" copy) shows when given.
const ICON_SIZE = 16;

type RowProps = {
  shown: number;
  total: number;
  label: ReactNode;
  meta?: ReactNode;
  loading: boolean;
  loadingLabel: string;
  end?: ReactNode;
  onMore: () => void;
};

type LoadMoreProps = Omit<RowProps, 'loading' | 'loadingLabel'> & {
  loading?: boolean;
  loadingLabel?: string;
  /** The failure copy; shows an error Banner above the row. */
  failed?: string;
  retryLabel?: string;
};

function LoadRow({ shown, total, label, meta, loading, loadingLabel, end, onMore }: RowProps) {
  if (shown >= total) {
    return end === undefined ? null : (
      <div className="load-more">
        <span>{end}</span>
      </div>
    );
  }

  return (
    <div className="load-more">
      <Button
        variant="outline"
        onClick={onMore}
        disabled={loading}
        aria-busy={loading || undefined}
      >
        {loading ? loadingLabel : label}
        <Icon
          name={loading ? 'retry' : 'down'}
          className={loading ? 'spinning' : ''}
          size={ICON_SIZE}
        />
      </Button>
      <span>{meta ?? `${shown} of ${total}`}</span>
    </div>
  );
}

export function LoadMore({
  failed,
  retryLabel = 'Try again',
  loading = false,
  loadingLabel = 'Loading…',
  ...row
}: LoadMoreProps) {
  return (
    <>
      {failed !== undefined && (
        <Banner tone="error" action={retryLabel} onAction={row.onMore}>
          {failed}
        </Banner>
      )}
      <LoadRow {...row} loading={loading} loadingLabel={loadingLabel} />
    </>
  );
}
