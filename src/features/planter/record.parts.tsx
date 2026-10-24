// S19's pieces (s19-record.md §1): the header, the blocked state, the stage (live preview, scene, chips, progress) and the
// phase panels of the side column. Each takes plain props; the page owns the target, the capture machine and the send.
import type { ReactNode, RefObject } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Facts } from '../../shared/ui/Facts';
import { Lorem } from '../../shared/ui/Lorem';
import { localDateTime } from '../../shared/format/datetime';
import type { AlertKey } from '../evidence/capture-devices';
import { APP_MAX_SEC, APP_MIN_SEC, MAX_GPS_ACCURACY_M } from '../evidence/evidence.config';
import type { Fix } from '../evidence/evidence.rules';
import type { Clip, Phase } from '../evidence/use-capture';
import { REASON_TEXT } from './planter.copy';
import type { CaptureTarget, SendFailure } from './record.api';
import { CaptureScene, Finder } from './record.art';
import * as copy from './record.copy';
import { chipTone, gpsChip, gpsPair, isCoarse, sawTag, type BlockedView } from './record.rules';

const BACK_ICON = 16;
const PIN_ICON = 14;
const PERCENT = 100;

/** The alert a refused start or a failed seal raises. */
const ALERTS: Readonly<Record<AlertKey, ReactNode>> = {
  NO_KEY: copy.NO_SIGNING_KEY,
  UNREGISTERED: <Lorem id={copy.COPY_KEY_UNREGISTERED} />,
  DENIED: copy.CAMERA_DENIED,
  NO_CAMERA: copy.NO_CAMERA,
  NO_GPS: copy.NO_GPS,
  LOC_DENIED: copy.LOCATION_DENIED,
  GPS_UNAVAILABLE: copy.GPS_UNAVAILABLE,
  CANNOT_RECORD: <Lorem id={copy.COPY_CANNOT_RECORD} />,
  KEY_GONE: copy.KEY_GONE,
  TOO_LARGE: <Lorem id={copy.COPY_TOO_LARGE} />,
};

export const captureAlert = (key: AlertKey): ReactNode => ALERTS[key];

const reasonText = (reason: string): string => REASON_TEXT[reason] ?? reason;

/** What a failed send says in the review (§3, §5): the sentence and every reason of a refusal, or the registry copy. */
export function SendAlert({ failure }: { failure: SendFailure }) {
  if (failure.type === 'refused') {
    return (
      <Banner tone="error">
        {copy.PRECHECKS_REJECTED} {failure.reasons.map(reasonText).join(' · ')}
      </Banner>
    );
  }

  const body: Record<Exclude<SendFailure['type'], 'refused' | 'blocked'>, ReactNode> = {
    'upload-failed': <Lorem id={copy.COPY_UPLOAD_FAILED} />,
    'video-not-uploaded': <Lorem id={copy.COPY_VIDEO_NOT_UPLOADED} />,
    'payload-mismatch': <Lorem id={copy.COPY_PAYLOAD_MISMATCH} />,
    'target-gone': copy.BLOCKED_TITLE,
    invalid: <Lorem id={copy.COPY_VALIDATION} />,
  };

  return (
    <Banner tone="error">
      {failure.type === 'blocked' ? <Lorem id={copy.COPY_VALIDATION} /> : body[failure.type]}
    </Banner>
  );
}

type HeadProps = { target: CaptureTarget; id: string };

/** Back link, eyebrow, "Record evidence." and the subtitle. */
export function RecordHead({ target, id }: HeadProps) {
  const planting = target.kind === 'PLANTED';

  return (
    <header className="ev-head pl-ev-head">
      <Link className="back-link" to={planting ? '/app/planter/slots' : `/trees/${id}`}>
        <Icon name="back" size={BACK_ICON} />
        {planting ? copy.RECORD_BACK_SLOTS : `Tree #${id}`}
      </Link>
      <div className="eyebrow">
        <span className="tiny-line" />
        {copy.eyebrowOf(target.kind, target.month, id)}
      </div>
      <h1>
        Record <em>{copy.RECORD_LINE_EM}</em>
      </h1>
      <p>{copy.RECORD_SUBTITLE(target.campaign.title)}</p>
    </header>
  );
}

/** Not allowed, not found or a bad link: one Empty with its way out. */
export function Blocked({ view }: { view: BlockedView }) {
  return (
    <EmptyState variant="compact" title={view.title}>
      <p>{view.body}</p>
      <Link to={view.to}>{view.link}</Link>
    </EmptyState>
  );
}

type StageProps = {
  phase: Phase;
  kind: CaptureTarget['kind'];
  video: RefObject<HTMLVideoElement | null>;
  clip: Clip | null;
  fix: Fix | null;
  elapsed: number;
  radiusM: number;
  tag: string | null;
  challenge: CaptureTarget['challenge'];
  seen: ReadonlySet<string>;
  onOpen: () => void;
};

type Chip = { key: string; tone: string; text: ReactNode };

const idleChips = (kind: CaptureTarget['kind'], radiusM: number): Chip[] =>
  copy.CHIPS_IDLE(kind, radiusM).map((text) => ({ key: text, tone: 'wait', text }));

/** The tag and code chips: "Show …" until the live reader has seen the QR, then "✓ …". */
const codeChips = (props: Pick<StageProps, 'tag' | 'challenge' | 'seen'>): Chip[] => {
  const chips: Chip[] = [];
  const { tag, challenge, seen } = props;

  if (tag !== null) {
    chips.push({
      key: 'tag',
      tone: sawTag(seen, tag) ? 'ok' : 'code',
      text: `${sawTag(seen, tag) ? '✓ Tag' : 'Show tag'} ${tag}`,
    });
  }

  if (challenge !== null) {
    const found = seen.has(challenge.qr);

    chips.push({
      key: 'code',
      tone: found ? 'ok' : 'code',
      text: `${found ? '✓ Code' : 'Show code'} ${challenge.code}`,
    });
  }

  return chips;
};

function Hud({ chips, aria }: { chips: ReactNode; aria?: boolean }) {
  return (
    <div className="ev-hud" {...(aria === true ? { 'aria-hidden': true } : {})}>
      {chips}
    </div>
  );
}

function LiveHud(props: StageProps) {
  const { fix, phase, elapsed } = props;

  return (
    <Hud
      chips={
        <>
          <span className={`ev-chip ${chipTone(fix)}`}>
            <Icon name="pin" size={PIN_ICON} />
            {fix === null ? copy.WAITING_GPS : gpsChip(fix)}
          </span>
          {phase === 'recording' && (
            <span className="ev-chip rec">
              ● {elapsed.toFixed(1)} / {APP_MAX_SEC} s
            </span>
          )}
          {codeChips(props).map(({ key, tone, text }) => (
            <span key={key} className={`ev-chip ${tone}`}>
              {text}
            </span>
          ))}
        </>
      }
    />
  );
}

type PreviewProps = Pick<StageProps, 'phase' | 'kind' | 'video' | 'clip' | 'onOpen'>;

/** The live preview (hidden in review), the sealed clip, the scene before the camera and its prompt. */
function Preview({ phase, kind, video, clip, onOpen }: PreviewProps) {
  return (
    <>
      {/* eslint-disable jsx-a11y/media-has-caption -- the planter's own preview and clip: no audio is recorded (audio: false) */}
      <video
        ref={video}
        className="ev-video"
        playsInline
        muted
        autoPlay
        style={{ display: phase === 'review' ? 'none' : 'block' }}
      />
      {phase === 'review' && clip !== null && (
        <video className="ev-video" src={clip.url} controls playsInline />
      )}
      {/* eslint-enable jsx-a11y/media-has-caption */}
      {(phase === 'idle' || phase === 'starting') && <CaptureScene kind={kind} />}
      {phase === 'idle' && (
        <div className="ev-placeholder pl-over">
          <p>{copy.IDLE_PROMPT(kind)}</p>
          <Button onClick={onOpen} icon="arrow">
            {copy.OPEN_CAMERA}
          </Button>
        </div>
      )}
      {phase === 'starting' && (
        <div className="ev-placeholder pl-over">
          <p>{copy.STARTING}</p>
        </div>
      )}
    </>
  );
}

/** The stage: the preview, the chips of the rules before the camera or of the live fix after it, the progress bar. */
export function Stage(props: StageProps) {
  const { phase, kind, radiusM, elapsed } = props;
  const before = phase === 'idle' || phase === 'starting';
  const filming = phase === 'live' || phase === 'recording';

  return (
    <div className="ev-stage">
      <Preview {...props} />
      {before && (
        <Hud
          aria
          chips={idleChips(kind, radiusM).map(({ key, tone, text }) => (
            <span key={key} className={`ev-chip ${tone}`}>
              {text}
            </span>
          ))}
        />
      )}
      {filming && <Finder />}
      {filming && <LiveHud {...props} />}
      {phase === 'recording' && (
        <div className="ev-progress">
          <i style={{ width: `${(elapsed / APP_MAX_SEC) * PERCENT}%` }} />
          <b style={{ left: '50%' }} />
        </div>
      )}
    </div>
  );
}

/** "±8.4 m · OK", or what the coarse fix needs. */
const accuracyText = (fix: Fix | null): string => {
  if (fix === null) {
    return '—';
  }

  const verdict = isCoarse(fix) ? `needs ${MAX_GPS_ACCURACY_M} m or better` : 'OK';

  return `±${fix.acc.toFixed(1)} m · ${verdict}`;
};

type LiveProps = {
  fix: Fix | null;
  supported: boolean;
  onStart: () => void;
};

/** Live: the fix as facts, the coarse callout, the QR note and "Start recording" (disabled without a fix). */
export function LivePanel({ fix, supported, onStart }: LiveProps) {
  return (
    <>
      <Facts
        rows={[
          ['GPS', fix === null ? 'Waiting…' : gpsPair(fix)],
          ['Accuracy', accuracyText(fix)],
        ]}
      />
      {isCoarse(fix) && <p className="ws-callout">{copy.COARSE_CALLOUT}</p>}
      {!supported && <p className="ws-note">{copy.NO_QR_NOTE}</p>}
      <Button disabled={fix === null} onClick={onStart} icon="arrow">
        {copy.START_RECORDING}
      </Button>
    </>
  );
}

type RecordingProps = { kind: CaptureTarget['kind']; elapsed: number; onStop: () => void };

/** Recording: Stop counts down the 5 s minimum. */
export function RecordingPanel({ kind, elapsed, onStop }: RecordingProps) {
  const waiting = elapsed < APP_MIN_SEC;

  return (
    <>
      <p className="ev-lead">{copy.recordingLead(kind)}</p>
      <Button disabled={waiting} onClick={onStop}>
        {waiting ? copy.stopWait(APP_MIN_SEC - elapsed) : copy.STOP_RECORDING}
      </Button>
    </>
  );
}

type ReviewProps = {
  clip: Clip;
  tag: string | null;
  sending: boolean;
  online: boolean;
  tooLarge: boolean;
  failure: SendFailure | null;
  onUpload: () => void;
  onSave: () => void;
  onRetake: () => void;
};

const SIGNATURE_SHOWN = 32;

/** Review: what was sealed, the signed payload, the failure of the last send and the three actions. */
export function ReviewPanel(props: ReviewProps) {
  const { clip, tag, sending, online, tooLarge, failure } = props;
  const labels = copy.REVIEW_LABELS;

  return (
    <>
      <h2 className="ev-h2">{copy.SEALED}</h2>
      <Facts
        rows={[
          [labels.duration, `${clip.durationSec.toFixed(1)} s`],
          [
            labels.hash,
            <code key="hash" className="ev-code">
              {clip.payload.videoSha256}
            </code>,
          ],
          [labels.gps, `${gpsPair(clip.payload)} ±${clip.payload.acc} m`],
          [labels.captured, localDateTime(clip.capturedAt)],
          [labels.tag, tag],
          [
            labels.signature,
            <code
              key="signature"
              className="ev-code"
            >{`${clip.signature.slice(0, SIGNATURE_SHOWN)}…`}</code>,
          ],
        ]}
      />
      <details className="ev-payload">
        <summary>{copy.PAYLOAD_SUMMARY}</summary>
        <code className="ev-code">{clip.canonical}</code>
      </details>
      {failure !== null && <SendAlert failure={failure} />}
      <div className="ev-actions">
        <Button
          busy={sending}
          busyLabel={copy.BUSY_LABEL}
          icon="arrow"
          disabled={!online || tooLarge}
          onClick={props.onUpload}
        >
          {copy.UPLOAD_NOW}
        </Button>
        <Button variant="outline" disabled={sending || tooLarge} onClick={props.onSave}>
          {copy.SAVE_OFFLINE}
        </Button>
        <Button variant="text" disabled={sending} onClick={props.onRetake}>
          {copy.RETAKE}
        </Button>
      </div>
    </>
  );
}
