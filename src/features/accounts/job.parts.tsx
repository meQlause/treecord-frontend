// S12's pieces (s12-job.md §1): the lifecycle, the job record and "What it means". Each takes the one job and prints it;
// nothing here changes anything (FR-028: a failed job is recovered by repeating the action that made it).
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import type { Role } from '../../app/route-handle';
import { Icon } from '../../shared/art/Icon';
import { localDateTime } from '../../shared/format/datetime';
import { orDash } from '../../shared/ui/Facts';
import { Journey, type JourneyStep } from '../../shared/ui/Journey';
import type { Job } from './accounts.api';
import {
  HASH_PENDING,
  JOB_FACTS,
  JOB_RECORD,
  JOB_STEPS,
  LIFECYCLE,
  LIFECYCLE_LABEL,
  MEANING,
  MEANING_NOTE,
  NONE,
} from './accounts.copy';
import { jobLinks, kindLabel, lifecycle, statusMeaning } from './accounts.rules';

const HEADING_ICON = 22;
const LINK_ICON = 16;
const NOTE_ICON = 16;

/** The four steps of a job and how far it has got (FR-024). */
export function JobLifecycle({ status }: { status: Job['status'] }) {
  const { states, fill } = lifecycle(status);
  const steps: JourneyStep[] = JOB_STEPS.map(([, label, note], index) => ({
    icon: states[index] === 'done' ? 'check' : 'clock',
    label,
    note,
    state: states[index] ?? '',
  }));

  return <Journey title={LIFECYCLE} label={LIFECYCLE_LABEL} steps={steps} fill={fill} />;
}

type Row = { label: string; value: ReactNode; testId?: string };

/** The transaction hash: in full when there is one; "—" for a `score` job, which never has one; else "Pending". */
const hashOf = ({ kind, txHash }: Job): ReactNode => {
  if (txHash !== null) {
    return txHash;
  }

  return kind === 'score' ? orDash(null) : HASH_PENDING;
};

/** "Job record": the facts. "Last error" is there only when the server sent the key (operators, NFR-055). */
export function JobRecord({ job }: { job: Job }) {
  const rows: Row[] = [
    { label: JOB_FACTS.kind, value: kindLabel(job.kind) },
    { label: JOB_FACTS.id, value: job.id },
    { label: JOB_FACTS.attempts, value: job.attempts },
    {
      label: JOB_FACTS.when,
      value: (
        <>
          <span className="jb-when">{localDateTime(job.createdAt)} /</span>{' '}
          <span className="jb-when">{localDateTime(job.updatedAt)}</span>
        </>
      ),
    },
    { label: JOB_FACTS.hash, value: hashOf(job), testId: 'job-tx' },
    ...('lastError' in job ? [{ label: JOB_FACTS.lastError, value: job.lastError ?? NONE }] : []),
  ];

  return (
    <section className="cb-record">
      <h3>{JOB_RECORD}</h3>
      <div className="cb-cert">
        <dl>
          {rows.map(({ label, value, testId }) => (
            <div key={label}>
              <dt>{label}</dt>
              <i aria-hidden="true" />
              <dd {...(testId === undefined ? {} : { 'data-testid': testId })}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** "What it means": the status in words and the links to where the job came from, only those the viewer can open. */
export function JobMeaning({ job, role }: { job: Job; role: Role }) {
  const links = jobLinks(job.kind, job.context, role);

  return (
    <aside className="cb-buy pl-panel">
      <div className="cb-buy-heading">
        <h2>{MEANING}</h2>
        <Icon name="check" size={HEADING_ICON} />
      </div>
      <span className="eyebrow">{job.status.toUpperCase()}</span>
      <p className="pl-lead">{statusMeaning(job.kind, job.status)}</p>
      <div className="pl-actions">
        {links.map(({ label, to }) => (
          <Link key={label} className="button outline" to={to}>
            {label}
            <Icon name="arrow" size={LINK_ICON} />
          </Link>
        ))}
      </div>
      <div className="cb-buy-note">
        <Icon name="clock" size={NOTE_ICON} />
        <span>{MEANING_NOTE}</span>
      </div>
    </aside>
  );
}
