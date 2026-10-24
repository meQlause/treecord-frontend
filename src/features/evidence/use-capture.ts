// The capture machine of S19 (s19-record.md §1, §3): idle → starting → live → recording → sealing → review. Camera, GPS,
// recorder and timer sit in refs and all stop on seal, retake and unmount. The fix and the instant are locked when
// recording starts (FR-100); the seal runs with no network (§2.6). The elapsed time is read from `performance.now`, so a
// frozen wall clock cannot stall the timer.
import { useCallback, useEffect, useRef, useState } from 'react';
import { recorderType, useDevices, useQrHints, type AlertKey } from './capture-devices';
import { readKeyRecord } from './device-key';
import { APP_MAX_SEC, MAX_UPLOAD_BYTES, TICK_MS, TIMESLICE_MS } from './evidence.config';
import { baseContentType, seal, type Fix, type SealTarget, type Sealed } from './evidence.rules';

export type Phase = 'idle' | 'starting' | 'live' | 'recording' | 'sealing' | 'review';

/** A sealed recording held in memory until it is queued or dropped. */
export type Clip = Sealed & {
  blob: Blob;
  url: string;
  durationSec: number;
  sizeBytes: number;
  contentType: string;
  capturedAt: string;
};

type Locked = { fix: Fix; capturedAt: string };

type Stopped = { blob: Blob; durationSec: number; locked: Locked };

const MS_PER_SEC = 1000;
const TENTH = 10;

/** The recorder and its 100 ms timer: starts on a locked fix, stops by itself at the limit, hands over the bytes. */
function useRecording(onStopped: (stopped: Stopped) => void) {
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const began = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const halt = useCallback(() => clearInterval(timer.current), []);

  useEffect(() => halt, [halt]);

  const stop = useCallback(() => {
    halt();

    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
    }
  }, [halt]);

  /** `false` when this browser cannot record (no supported type, or the constructor throws). */
  const start = (stream: MediaStream | null, fix: Fix | null): boolean => {
    const type = recorderType();

    if (type === null || stream === null || fix === null) {
      return false;
    }

    const locked = { fix, capturedAt: new Date().toISOString() };

    try {
      recorder.current = new MediaRecorder(stream, { mimeType: type });
    } catch {
      return false;
    }

    chunks.current = [];
    began.current = performance.now();
    recorder.current.ondataavailable = ({ data }) => {
      if (data.size > 0) {
        chunks.current.push(data);
      }
    };

    recorder.current.onstop = () => {
      halt();
      onStopped({
        blob: new Blob(chunks.current, { type }),
        durationSec: (performance.now() - began.current) / MS_PER_SEC,
        locked,
      });
    };

    recorder.current.start(TIMESLICE_MS);
    setElapsed(0);
    timer.current = setInterval(() => {
      const seconds = (performance.now() - began.current) / MS_PER_SEC;

      setElapsed(seconds);

      if (seconds >= APP_MAX_SEC) {
        stop();
      }
    }, TICK_MS);

    return true;
  };

  return { elapsed, start, stop, halt };
}

/** Why this browser cannot sign: no key record, or a key the server no longer lists as active. */
const keyProblem = async (
  profileId: string,
  registered: readonly string[] | undefined,
): Promise<AlertKey | null> => {
  const record = await readKeyRecord(profileId);

  if (record === null) {
    return 'NO_KEY';
  }

  return registered !== undefined && !registered.includes(record.thumbprint)
    ? 'UNREGISTERED'
    : null;
};

type SealJob = { stopped: Stopped; profileId: string; target: SealTarget };

/** The clip with its hash, canonical payload and signature; `null` when the key vanished since the camera opened. */
const sealRecording = async ({ stopped, profileId, target }: SealJob): Promise<Clip | null> => {
  const { blob, durationSec, locked } = stopped;
  const key = await readKeyRecord(profileId);

  if (key === null) {
    return null;
  }

  const sealed = await seal({ blob, target, fix: locked.fix, capturedAt: locked.capturedAt, key });

  return {
    ...sealed,
    blob,
    url: URL.createObjectURL(blob),
    durationSec: Math.round(durationSec * TENTH) / TENTH,
    sizeBytes: blob.size,
    contentType: baseContentType(blob.type),
    capturedAt: locked.capturedAt,
  };
};

type Options = {
  profileId: string;
  target: SealTarget;
  /** Thumbprints the server lists as active; `undefined` when the list is not known (failed read, offline). */
  registered: readonly string[] | undefined;
};

/** The sealed clip held in memory: its object URL is revoked when the clip is dropped and when the screen goes. */
function useClip() {
  const [clip, setClip] = useState<Clip | null>(null);
  const url = useRef<string | null>(null);

  const drop = useCallback(() => {
    if (url.current !== null) {
      URL.revokeObjectURL(url.current);
      url.current = null;
    }

    setClip(null);
  }, []);

  useEffect(() => drop, [drop]);

  return {
    clip,
    drop,
    show: (sealed: Clip) => {
      url.current = sealed.url;
      setClip(sealed);
    },
  };
}

export function useCapture({ profileId, target, registered }: Options) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [alert, setAlert] = useState<AlertKey | null>(null);
  const held = useClip();
  const { camera, gps, stop: stopCapture } = useDevices(setAlert);
  const hints = useQrHints(video, phase === 'live' || phase === 'recording');

  /** Recorder stopped: the devices go off, then hash, canonical payload and signature, then review. */
  const sealClip = async (stopped: Stopped): Promise<void> => {
    stopCapture();
    setPhase('sealing');

    const sealed = await sealRecording({ stopped, profileId, target });

    if (sealed === null) {
      setAlert('KEY_GONE');
      setPhase('idle');

      return;
    }

    held.show(sealed);
    setAlert(sealed.sizeBytes > MAX_UPLOAD_BYTES ? 'TOO_LARGE' : null);
    setPhase('review');
  };

  const recording = useRecording((stopped) => void sealClip(stopped));

  useEffect(() => stopCapture, [stopCapture]);

  const fail = (key: AlertKey): void => {
    recording.halt();
    stopCapture();
    setAlert(key);
    setPhase('idle');
  };

  /** The key checks, then camera, then GPS; the first that cannot is the alert and the phase goes back to idle. */
  const open = async (): Promise<void> => {
    setAlert(null);
    setPhase('starting');

    const problem =
      (await keyProblem(profileId, registered)) ??
      (await camera.start(video.current)) ??
      (gps.start() ? null : 'NO_GPS');

    return problem === null ? setPhase('live') : fail(problem);
  };

  const start = (): void => {
    if (recording.start(camera.stream.current, gps.fix)) {
      setPhase('recording');
    } else {
      fail('CANNOT_RECORD');
    }
  };

  const retake = (): void => {
    held.drop();
    gps.reset();
    setAlert(null);
    setPhase('idle');
  };

  return {
    video,
    phase,
    alert,
    clip: held.clip,
    elapsed: recording.elapsed,
    fix: gps.fix,
    hints,
    open,
    start,
    stop: recording.stop,
    retake,
  };
}
