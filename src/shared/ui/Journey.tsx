import { Icon, type IconName } from '../art/Icon';

// K21. Mockup my-carbon.jsx:151 and shared-pages.jsx:229 (`rc-journey`). A row of steps on a track, taken from S09's
// retirement journey on its second use (S12's job lifecycle). `done` is behind, `now` is where it is; `fill` is how far
// the track is drawn (0 to 1), left to the stylesheet's own animation when it is not given.
const NODE_SIZE = 16;
const PERCENT = 100;

export type JourneyStep = {
  icon: IconName;
  label: string;
  /** The caption under the label. */
  note: string;
  state: 'done' | 'now' | '';
};

type JourneyProps = {
  /** The visible heading. */
  title: string;
  /** The region's accessible name. */
  label: string;
  steps: readonly JourneyStep[];
  fill?: number;
};

export function Journey({ title, label, steps, fill }: JourneyProps) {
  return (
    <section className="rc-journey" aria-label={label}>
      <h3>{title}</h3>
      <div className="rc-steps">
        <i className="rc-track" aria-hidden="true">
          <b style={fill === undefined ? undefined : { width: `${fill * PERCENT}%` }} />
        </i>
        <ol>
          {steps.map(({ icon, label: step, note, state }) => (
            <li key={step} className={state}>
              <span className="rc-node">
                <Icon name={icon} size={NODE_SIZE} />
              </span>
              <strong>{step}</strong>
              <span>{note}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
