// S19 Record evidence (s19-record.md): camera and GPS on the planter's phone, five to ten seconds, sealed on stop, then
// review: "Upload now", "Save offline" or "Retake". The server decides eligibility before the camera opens (capture-target)
// and again at upload and submit; the browser never runs the prechecks. No optimistic UI: S21 shows what the server says.
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { useSearchParams } from 'react-router';
import { useSession } from '../../app/session/session';
import { ErrorView } from '../../app/states/states';
import { LOADING } from '../../app/states/states.copy';
import { useOnline } from '../../app/states/use-online';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/art/Icon';
import { Banner } from '../../shared/ui/Banner';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useCapture } from '../evidence/use-capture';
import { useActiveDevices } from './device.api';
import { TRY_AGAIN, WALLET_WAIT } from './planter.copy';
import { useCaptureTarget, type CaptureTarget } from './record.api';
import { CaptureTrack, RuleDiagram } from './record.art';
import * as copy from './record.copy';
import {
  Blocked,
  LivePanel,
  RecordHead,
  RecordingPanel,
  ReviewPanel,
  Stage,
  captureAlert,
} from './record.parts';
import { UNAVAILABLE, blockedOf, parseTarget, sealTargetOf, stepOf } from './record.rules';
import { useSend } from './use-send';

const CHECK_IN_RADIUS_M = 15;
const NOTE_ICON = 16;

type Capturing = ReturnType<typeof useCapture>;

type PanelProps = {
  target: CaptureTarget;
  capture: Capturing;
  send: ReturnType<typeof useSend>;
  radiusM: number;
};

/** The phase's own panel: the idle lead, the live facts, the recording lead, the sealing line or the review. */
function PhaseBody({ target, capture, send, radiusM }: PanelProps) {
  const online = useOnline();
  const { phase, clip } = capture;
  const planting = target.kind === 'PLANTED';

  switch (phase) {
    case 'idle':
      return (
        <p className="pl-lead">
          {copy.idleLead(planting, radiusM)}
          <strong>{target.tag}</strong> in frame
          {target.challenge !== null && (
            <>
              , with challenge <strong>{target.challenge.code}</strong> beside it
            </>
          )}
          .
        </p>
      );
    case 'live':
      return (
        <LivePanel fix={capture.fix} supported={capture.hints.supported} onStart={capture.start} />
      );
    case 'recording':
      return <RecordingPanel kind={target.kind} elapsed={capture.elapsed} onStop={capture.stop} />;
    case 'sealing':
      return <p className="ev-lead">{copy.SEALING}</p>;
    case 'review':
      return clip === null ? null : (
        <ReviewPanel
          clip={clip}
          tag={target.tag}
          sending={send.running}
          online={online}
          tooLarge={capture.alert === 'TOO_LARGE'}
          failure={send.failure}
          onUpload={() => void send.upload()}
          onSave={() => void send.saveOffline()}
          onRetake={() => {
            send.reset();
            capture.retake();
          }}
        />
      );
    default:
      return null;
  }
}

function SidePanel(props: PanelProps) {
  const { target, capture, send, radiusM } = props;
  const { phase } = capture;

  return (
    <aside className="ev-side cb-buy pl-panel" aria-busy={send.running || undefined}>
      <div className="cb-buy-heading">
        <h2>{copy.CAPTURE_PANEL}</h2>
        <Icon name="check" size={NOTE_ICON} />
      </div>
      <CaptureTrack step={stepOf(phase)} />
      {phase !== 'review' && phase !== 'sealing' && (
        <RuleDiagram kind={target.kind} fix={capture.fix} radiusM={radiusM} />
      )}
      {capture.alert !== null && (
        <p role="alert" className="si-error">
          <Icon name="warning" size={NOTE_ICON} />
          <span>{captureAlert(capture.alert)}</span>
        </p>
      )}
      <PhaseBody {...props} />
      <div className="cb-buy-note">
        <Icon name="check" size={NOTE_ICON} />
        <span>{copy.CAPTURE_NOTE}</span>
      </div>
    </aside>
  );
}

function Capture({ profileId, target }: { profileId: string; target: CaptureTarget }) {
  const devices = useActiveDevices();
  const capture = useCapture({
    profileId,
    target: sealTargetOf(target),
    registered: devices.data?.map(({ thumbprint }) => thumbprint),
  });
  const send = useSend(profileId, target, capture.clip);
  const radiusM =
    target.kind === 'PLANTED'
      ? (target.campaign.regionRadiusM ?? 0)
      : (target.reference?.radiusM ?? CHECK_IN_RADIUS_M);

  return (
    <>
      <RecordHead target={target} id={target.treeId ?? target.slotId ?? ''} />
      <div className="ev-layout">
        <Stage
          phase={capture.phase}
          kind={target.kind}
          video={capture.video}
          clip={capture.clip}
          fix={capture.fix}
          elapsed={capture.elapsed}
          radiusM={radiusM}
          tag={target.tag}
          challenge={target.challenge}
          seen={capture.hints.seen}
          onOpen={() => void capture.open()}
        />
        <SidePanel target={target} capture={capture} send={send} radiusM={radiusM} />
      </div>
    </>
  );
}

/** What a failed capture-target read shows (§3, §5). */
function TargetFailure({ error, retry }: { error: unknown; retry: () => void }) {
  const code = error instanceof ApiError ? error.code : '';

  if (code === 'wallet_missing') {
    return (
      <Banner tone="callout" action={TRY_AGAIN} onAction={retry}>
        {WALLET_WAIT}
      </Banner>
    );
  }

  if (code === 'not_found' || code === 'validation_error') {
    return <Blocked view={UNAVAILABLE} />;
  }

  return <ErrorView error={error} onRetry={retry} />;
}

function Record({ profileId }: { profileId: string }) {
  const [search] = useSearchParams();
  const params = parseTarget(search);
  const query = useCaptureTarget(params);

  if (params === null) {
    return <Blocked view={UNAVAILABLE} />;
  }

  if (query.isError) {
    return <TargetFailure error={query.error} retry={() => void query.refetch()} />;
  }

  if (query.data === undefined) {
    return <Skeleton shape="page" label={LOADING} />;
  }

  return query.data.allowed ? (
    <Capture profileId={profileId} target={query.data} />
  ) : (
    <Blocked view={blockedOf(query.data)} />
  );
}

export function Component() {
  const session = useSession();

  return session.phase === 'ready' ? <Record profileId={session.profile.id} /> : null;
}
