// S21's pieces (s21-evidence.md §1): the media, the precheck list, the signed record, the AI scores and the submission facts,
// then the rail's pipeline. Each takes the submission as the server sent it; nothing is re-judged here (FR-116).
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { localDateTime } from '../../shared/format/datetime';
import { Lorem } from '../../shared/ui/Lorem';
import type { Evidence } from './evidence.api';
import { KeyframeStrip } from './evidence.art';
import * as copy from './evidence.copy';
import {
  aiNoteOf,
  bandNote,
  bandOf,
  checkLabel,
  detailOf,
  gaugesOf,
  markOf,
  policyBand,
  policyWord,
  stepStates,
  targetOf,
  type Gauge,
} from './evidence.rules';

const VIDEO_ICON = 26;
const ARROW_ICON = 16;
const LINK_ICON = 14;
const GAUGE_RADIUS = 36;
const GAUGE_ARC = Math.PI * GAUGE_RADIUS;
const GAUGE_CENTER = 50;
const GAUGE_COLOUR = { ok: '#6f9a58', near: '#c49a3e', bad: '#c26a4a' } as const;
const TICK_INNER = 31;
const TICK_OUTER = 40;
const OSM = 'https://www.openstreetmap.org';

/** Text, or the lorem placeholder of a COPY id that has no approved text yet. */
export function Say({ words }: { words: copy.Words }) {
  return typeof words === 'string' ? words : <Lorem id={words.copyId} />;
}

type MediaProps = {
  evidence: Evidence;
  clipUrl: string | null;
  onBroken: () => void;
};

/** The owner's clip while this phone holds it, else the server's keyframes, else a placeholder (FR-114). */
export function Media({ evidence, clipUrl, onBroken }: MediaProps) {
  const urls = evidence.keyframes?.urls ?? [];

  if (clipUrl !== null) {
    return (
      <section className="pl-recording">
        <video className="ev-thumb" src={clipUrl} controls playsInline muted />
      </section>
    );
  }

  return (
    <section className="pl-recording">
      {urls.length > 0 ? (
        <KeyframeStrip
          urls={urls}
          durationSec={evidence.durationSec}
          kind={evidence.kind}
          onBroken={onBroken}
        />
      ) : (
        <div className="ev-thumb ev-thumb-empty">
          <Icon name="tree" size={VIDEO_ICON} />
          <span>{copy.NO_VIDEO}</span>
        </div>
      )}
    </section>
  );
}

/** Every precheck the server judged, in its order, with the value it saw; "Checking…" while nothing is judged yet. */
export function PrecheckList({ evidence }: { evidence: Evidence }) {
  const rows = evidence.precheckResults;

  return (
    <section className="cb-record">
      <h3>{copy.PRECHECKS_TITLE}</h3>
      <div className="cb-cert">
        {evidence.status === 'queued' || rows.length === 0 ? (
          <p>{copy.CHECKING}</p>
        ) : (
          <ul className="ev-checks">
            {rows.map((row) => (
              <li key={row.check} className={row.ok === false ? 'bad' : 'ok'}>
                <span>{markOf(row.ok)}</span>
                <div>
                  <strong>
                    <Say words={checkLabel(row, evidence)} />
                  </strong>
                  <small>{detailOf(row)}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <i aria-hidden="true" />
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const COORD_DECIMALS = 6;

/** The signed record: exact GPS with its map link, accuracy, time, key, hash and the signed bytes (every reader may, NFR-006). */
export function SignedRecord({ evidence }: { evidence: Evidence }) {
  const { payload } = evidence;

  if (payload === null) {
    return null;
  }

  const map = `${OSM}/?mlat=${payload.lat}&mlon=${payload.lon}#map=18/${payload.lat}/${payload.lon}`;

  return (
    <section className="cb-record">
      <h3>{copy.SIGNED_RECORD}</h3>
      <div className="cb-cert">
        <Rows
          rows={[
            [
              'GPS',
              <a key="gps" href={map} target="_blank" rel="noreferrer">
                {payload.lat.toFixed(COORD_DECIMALS)}, {payload.lon.toFixed(COORD_DECIMALS)} ↗
              </a>,
            ],
            ['Accuracy', `±${payload.acc} m`],
            ['Captured', localDateTime(payload.capturedAt)],
            [
              'Device key',
              <code key="key" className="ev-code">
                {payload.deviceKey}
              </code>,
            ],
            [
              'Video SHA-256',
              <code key="sha" className="ev-code">
                {evidence.videoSha256 ?? payload.videoSha256}
              </code>,
            ],
          ]}
        />
        <details className="ev-payload">
          <summary>{copy.PAYLOAD_SUMMARY}</summary>
          <code className="ev-code">{evidence.canonical}</code>
          <code className="ev-code">{evidence.signature}</code>
        </details>
      </div>
    </section>
  );
}

/** The pass line as a short tick across the arc, at the angle of the limit. */
const tickPath = (angle: number): string => {
  const point = (radius: number): string =>
    `${GAUGE_CENTER + radius * Math.cos(angle)} ${GAUGE_CENTER - radius * Math.sin(angle)}`;

  return `M${point(TICK_INNER)}L${point(TICK_OUTER)}`;
};

function ScoreGauge({ gauge }: { gauge: Gauge }) {
  const band = bandOf(gauge);
  const colour = GAUGE_COLOUR[band];
  const tick = tickPath(Math.PI * (1 - gauge.limits.review));

  return (
    <div className={`pl-score ${band}`}>
      <svg viewBox="0 0 100 62" aria-hidden="true">
        <path
          d="M14 50a36 36 0 0 1 72 0"
          fill="none"
          stroke="#e3ebd7"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          className="pl-gauge"
          d="M14 50a36 36 0 0 1 72 0"
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${GAUGE_ARC * (gauge.value ?? 0)} ${GAUGE_ARC}`}
        />
        <path d={tick} stroke="#26422f" strokeWidth="2" strokeLinecap="round" />
        <text
          x="50"
          y="47"
          textAnchor="middle"
          fontSize="15"
          fill="#26422f"
          fontFamily="Georgia, serif"
        >
          {gauge.value === null ? '—' : gauge.value.toFixed(2)}
        </text>
      </svg>
      <strong>{gauge.label}</strong>
      <span>
        {copy.gaugeLimit(gauge.up, gauge.limits.review)}
        {bandNote(band, gauge.value)}
      </span>
    </div>
  );
}

/** Not scored yet, or the policy's box, the gauges and the note (FR-116). */
export function AiScores({ evidence }: { evidence: Evidence }) {
  if (evidence.ai === null) {
    const waiting = evidence.status === 'checking';
    const later =
      evidence.status === 'rejected' ? copy.TURNED_BACK_BEFORE_MODEL : copy.SCORING_LATER;

    return (
      <section className="cb-record">
        <h3>{copy.AI_TITLE}</h3>
        <div className="ws-empty">
          {waiting ? (
            <>
              <h2 className="pl-scoring">
                {copy.SCORING}
                <i />
                <i />
                <i />
              </h2>
              <p>{copy.SCORING_BODY}</p>
            </>
          ) : (
            <>
              <h2>{copy.NOT_SCORED}</h2>
              <p>{later}</p>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="cb-record">
      <h3>{copy.AI_TITLE}</h3>
      <div className="pl-scores">
        <div className={`pl-score pl-policy ${policyBand(evidence.policyDecision)}`}>
          <strong className="pl-policy-n">
            {(evidence.policyScore ?? 0).toLocaleString('en-US')}
          </strong>
          <strong>{copy.POLICY_SCORE}</strong>
          <span>
            {policyWord(evidence.policyDecision)} · {copy.POLICY_OUT_OF}
          </span>
        </div>
        {gaugesOf(evidence).map((gauge) => (
          <ScoreGauge key={gauge.label} gauge={gauge} />
        ))}
      </div>
      <p className="pl-note">
        {aiNoteOf(evidence)} <span className="pl-model">{evidence.ai.modelVersion}</span>
      </p>
    </section>
  );
}

/** The few facts of a recording that was announced and never submitted (no signed payload yet). */
export function SubmissionFacts({ evidence }: { evidence: Evidence }) {
  const milestone =
    evidence.kind === 'ALIVE'
      ? `Month ${evidence.month ?? '—'}`
      : copy.MILESTONE_LABEL[evidence.kind];

  return (
    <section className="cb-record">
      <h3>{copy.SUBMISSION_TITLE}</h3>
      <div className="cb-cert">
        <Rows
          rows={[
            ['Target', targetOf(evidence)],
            ['Kind', evidence.kind],
            ['Milestone', milestone],
            ['Captured', localDateTime(evidence.capturedAt)],
            ['Duration', `${evidence.durationSec} seconds`],
            ['Review note', evidence.review?.note ?? copy.NO_NOTE],
          ]}
        />
      </div>
    </section>
  );
}

type PipelineProps = {
  evidence: Evidence;
  actions: ReactNode;
};

/** The five steps from this phone to the chain, the reader's actions and the way back to the list. */
export function PipelinePanel({ evidence, actions }: PipelineProps) {
  return (
    <aside className="cb-buy pl-panel">
      <div className="cb-buy-heading">
        <h2>{copy.PIPELINE_TITLE}</h2>
        <Icon name="clock" size={22} />
      </div>
      <span className="eyebrow">{copy.PIPELINE_EYEBROW}</span>
      <ol className="pl-stage">
        {stepStates(evidence).map((state, index) => (
          <li key={copy.PIPELINE_STEPS[index]} className={state}>
            <i>{{ done: '✓', bad: '✕', now: index + 1, '': index + 1 }[state]}</i>
            {copy.PIPELINE_STEPS[index]}
          </li>
        ))}
      </ol>
      <div className="pl-actions">{actions}</div>
      <Link className="text-button pl-link" to="/app/planter/uploads">
        {copy.ALL_UPLOADS}
        <Icon name="arrow" size={LINK_ICON} />
      </Link>
      <div className="cb-buy-note">
        <Icon name="check" size={ARROW_ICON} />
        <span>{copy.PIPELINE_NOTE}</span>
      </div>
    </aside>
  );
}
