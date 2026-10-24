// S09 Retirement certificate (s09-certificate.md): the public record of one on-chain retirement. Read-only: the endpoint
// takes no token and the page has no control that changes anything (FR-237). It fetches the record and hands it to the
// parts.
import { useRef } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useParams } from 'react-router';
import { OFFLINE, REFRESH } from '../../app/states/states.copy';
import { useOnline } from '../../app/states/use-online';
import { ErrorState } from '../../app/states/states';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/art/Icon';
import { Banner } from '../../shared/ui/Banner';
import { tonnes } from '../../shared/format/carbon';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Lorem } from '../../shared/ui/Lorem';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import { StockCard } from '../../shared/ui/StockCard';
import { UNIT } from './carbon.copy';
import { BackLink } from './carbon.parts';
import { RetireArt } from './certificate.art';
import { useRetirement, type Retirement } from './certificate.api';
import {
  BACK_TO_CARBON,
  BATCH_ISSUED,
  CLAIMED,
  HERO_EM,
  HERO_EYEBROW,
  HERO_LINE,
  NOT_FOUND_BUTTON,
  NOT_FOUND_TITLE,
  STOCK_LABEL,
  STOCK_NOTE,
  forBeneficiary,
  recordCoord,
  shareOfBatch,
} from './certificate.copy';
import { useCertificateMotion } from './certificate.motion';
import { RecordStatusPanel } from './certificate.panel';
import {
  CertificateCard,
  ProvenanceRecord,
  RetirementJourney,
  WhereItGrew,
} from './certificate.parts';
import { shareOf } from './certificate.rules';

const MY_CARBON = '/app/carbon';
const ARROW_ICON = 16;
const GONE = new Set(['not_found', 'invalid_path']);

const isGone = (error: unknown): boolean => error instanceof ApiError && GONE.has(error.code);

/** The back link and the heading; the art and the coordinate only once there is a record to draw. */
function Heading({ retirement }: { retirement?: Retirement }) {
  return (
    <>
      <BackLink to={MY_CARBON}>{BACK_TO_CARBON}</BackLink>
      <PageHead
        className="cb-batch-heading"
        eyebrow={HERO_EYEBROW}
        title={HERO_LINE}
        em={HERO_EM}
        {...(retirement === undefined
          ? {}
          : {
              art: <RetireArt record={retirement} />,
              coord: recordCoord(retirement.retirementId),
            })}
      />
    </>
  );
}

function NotFound() {
  return (
    <>
      <Heading />
      <EmptyState icon="leaf" title={NOT_FOUND_TITLE}>
        <Link className="button primary" to={MY_CARBON}>
          {NOT_FOUND_BUTTON}
          <Icon name="arrow" size={ARROW_ICON} />
        </Link>
      </EmptyState>
    </>
  );
}

function Certificate({ retirement }: { retirement: Retirement }) {
  const root = useRef<HTMLDivElement>(null);
  const { batch, campaign } = retirement;

  useCertificateMotion(root, retirement.amount);

  return (
    <div className="cb-detail rc-detail" ref={root}>
      <section>
        <CertificateCard retirement={retirement} />
        <RetirementJourney retirement={retirement} />
        <ProvenanceRecord retirement={retirement} />
        <WhereItGrew campaign={campaign} />
      </section>
      <Rail>
        <StockCard
          label={STOCK_LABEL}
          icon="leaf"
          caption={forBeneficiary(retirement.beneficiary)}
          value={tonnes(retirement.amount)}
          unit={UNIT}
          sub={{ label: BATCH_ISSUED, value: tonnes(batch.issuedAmount) }}
          share={shareOf(retirement)}
          shareLabel={shareOfBatch(batch.batchId)}
          shareNote={CLAIMED}
          note={STOCK_NOTE}
        />
        <RecordStatusPanel retirement={retirement} />
      </Rail>
    </div>
  );
}

function Body({ retirementId }: { retirementId: string }) {
  const query = useRetirement(retirementId);

  if (isGone(query.error)) {
    return <NotFound />;
  }

  if (query.data !== undefined) {
    return (
      <>
        <Heading retirement={query.data} />
        <Certificate retirement={query.data} />
      </>
    );
  }

  // offline with nothing cached the request waits for a network that is not there: that is a failure (state 4)
  const failed = query.isError || (query.isPending && query.fetchStatus === 'paused');

  return (
    <>
      <Heading />
      {failed ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <Skeleton shape="page" label={<Lorem id="COPY-352" kind="label" />} />
      )}
    </>
  );
}

/** Pattern 14 without the disabled fieldset: nothing here is a network action, so copy and print stay on offline. */
function OfflineBanner() {
  const online = useOnline();

  return online ? null : (
    <div className="app-state">
      <Banner icon="wifi" action={REFRESH} onAction={() => window.location.reload()}>
        {OFFLINE}
      </Banner>
    </div>
  );
}

export function Component() {
  const { retirementId = '' } = useParams();

  return (
    <>
      <OfflineBanner />
      <main className="mc-page" id="main-content" tabIndex={-1}>
        <Body retirementId={retirementId} />
      </main>
    </>
  );
}
