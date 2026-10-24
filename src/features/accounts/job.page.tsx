// S12 Transaction / job (s12-job.md): one background job, followed until it is confirmed or has failed. Read-only. The
// server decides who may read it (the creator, or an operator) and answers 404 to anyone else, so there is no role gate.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useParams } from 'react-router';
import { useSession } from '../../app/session/session';
import { ErrorView, NotFoundState } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { KeyArt } from '../../shared/art/KeyArt';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import { StockCard } from '../../shared/ui/StockCard';
import { useJob, type Job } from './accounts.api';
import {
  JOB_EM_FAILED,
  JOB_EM_OK,
  JOB_EYEBROW,
  JOB_NOTE,
  JOB_NOT_FOUND,
  JOB_SHARE_LABEL,
  JOB_STOCK,
  JOB_TITLE,
  jobCoord,
} from './accounts.copy';
import { isJobId, kindLabel, lifecycle, railNote } from './accounts.rules';
import { JobLifecycle, JobMeaning, JobRecord } from './job.parts';

const statusWord = (status: string): string =>
  `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

function Detail({ job }: { job: Job }) {
  const session = useSession();
  const role = session.phase === 'ready' ? session.profile.role : 'donor';

  return (
    <>
      <PageHead
        eyebrow={JOB_EYEBROW(kindLabel(job.kind))}
        title={JOB_TITLE}
        em={job.status === 'failed' ? JOB_EM_FAILED : JOB_EM_OK}
        art={<KeyArt />}
        coord={jobCoord(job.id)}
      />
      <div className="cb-detail pl-detail">
        <section>
          <JobLifecycle status={job.status} />
          <JobRecord job={job} />
        </section>
        <Rail>
          <StockCard
            label={JOB_STOCK}
            icon="clock"
            caption={kindLabel(job.kind)}
            value={statusWord(job.status)}
            unit=""
            sub={{ label: 'Attempts', value: job.attempts, unit: '' }}
            share={lifecycle(job.status).fill}
            shareLabel={JOB_SHARE_LABEL}
            shareNote={railNote(job.status)}
            note={JOB_NOTE}
          />
          <JobMeaning job={job} role={role} />
        </Rail>
      </div>
    </>
  );
}

export function Component() {
  const { id = '' } = useParams();
  const valid = isJobId(id);
  const query = useJob(id, valid);

  if (!valid) {
    return <NotFoundState title={JOB_NOT_FOUND} />;
  }

  // a failed poll after the job was shown keeps the last read (JB-13): only a first read that fails is an error
  if (query.data !== undefined) {
    return <Detail job={query.data} />;
  }

  if (query.isError) {
    return (
      <ErrorView
        error={query.error}
        notFoundTitle={JOB_NOT_FOUND}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return <Skeleton shape="page" label={LOADING} />;
}
