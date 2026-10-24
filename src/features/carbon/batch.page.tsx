// S08 Carbon batch (s08-batch.md): one batch, its provenance and registry record, the credit journey, its stock and D08.
// Public: the batch read sends no token. This phase draws the read side; F2b wires the purchase into the buy panel.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useParams } from 'react-router';
import { AppState } from '../../app/states/app-state';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/art/Icon';
import { tonnes } from '../../shared/format/carbon';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import { StockCard } from '../../shared/ui/StockCard';
import { BatchArt } from './batch.art';
import {
  BACK_TO_CATALOG,
  HERO_EYEBROW,
  HERO_LINE,
  NOT_FOUND_BUTTON,
  NOT_FOUND_TITLE,
  STILL_AVAILABLE,
  STOCK_CAPTION,
  STOCK_FOOT,
  STOCK_LABEL,
  TOTAL_ISSUED,
  batchCoord,
  batchNumber,
  stockNote,
} from './batch.copy';
import { Journey } from './batch.journey';
import { BatchRecord, BuyPanel, Provenance } from './batch.parts';
import { useBatch, type BatchDetail } from './carbon.api';
import { FAILED_TITLE, LOADING, TRY_AGAIN, UNIT } from './carbon.copy';
import { BackLink } from './carbon.parts';
import { inventoryShare } from './carbon.rules';

const CATALOG = '/carbon';
const ARROW_ICON = 16;
const GONE = new Set(['not_found', 'invalid_path']);

const isGone = (error: unknown): boolean => error instanceof ApiError && GONE.has(error.code);

/** The back link and "Batch #{param}"; the art and the coordinate only once there is a batch to draw. */
function Heading({ batchId, batch }: { batchId: string; batch?: BatchDetail }) {
  return (
    <>
      <BackLink to={CATALOG}>{BACK_TO_CATALOG}</BackLink>
      <PageHead
        className="cb-batch-heading"
        eyebrow={HERO_EYEBROW}
        title={HERO_LINE}
        em={batchNumber(batchId)}
        inline
        {...(batch === undefined
          ? {}
          : {
              art: <BatchArt batch={batch} />,
              coord: batchCoord(batch.batchId, batch.registry),
            })}
      />
    </>
  );
}

function NotFound({ batchId }: { batchId: string }) {
  return (
    <>
      <Heading batchId={batchId} />
      <EmptyState icon="carbon" title={NOT_FOUND_TITLE}>
        <Link className="button primary" to={CATALOG}>
          {NOT_FOUND_BUTTON}
          <Icon name="arrow" size={ARROW_ICON} />
        </Link>
      </EmptyState>
    </>
  );
}

function Detail({ batch }: { batch: BatchDetail }) {
  return (
    <div className="cb-detail">
      <section>
        <Provenance batch={batch} />
        <Journey batch={batch} />
        <BatchRecord batch={batch} />
      </section>
      <Rail>
        <StockCard
          label={STOCK_LABEL}
          icon="carbon"
          caption={STOCK_CAPTION}
          value={tonnes(batch.inventoryAmount)}
          unit={UNIT}
          sub={{ label: TOTAL_ISSUED, value: tonnes(batch.issuedAmount) }}
          share={inventoryShare(batch)}
          shareLabel={STILL_AVAILABLE}
          shareNote={stockNote(batch.batchId, batch.vintage)}
          note={STOCK_FOOT}
        />
        <BuyPanel batch={batch} />
      </Rail>
    </div>
  );
}

function Body({ batchId }: { batchId: string }) {
  const query = useBatch(batchId);

  if (isGone(query.error)) {
    return <NotFound batchId={batchId} />;
  }

  if (query.data !== undefined) {
    return (
      <>
        <Heading batchId={batchId} batch={query.data} />
        <Detail batch={query.data} />
      </>
    );
  }

  // offline with nothing cached the request waits for a network that is not there: that is a failure (state 4b)
  const failed = query.isError || (query.isPending && query.fetchStatus === 'paused');

  return (
    <>
      <Heading batchId={batchId} />
      {failed ? (
        <EmptyState tone="error" title={FAILED_TITLE}>
          <Button icon="retry" onClick={() => void query.refetch()}>
            {TRY_AGAIN}
          </Button>
        </EmptyState>
      ) : (
        <Skeleton shape="page" label={LOADING} />
      )}
    </>
  );
}

export function Component() {
  const { batchId = '' } = useParams();

  return (
    <AppState>
      <main className="cb-page" id="main-content" tabIndex={-1}>
        <Body batchId={batchId} />
      </main>
    </AppState>
  );
}
