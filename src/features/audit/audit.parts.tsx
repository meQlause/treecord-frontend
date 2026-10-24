// S23's pieces (s23-open-audit.md §1): the open-session form and the session card. Each takes plain props; the page owns
// the sessions query and the filter.
import { motion } from 'motion/react';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/art/Icon';
import { localDateTime } from '../../shared/format/datetime';
import { cardMotion } from '../../shared/motion/presets';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { Progress } from '../../shared/ui/Progress';
import { Skeleton } from '../../shared/ui/Skeleton';
import { PopulationArt } from './audit.art';
import { useCampaignOptions, useOpenSession, type SessionItem } from './audit.api';
import * as copy from './audit.copy';
import { clampPercent, sampleSizeOf, shortHash } from './audit.rules';

const ICON = 14;
const BIG_ICON = 17;
const SMALL_ICON = 16;
const INITIAL_SIZE = '2';

type Problems = { campaign?: ReactNode; size?: ReactNode; banner?: ReactNode };

/** What a refused open says and where (s23 §5): `no_trees` under Campaign, a `validation_error` under its path. */
const problemsOf = (error: unknown): Problems => {
  if (!(error instanceof ApiError)) {
    return { banner: copy.UNAVAILABLE };
  }

  if (error.code === 'no_trees') {
    return { campaign: copy.NO_TREES };
  }

  if (error.code === 'validation_error') {
    const paths = Array.isArray(error.details) ? (error.details as { path?: string }[]) : [];

    return paths.some(({ path }) => path === 'sampleSize')
      ? { size: <Lorem id={copy.SIZE_COPY} /> }
      : { campaign: <Lorem id={copy.COPY_VALIDATION} /> };
  }

  return { banner: copy.UNAVAILABLE };
};

function CampaignSelect({
  value,
  onChange,
  problem,
}: {
  value: string;
  onChange: (address: string) => void;
  problem: ReactNode;
}) {
  const options = useCampaignOptions();

  if (options.isError) {
    return (
      <Banner tone="error" action={copy.TRY_AGAIN} onAction={() => void options.refetch()}>
        {copy.UNAVAILABLE}
      </Banner>
    );
  }

  return (
    <div aria-busy={options.isPending || undefined}>
      <Field label={copy.F_CAMPAIGN} error={problem}>
        <CampaignOptions options={options} value={value} onChange={onChange} />
      </Field>
    </div>
  );
}

type OptionsProps = {
  options: ReturnType<typeof useCampaignOptions>;
  value: string;
  onChange: (address: string) => void;
};

function CampaignOptions({ options, value, onChange }: OptionsProps) {
  return (
    <select
      disabled={options.isPending}
      className={options.isPending ? 'skeleton' : undefined}
      value={value || (options.data?.[0]?.address ?? '')}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.data?.map(({ address, title }) => (
        <option key={address} value={address}>
          {title ?? address}
        </option>
      ))}
    </select>
  );
}

/** FR-182: validated on submit (inline errors, NFR-071); the POST goes once and `no_trees` is a field error, never a toast. */
function OpenSessionForm({ online }: { online: boolean }) {
  const [campaign, setCampaign] = useState('');
  const [size, setSize] = useState(INITIAL_SIZE);
  const [problems, setProblems] = useState<Problems>({});
  const open = useOpenSession();
  const options = useCampaignOptions();
  const navigate = useNavigate();
  const flight = useRef(false);
  const chosen = campaign || (options.data?.[0]?.address ?? '');

  const submit = (event: FormEvent): void => {
    event.preventDefault();

    const count = sampleSizeOf(size);

    if (count === null) {
      setProblems({ size: <Lorem id={copy.SIZE_COPY} /> });
    } else if (!flight.current && chosen !== '') {
      flight.current = true;
      setProblems({});
      open.mutate(
        { campaign: chosen, sampleSize: count },
        {
          onSuccess: ({ id }) => void navigate(`/app/audit/${id}`),
          onError: (error) => setProblems(problemsOf(error)),
          onSettled: () => {
            flight.current = false;
          },
        },
      );
    }
  };

  return (
    <form className="au-open" noValidate onSubmit={submit}>
      <CampaignSelect
        value={campaign}
        onChange={(address) => {
          setCampaign(address);
          setProblems((now) => ({ ...now, campaign: undefined }));
        }}
        problem={problems.campaign}
      />
      <Field label={copy.F_SAMPLE_SIZE} hint={copy.SAMPLE_HINT} error={problems.size}>
        <input
          type="number"
          min="1"
          max="100"
          step="1"
          required
          value={size}
          onChange={(event) => {
            setSize(event.target.value);
            setProblems((now) => ({ ...now, size: undefined }));
          }}
        />
      </Field>
      {problems.banner !== undefined && <Banner tone="error">{problems.banner}</Banner>}
      <Button
        type="submit"
        icon="arrow"
        busy={open.isPending}
        disabled={!online || options.isError || options.isPending}
      >
        {copy.OPEN_SESSION}
      </Button>
    </form>
  );
}

/** The open and the "how it is drawn" halves of the heading section, in the mockup's own markup. */
export function Duo({ online, art }: { online: boolean; art: ReactNode }) {
  return (
    <section className="donor-duo au-duo" aria-label={copy.OPEN_ARIA}>
      <div className="duo-half">
        <span className="action-text">
          <span className="action-kicker">{copy.KICKER_ONE}</span>
          <strong>
            {copy.PICK_CAMPAIGN}
            <br />
            <em>{copy.NOT_THE_TREES}</em>
          </strong>
        </span>
        <OpenSessionForm online={online} />
      </div>
      <div className="duo-half">
        <span className="action-text">
          <span className="action-kicker">{copy.KICKER_TWO}</span>
          <strong>
            {copy.SEEDED_BY}
            <br />
            <em>{copy.THE_CHAIN}</em>
          </strong>
        </span>
        {art}
      </div>
    </section>
  );
}

type CardProps = { session: SessionItem; index: number };

/** One session: the population as trees with the sample in gold, findings so far, challenges, the report hash. */
export function SessionCard({ session, index }: CardProps) {
  const closed = session.status === 'closed';
  const to = closed ? `/app/audit/${session.id}/report` : `/app/audit/${session.id}`;
  const percent = clampPercent(session.findingsRecorded, session.sampleSize);

  return (
    <motion.article className="campaign-card" {...cardMotion(index)}>
      <Link className="card-art-link" to={to} tabIndex={-1} aria-hidden="true">
        <PopulationArt population={session.populationPreview} samples={session.sample} />
      </Link>
      <div className="art-tags">
        <span className={`badge ${closed ? 'completed' : 'active'}`}>
          <span />
          {closed ? copy.CLOSED_BADGE : copy.OPEN_BADGE}
        </span>
        <span className="species-label">
          {copy.sampleOf(session.sampleSize, session.populationSize)}
        </span>
      </div>
      <div className="card-body">
        <span className="location">
          <Icon name="clock" size={ICON} />
          {localDateTime(session.createdAt)}
        </span>
        <h2 className="clamp-2">
          <Link to={to} title={session.campaign.title}>
            {session.campaign.title}
          </Link>
        </h2>
        <div className="tree-target">
          <Icon name="carbon" size={BIG_ICON} />
          {copy.blockOf(session.seedBlockNumber)}
        </div>
        <div className="funding-row">
          <span>
            <strong>
              {session.findingsRecorded}/{session.sampleSize}
            </strong>{' '}
            <small>{copy.FINDINGS_UNIT}</small>
          </span>
          <span>{percent}%</span>
        </div>
        <Progress label={copy.FINDINGS_RECORDED} percent={percent} />
        <div className="card-meta">
          <span>{copy.challengesOf(session.challengesIssued)}</span>
          <span>
            {session.reportHash === null
              ? copy.REPORT_ON_CLOSE
              : copy.reportOf(shortHash(session.reportHash))}
          </span>
        </div>
        <Link className="card-bottom" to={to}>
          <span>{closed ? copy.READ_REPORT : copy.CONTINUE_SESSION}</span>
          <span className="arrow-circle">
            <Icon name="arrow" size={SMALL_ICON} />
          </span>
        </Link>
      </div>
    </motion.article>
  );
}

/** The first read of the list: a card skeleton after 300 ms. */
export function ListSkeleton() {
  return <Skeleton shape="cards" label="Loading workspace…" />;
}
