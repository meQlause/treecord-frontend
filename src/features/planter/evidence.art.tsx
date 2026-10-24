// The film strip of S21 (mockup planter-pages.jsx:590-607): the keyframes the server kept, laid out like a strip of film
// with each frame's time and a pill saying the video itself stays on the server. Informative: it names the recording.
import { useRef } from 'react';
import type { CaptureKind } from '../evidence/evidence.rules';
import { KEPT_ON_SERVER, framesAria } from './evidence.copy';
import { frameTime } from './evidence.rules';

const SANS = 'Segoe UI, sans-serif';
const MONO = 'ui-monospace, Consolas, monospace';
const SPROCKETS = Array.from({ length: 20 }, (_slot, index) => index);
const STRIP_WIDTH = 596;
const FRAME_GAP = 16;
const FRAME_MAX = 188;
const FRAME_LEFT = 22;
const SPROCKET_PITCH = 31;
const SPROCKET_LEFT = 14;
const PILL_INSET = 8;
const PILL_CENTER = 31;

const gapsOf = (count: number): number => FRAME_GAP * (count - 1);

type StripProps = {
  urls: string[];
  durationSec: number;
  kind: CaptureKind;
  /** An image that fails to load (its link expired) asks for fresh links once. */
  onBroken: () => void;
};

/** One frame's width and the strip's left edge, so any number of frames sits centred in the film. */
const layoutOf = (count: number): { width: number; left: number } => {
  const width = Math.min(FRAME_MAX, (STRIP_WIDTH - gapsOf(count)) / count);
  const used = count * width + gapsOf(count);

  return { width, left: FRAME_LEFT + (STRIP_WIDTH - used) / 2 };
};

export function KeyframeStrip({ urls, durationSec, kind, onBroken }: StripProps) {
  const asked = useRef(false);
  const { width, left } = layoutOf(urls.length);

  const broken = (): void => {
    if (!asked.current) {
      asked.current = true;
      onBroken();
    }
  };

  return (
    <svg
      className="pl-frames"
      viewBox="0 0 640 210"
      role="img"
      aria-label={framesAria(durationSec, urls.length)}
      data-kind={kind}
    >
      <rect width="640" height="210" rx="14" fill="#17301f" />
      {SPROCKETS.map((slot) => (
        <g key={slot}>
          <rect
            x={SPROCKET_LEFT + slot * SPROCKET_PITCH}
            y="10"
            width="16"
            height="9"
            rx="2"
            fill="#2b4a35"
          />
          <rect
            x={SPROCKET_LEFT + slot * SPROCKET_PITCH}
            y="191"
            width="16"
            height="9"
            rx="2"
            fill="#2b4a35"
          />
        </g>
      ))}
      {urls.map((url, index) => {
        const frameX = left + index * (width + FRAME_GAP);

        return (
          <g key={url}>
            <clipPath id={`kf-${index}`}>
              <rect x={frameX} y="30" width={width} height="150" rx="6" />
            </clipPath>
            <rect x={frameX} y="30" width={width} height="150" rx="6" fill="#dfe9d2" />
            <image
              href={url}
              x={frameX}
              y="30"
              width={width}
              height="150"
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#kf-${index})`}
              ref={(element) => element?.addEventListener('error', broken, { once: true })}
            />
            <rect
              x={frameX + PILL_INSET}
              y="36"
              width="46"
              height="15"
              rx="7.5"
              fill="#153e2c"
              opacity=".7"
            />
            <text
              x={frameX + PILL_CENTER}
              y="47"
              textAnchor="middle"
              fontSize="8.5"
              fill="#dfe9c8"
              fontFamily={MONO}
            >
              {frameTime(index, urls.length, durationSec)}
            </text>
          </g>
        );
      })}
      <rect x="236" y="88" width="168" height="34" rx="17" fill="#153e2c" opacity=".78" />
      <text x="320" y="109" textAnchor="middle" fontSize="10.5" fill="#eef3e6" fontFamily={SANS}>
        {KEPT_ON_SERVER}
      </text>
    </svg>
  );
}
