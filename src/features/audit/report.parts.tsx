// S26's pieces (s26-audit-report.md §1): the findings with their ring, the challenges, the seed inputs, and the rail with the
// report hash. All of it is the stored report as the server froze it; nothing is rebuilt in the browser (FR-201).
import { useEffect, useRef, useState, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { useToast } from '../../app/shell/toast-context';
import { Icon } from '../../shared/art/Icon';
import { localDate, localDateTime } from '../../shared/format/datetime';
import { StockCard } from '../../shared/ui/StockCard';
import { RailPanel } from './audit.common';
import { FindingRing } from './audit.art';
import type { Report } from './audit.api';
import * as copy from './audit.copy';
import { shortHash } from './audit.rules';

const COPIED_MS = 1600;
const ICON = 16;
const LINK_ICON = 14;

type Closed = Report & { report: NonNullable<Report['report']>; reportHash: string };

const rows = (items: readonly (readonly [string, ReactNode])[]): ReactNode => (
  <dl>
    {items.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <i aria-hidden="true" />
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

export function FindingsSection({ data }: { data: Closed }) {
  const { report, notes } = data;
  const { totals } = report;

  return (
    <section className="cb-record">
      <h3>{copy.FINDINGS_HEADING}</h3>
      <div className="cb-cert au-findings">
        <FindingRing
          ok={totals.ok}
          issue={totals.issue}
          followup={totals.needsFollowup}
          size={report.sampleSize}
        />
        <dl>
          {report.findings.map(({ position, treeId, finding }) => (
            <div key={treeId}>
              <dt>
                <Link to={`/app/audit/${report.sessionId}/trees/${treeId}`}>
                  {copy.treeNumber(treeId)}
                </Link>
              </dt>
              <i aria-hidden="true" />
              <dd>
                <span className={`badge ${copy.FINDING_TONE[finding] ?? 'funding'}`}>
                  <span />
                  {copy.FINDING_LABEL[finding] ?? copy.DASH}
                </span>{' '}
                {notes?.findings.find((note) => note.position === position)?.notes ?? ''}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function ChallengesSection({ data }: { data: Closed }) {
  const { challenges } = data.report;

  return (
    <section className="cb-record">
      <h3>{copy.CHALLENGES_HEADING}</h3>
      <div className="cb-cert">
        {challenges.length === 0 ? (
          <p className="pl-lead">{copy.NO_CHALLENGES}</p>
        ) : (
          <dl>
            {challenges.map((challenge) => (
              <div key={`${challenge.treeId}-${challenge.code}`}>
                <dt>
                  {copy.treeNumber(challenge.treeId)} · <code>{challenge.code}</code>
                </dt>
                <i aria-hidden="true" />
                <dd>
                  {challenge.fulfilledSubmissionId === null
                    ? copy.expiresOn(localDate(challenge.expiresAt))
                    : copy.answered(challenge.fulfilledSubmissionId)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export function SeedInputs({ data }: { data: Closed }) {
  const { report } = data;

  return (
    <section className="cb-record">
      <h3>{copy.SEED_INPUTS}</h3>
      <div className="cb-cert">
        {rows([
          [copy.R_SESSION, report.sessionId],
          [copy.R_BLOCK, `#${Number(report.seed.blockNumber).toLocaleString('en-US')}`],
          [
            copy.R_BLOCK_HASH,
            <code key="hash" className="ev-code">
              {shortHash(report.seed.blockHash)}
            </code>,
          ],
          [copy.R_POPULATION, copy.populationOf(report.population.length)],
          [copy.R_SAMPLE, report.findings.map(({ treeId }) => treeId).join(', ')],
          [copy.R_CLOSED, localDateTime(report.closedAt)],
        ])}
      </div>
    </section>
  );
}

/** "Copied" for 1.6 s; the timer is cleared when the panel goes. */
function useCopied() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    copied,
    flash: (): void => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    },
  };
}

export function ReportRail({ data }: { data: Closed }) {
  const { report, reportHash } = data;
  const { notify } = useToast();
  const { copied, flash } = useCopied();
  const { totals } = report;

  // a refused or missing clipboard is advisory: the hash stays selectable text, so an error toast and an unchanged label
  const copyHash = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(reportHash);
      flash();
    } catch {
      notify(copy.COPY_REFUSED_TEXT, true);
    }
  };

  return (
    <>
      <StockCard
        label={copy.RAIL_REPORT}
        icon="check"
        caption={copy.PUBLISHED_HASH}
        value={copy.SEALED}
        unit=""
        sub={{
          label: copy.R_SAMPLE,
          value: copy.sampleOf(report.sampleSize, report.population.length),
          unit: copy.RAIL_TREES,
        }}
        share={totals.ok / Math.max(1, report.sampleSize)}
        shareLabel={copy.FOUND_OK}
        shareNote={copy.totalsLine(totals.ok, totals.issue, totals.needsFollowup)}
        note={copy.EDIT_CHANGES_HASH}
      />
      <RailPanel
        title={copy.REPORT_HASH}
        icon="copy"
        eyebrow={copy.HASH_EYEBROW}
        note={copy.NOT_A_CERTIFICATE}
      >
        <code className="ev-code au-hash">{reportHash}</code>
        <p className="pl-lead">{copy.PUBLIC_PRIVATE}</p>
        <div className="pl-actions">
          <button type="button" className="button primary" onClick={() => void copyHash()}>
            <span aria-live="polite">{copied ? copy.COPIED : copy.COPY_HASH}</span>
            <Icon name={copied ? 'check' : 'copy'} size={ICON} />
          </button>
          <Link className="button outline" to={`/audit/${data.sessionId}/reproduce`}>
            {copy.REPRODUCE}
            <Icon name="retry" size={ICON} />
          </Link>
        </div>
        <Link className="text-button pl-link" to={`/app/audit/${data.sessionId}`}>
          {copy.BACK_TO_SESSION}
          <Icon name="arrow" size={LINK_ICON} />
        </Link>
      </RailPanel>
    </>
  );
}

export type { Closed };
