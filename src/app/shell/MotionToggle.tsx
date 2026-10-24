import { Icon } from '../../shared/art/Icon';
import { useMotion } from './motion-context';
import { MOTION_COPY } from './shell.copy';

const ICON_SIZE = 17;

type Mode = keyof typeof MOTION_COPY;

const modeOf = (reduced: boolean, paused: boolean): Mode => {
  if (reduced) {
    return 'reduced';
  }

  return paused ? 'paused' : 'playing';
};

/** FR-014 / SH-19..21. Reduced motion is the system's choice: pressed, and not ours to undo. */
export function MotionToggle() {
  const { paused, reduced, toggle } = useMotion();
  const mode = modeOf(reduced, paused);

  return (
    <button
      type="button"
      className="icon-button motion-toggle"
      aria-label={MOTION_COPY[mode].label}
      title={MOTION_COPY[mode].title}
      aria-pressed={paused || reduced}
      disabled={reduced}
      onClick={toggle}
    >
      <Icon name={paused || reduced ? 'play' : 'pause'} size={ICON_SIZE} />
    </button>
  );
}
