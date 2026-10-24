// S21 Evidence detail (s21-evidence.md): one submission as the server holds it — status and note, the local clip or the
// server's keyframes, every precheck with the value judged, the signed record, the AI scores and the pipeline. One page for
// every reader; what differs per reader is three actions and the raw `error` text for operators. The page renders the
// server's decision and never re-evaluates a score or a precheck; nothing on it writes. It lives in the workspace frame.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useParams } from 'react-router';
import { useSession } from '../../app/session/session';
import { ErrorView } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { KeyArt } from '../../shared/art/KeyArt';
import { Icon } from '../../shared/art/Icon';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import { StockCard } from '../../shared/ui/StockCard';
import { useEvidence, useLocalClip, type Evidence } from './evidence.api';
import * as copy from './evidence.copy';
import {
  AiScores,
  Media,
  PipelinePanel,
  PrecheckList,
  Say,
  SignedRecord,
  SubmissionFacts,
} from './evidence.parts';
import {
  coordOf,
  eyebrowOf,
  noteOf,
  recordAgainOf,
  recordAgainParams,
  titleWord,
  verdictOf,
} from './evidence.rules';
import { useCaptureTarget } from './record.api';

const ARROW_ICON = 16;
const VERDICT_ICON = 'check';

type Reader = 'planter' | 'operator' | 'other';

/** The note under the title, in a polite live region so a change found by polling is announced once (NFR-071). */
function Note({ evidence, operator }: { evidence: Evidence; operator: boolean }) {
  const rejected = evidence.status === 'rejected';

  return (
    <p className={`${rejected ? 'si-error' : 'pl-status'} wrap-any`} aria-live="polite">
      <Say words={noteOf(evidence)} />
      {operator && evidence.status === 'failed' && evidence.error !== undefined && (
        <>
          {' '}
          <code>{evidence.error}</code>
        </>
      )}
    </p>
  );
}

/** "Record again": only for the owner of a rejected submission whose target the server still allows. */
function RecordAgain({ evidence }: { evidence: Evidence }) {
  const again = useCaptureTarget(recordAgainParams(evidence));
  const link = recordAgainOf(evidence);

  return again.data?.allowed === true && link !== null ? (
    <Link className="button primary" to={link}>
      {copy.RECORD_AGAIN}
      <Icon name="arrow" size={ARROW_ICON} />
    </Link>
  ) : null;
}

function Actions({ evidence, reader }: { evidence: Evidence; reader: Reader }) {
  return (
    <>
      {evidence.treeId !== null && (
        <Link className="button outline" to={`/trees/${evidence.treeId}`}>
          {copy.VIEW_TREE}
          <Icon name="arrow" size={ARROW_ICON} />
        </Link>
      )}
      {reader === 'operator' && evidence.status === 'needs_review' && (
        <Link className="button primary" to={`/app/operator/submissions/${evidence.id}`}>
          {copy.REVIEW_SUBMISSION}
          <Icon name="arrow" size={ARROW_ICON} />
        </Link>
      )}
      {reader === 'planter' && evidence.status === 'rejected' && (
        <RecordAgain evidence={evidence} />
      )}
    </>
  );
}

function Detail({ id, reader }: { id: string; reader: Reader }) {
  const query = useEvidence(id);
  const clipUrl = useLocalClip(id, reader === 'planter');
  const evidence = query.data;

  if (evidence === undefined) {
    return query.isError ? (
      <ErrorView
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle={copy.NOT_FOUND_TITLE}
      />
    ) : (
      <Skeleton shape="page" label={LOADING} />
    );
  }

  const verdict = verdictOf(evidence);

  return (
    <>
      <PageHead
        className="pl-heading"
        eyebrow={eyebrowOf(evidence)}
        title={copy.EVIDENCE_TITLE}
        em={titleWord(evidence.status)}
        art={<KeyArt />}
        coord={coordOf(evidence.id)}
      >
        <Note evidence={evidence} operator={reader === 'operator'} />
      </PageHead>
      <div className="cb-detail pl-detail">
        <section>
          <Media evidence={evidence} clipUrl={clipUrl} onBroken={() => void query.refetch()} />
          <PrecheckList evidence={evidence} />
          <SignedRecord evidence={evidence} />
          <AiScores evidence={evidence} />
          {evidence.payload === null && <SubmissionFacts evidence={evidence} />}
        </section>
        <Rail>
          <StockCard
            label={copy.VERDICT}
            icon={VERDICT_ICON}
            caption={verdict.caption}
            value={verdict.value}
            unit={verdict.unit}
            sub={{ label: 'Video', value: `${evidence.durationSec} s`, unit: evidence.kind }}
            share={verdict.share}
            shareLabel={copy.PIPELINE_TITLE}
            shareNote={verdict.shareNote}
            note={copy.VERDICT_NOTE}
          />
          <PipelinePanel
            evidence={evidence}
            actions={<Actions evidence={evidence} reader={reader} />}
          />
        </Rail>
      </div>
    </>
  );
}

export function Component() {
  const session = useSession();
  const { id = '' } = useParams();

  if (session.phase !== 'ready') {
    return null;
  }

  const { role } = session.profile;

  return <Detail id={id} reader={role === 'planter' || role === 'operator' ? role : 'other'} />;
}
