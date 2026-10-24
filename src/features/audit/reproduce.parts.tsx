// S10's pieces (s10-reproduce.md §1): the recomputation steps, the inputs and results, the rail card and the tamper test.
// Everything shown as a result is the browser's own (FR-204): the server's `check` block is never read.
import type { ReactNode } from 'react';
import { Icon, type IconName } from '../../shared/art/Icon';
import { Banner } from '../../shared/ui/Banner';
import { Journey, type JourneyStep } from '../../shared/ui/Journey';
import { Lorem } from '../../shared/ui/Lorem';
import { StockCard } from '../../shared/ui/StockCard';
import { RailPanel } from './audit.common';
import type { Reproduction } from './audit.api';
import * as copy from './audit.copy';
import { shortHash } from './audit.rules';
import type { Recomputed } from './use-recompute';

const ICON = 16;

/** What the recomputation currently is: running, failed, or done with a sample. */
export type Run = { state: 'running' | 'failed' } | { state: 'done'; result: Recomputed };

const code = (text: string): ReactNode => (
  <code key={text} className="ev-code">
    {text}
  </code>
);

/** "Match" / "Mismatch" / "—" for a comparison that may not have run (`null`). */
const verdict = (match: boolean | null): string => {
  if (match === null) {
    return copy.DASH;
  }

  return match ? copy.MATCH : copy.MISMATCH;
};

type StepsProps = {
  data: Reproduction;
  run: Run;
  seed: string | null;
  sample: string | null;
};

export function Steps({ data, run, seed, sample }: StepsProps) {
  const running = run.state === 'running';
  const waiting = run.state !== 'done';
  const notes = [
    copy.blockStep(data.blockNumber),
    seed === null ? copy.DASH : shortHash(seed),
    copy.populationOf(data.population.length),
    sample ?? copy.DASH,
  ];
  const icons: IconName[] = ['carbon', 'retry', 'sliders', 'tree'];
  const steps = copy.STEP_LABELS.map((label, index): JourneyStep => {
    const state = index === 0 || !waiting ? 'done' : '';

    return {
      icon: icons[index] ?? 'carbon',
      label,
      note: notes[index] ?? '',
      state: running && index === 1 ? 'now' : state,
    };
  });

  return (
    <Journey
      title={copy.RECOMPUTATION}
      label={copy.RECOMPUTATION}
      steps={steps}
      fill={waiting ? 0 : 1}
    >
      <p className="pl-note">{data.algorithm}</p>
    </Journey>
  );
}

const notesCell = (notesHash: string | null): ReactNode =>
  notesHash === null ? (
    copy.DASH
  ) : (
    <>
      {copy.sealed}
      {code(shortHash(notesHash))}
    </>
  );

type ResultsProps = { data: Reproduction; shownHash: string; run: Run };

const rowsOf = (data: Reproduction, shownHash: string, run: Run): [string, ReactNode][] => {
  const result = run.state === 'done' ? run.result : null;
  const notesHash = data.report?.notesHash ?? null;

  return [
    [copy.R_SESSION, data.sessionId],
    [copy.R_BLOCK_HASH, code(shownHash)],
    [copy.R_SEED, result === null ? copy.DASH : code(result.seed)],
    [copy.R_POPULATION, data.population.join(', ')],
    [copy.R_STORED, data.sample.join(', ')],
    [copy.R_RECOMPUTED, result === null ? copy.DASH : result.sample.join(', ')],
    [copy.R_REPORT_HASH, data.reportHash === null ? copy.NOT_CLOSED_YET : code(data.reportHash)],
    [copy.R_PRIVATE_NOTES, notesCell(notesHash)],
  ];
};

export function Results({ data, shownHash, run }: ResultsProps) {
  const items = rowsOf(data, shownHash, run);

  return (
    <section className="cb-record" aria-busy={run.state === 'running' || undefined}>
      <h3>{copy.INPUTS_AND_RESULTS}</h3>
      <div className="cb-cert">
        <dl>
          {items.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <i aria-hidden="true" />
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

type RailProps = {
  sampleMatch: boolean | null;
  reportMatch: boolean | null;
  tamper: boolean;
  failed: boolean;
  onToggle: () => void;
};

const railIcon = (match: boolean | null): IconName => {
  if (match === null) {
    return 'clock';
  }

  return match ? 'check' : 'warning';
};

/** The rail: the reproduction card (announced politely when it changes) and the tamper test. */
export function ReproduceRail(props: RailProps) {
  return (
    <>
      <ReproductionCard {...props} />
      <TamperPanel {...props} />
    </>
  );
}

function ReproductionCard({ sampleMatch, reportMatch, tamper }: RailProps) {
  return (
    <div aria-live="polite">
      <StockCard
        label={copy.REPRODUCTION}
        icon={railIcon(sampleMatch)}
        caption={copy.SAMPLE_CHECK}
        value={verdict(sampleMatch)}
        unit=""
        sub={{ label: copy.REPORT_CHECK, value: verdict(reportMatch), unit: '' }}
        share={sampleMatch === true ? 1 : 0}
        shareLabel={tamper ? copy.TAMPERED_INPUT : copy.PUBLISHED_INPUTS}
        shareNote={tamper ? copy.ONE_BIT_FLIPPED : copy.EXACTLY_AS_STORED}
        note={copy.NOT_HEALTH}
      />
    </div>
  );
}

function TamperPanel({ sampleMatch, tamper, failed, onToggle }: RailProps) {
  return (
    <>
      <RailPanel title={copy.TAMPER_TEST} icon="warning" eyebrow={copy.TAMPER_EYEBROW}>
        {failed && (
          <Banner tone="error">
            <Lorem id={copy.RECOMPUTE_FAILED_COPY} />
          </Banner>
        )}
        {sampleMatch !== null && (
          <p className="pl-lead">{sampleMatch ? copy.SAMPLE_MATCHES : copy.SAMPLE_DIFFERS}</p>
        )}
        <div className="pl-actions">
          <button
            type="button"
            className={`button ${tamper ? 'primary' : 'outline'}`}
            aria-pressed={tamper}
            onClick={onToggle}
          >
            {tamper ? copy.RESTORE : copy.FLIP}
            <Icon name="retry" size={ICON} />
          </button>
        </div>
      </RailPanel>
    </>
  );
}
