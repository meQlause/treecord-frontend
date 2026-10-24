// The phone's camera, GPS and QR reader as small hooks for S19 (s19-record.md §3, §6). Streams, watches and timers live in
// refs and are stopped by the caller on seal, retake and unmount; nothing here touches the network.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { GPS_TIMEOUT_MS, QR_POLL_MS, RECORDER_TYPES } from './evidence.config';
import type { Fix } from './evidence.rules';

/** What the capture alert says; the page owns the sentences. */
export type AlertKey =
  | 'NO_KEY'
  | 'UNREGISTERED'
  | 'DENIED'
  | 'NO_CAMERA'
  | 'NO_GPS'
  | 'LOC_DENIED'
  | 'GPS_UNAVAILABLE'
  | 'CANNOT_RECORD'
  | 'KEY_GONE'
  | 'TOO_LARGE';

const PERMISSION_DENIED = 1;

/** The recorder's best supported type, or `null` when the browser has no MediaRecorder for any of them. */
export const recorderType = (): string | null =>
  typeof MediaRecorder === 'undefined'
    ? null
    : (RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null);

/** Watches the position; the fix stays until `reset`. `start` is `false` when the browser has no geolocation. */
function useGps(onAlert: (key: AlertKey) => void) {
  const [fix, setFix] = useState<Fix | null>(null);
  const watch = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watch.current !== null) {
      navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    }
  }, []);

  const start = useCallback((): boolean => {
    if (!('geolocation' in navigator)) {
      return false;
    }

    watch.current = navigator.geolocation.watchPosition(
      ({ coords }) => setFix({ lat: coords.latitude, lon: coords.longitude, acc: coords.accuracy }),
      (error) => onAlert(error.code === PERMISSION_DENIED ? 'LOC_DENIED' : 'GPS_UNAVAILABLE'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_TIMEOUT_MS },
    );

    return true;
  }, [onAlert]);

  return { fix, start, stop, reset: () => setFix(null) };
}

/** The rear camera; `start` shows it in `element` and says why it could not open (`null`: it did) instead of throwing. */
function useCamera() {
  const stream = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  const start = useCallback(async (element: HTMLVideoElement | null): Promise<AlertKey | null> => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
    } catch (error) {
      return error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'DENIED'
        : 'NO_CAMERA';
    }

    if (element !== null) {
      element.srcObject = stream.current;
      await element.play().catch(() => undefined);
    }

    return null;
  }, []);

  return { stream, start, stop };
}

/** Camera and GPS together: `stop` switches both off (seal, retake, a refused start, unmount). */
export function useDevices(onAlert: (key: AlertKey) => void) {
  const camera = useCamera();
  const gps = useGps(onAlert);
  const { stop: stopCamera } = camera;
  const { stop: stopGps } = gps;
  const stop = useCallback(() => {
    stopCamera();
    stopGps();
  }, [stopCamera, stopGps]);

  return { camera, gps, stop };
}

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

type DetectorConstructor = new (options: { formats: string[] }) => Detector;

/** The strings the detector reads off the current frame; a frame it cannot read is no hits. */
const readHits = (detector: Detector, element: HTMLVideoElement): Promise<string[]> =>
  detector
    .detect(element)
    .then((hits) => hits.map((hit) => hit.rawValue))
    .catch(() => []);

/** Live QR hint where the browser has `BarcodeDetector`: the decoded strings seen so far; the server reads the video anyway. */
export function useQrHints(video: RefObject<HTMLVideoElement | null>, active: boolean) {
  const Constructor = (window as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!active || Constructor === undefined) {
      return undefined;
    }

    const detector = new Constructor({ formats: ['qr_code'] });
    const timer = setInterval(() => {
      if (video.current !== null) {
        void readHits(detector, video.current).then((found) =>
          setSeen((now) => new Set([...now, ...found])),
        );
      }
    }, QR_POLL_MS);

    return () => clearInterval(timer);
  }, [active, Constructor, video]);

  return { supported: Constructor !== undefined, seen };
}
