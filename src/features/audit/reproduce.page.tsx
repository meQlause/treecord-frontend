// S10 Reproduce audit (s10-reproduce.md): anyone recomputes the seed and sample of a session from its published inputs,
// re-hashes the public report of a closed session, and flips one bit of the block hash to watch the sample change. Every
// check runs in the viewer's browser (in a worker, NFR-064) and nothing is stored; a token is never sent.
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useParams } from 'react-router';
import { LOADING } from '../../app/states/states.copy';
import { PageHead } from '../../shared/ui/PageHead';
import { Rail } from '../../shared/ui/Rail';
import { Skeleton } from '../../shared/ui/Skeleton';
import { SampleArt } from './audit.art';
import { useReproduction, type Reproduction } from './audit.api';
import { AuditError, SessionNotFound } from './audit.common';
import * as copy from './audit.copy';
import { flip, isUuid, shortId } from './audit.rules';
import { Results, ReproduceRail, Steps, type Run } from './reproduce.parts';
import { useRecompute } from './use-recompute';

type Query = ReturnType<typeof useRecompute>;

const runOf = (query: Query): Run => {
  if (query.data !== undefined) {
    return { state: 'done', result: query.data };
  }

  return { state: query.isError ? 'failed' : 'running' };
};

/** The sample matches when the recomputed ids equal the stored ones in position order; `null` while there is none. */
const sampleMatches = (data: Reproduction, run: Run): boolean | null =>
  run.state === 'done' ? run.result.sample.join() === data.sample.join() : null;

/** What the run recomputed, or the stored sample while there is no result yet. */
const figuresOf = (data: Reproduction, run: Run) => {
  const done = run.state === 'done' ? run.result : null;

  return {
    samples: done?.sample ?? data.sample,
    seed: done?.seed ?? null,
    joined: done?.sample.join(', ') ?? null,
  };
};

/** The report is re-hashed only for the real block hash; a closed session answers "Match" or "Mismatch", an open one "—". */
const reportMatchOf = (data: Reproduction, run: Run): boolean | null =>
  run.state === 'done' && data.report !== null && run.result.reportHash !== null
    ? run.result.reportHash === data.reportHash
    : null;

function Reproduce({ data }: { data: Reproduction }) {
  const [tamper, setTamper] = useState(false);
  const shownHash = tamper ? flip(data.blockHash) : data.blockHash;
  const real = useRecompute(data, data.blockHash, true);
  const flipped = useRecompute(data, shownHash, tamper);
  const run = runOf(tamper ? flipped : real);
  const figures = figuresOf(data, run);
  const reportMatch = reportMatchOf(data, runOf(real));

  return (
    <>
      <PageHead
        eyebrow={copy.reproduceEyebrow(data.campaign.title)}
        title={copy.REPRODUCE_TITLE}
        em={copy.REPRODUCE_EM}
        art={
          <SampleArt population={data.population} samples={figures.samples} blockHash={shownHash} />
        }
        coord={copy.reproduceCoord(shortId(data.sessionId))}
      />
      <div className="cb-detail pl-detail">
        <section>
          <Steps data={data} run={run} seed={figures.seed} sample={figures.joined} />
          <Results data={data} shownHash={shownHash} run={run} />
        </section>
        <Rail>
          <ReproduceRail
            sampleMatch={sampleMatches(data, run)}
            reportMatch={reportMatch}
            tamper={tamper}
            failed={run.state === 'failed'}
            onToggle={() => setTamper((now) => !now)}
          />
        </Rail>
      </div>
    </>
  );
}

export function Component() {
  const { sessionId = '' } = useParams();
  const query = useReproduction(sessionId);

  if (!isUuid(sessionId)) {
    return <SessionNotFound />;
  }

  if (query.data !== undefined) {
    return <Reproduce data={query.data} />;
  }

  return query.isError ? (
    <AuditError error={query.error} onRetry={() => void query.refetch()} />
  ) : (
    <Skeleton shape="page" label={LOADING} />
  );
}
