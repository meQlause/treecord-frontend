// S15's pieces (s15-my-carbon.md §1): the three figures, the three kinds of card and the empty state of a section. Each takes
// plain props; the page owns the holdings and the open dialog. Card art is decorative and never waited for (§10).
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { Photo } from '../../shared/art/Photo';
import { tonnes } from '../../shared/format/carbon';
import { cardMotion } from '../../shared/motion/presets';
import { artForSpecies } from '../campaigns/art';
import { Progress } from '../../shared/ui/Progress';
import { EmptyState } from '../../shared/ui/EmptyState';
import { CreditArt } from './art/CreditArt';
import { useBatch } from './carbon.api';
import type { Balance, Holdings, Reservation, Retirement } from './holdings.api';
import * as copy from './my-carbon.copy';
import { cardDate, heldShare, issuedShare } from './my-carbon.rules';

const PIN_ICON = 14;
const TILE_ICON = 17;
const ARROW_ICON = 17;
const SMALL_ICON = 15;

/** The three figures under the title: issued, reserved (the unfilled part only, FR-211) and retired. */
export function Figures({ summary }: { summary: Holdings['summary'] }) {
  const amounts = [summary.issuedAmount, summary.unfilledAmount, summary.retiredAmount];

  return (
    <dl className="mc-figures">
      {copy.FIGURES.map(([label, note], index) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {tonnes(amounts[index] ?? '0')}
            <small>{copy.UNIT}</small>
          </dd>
          <span>{note}</span>
        </div>
      ))}
    </dl>
  );
}

type ShellProps = {
  className?: string;
  index: number;
  to: string;
  art: ReactNode;
  tags: ReactNode;
  location: ReactNode;
  title: string;
  titleText?: string;
  children: ReactNode;
  footer: ReactNode;
};

/** The card both kinds share: art link, tags, place, title, the rows, then a footer that is a link or a button. */
function Shell({
  className = '',
  index,
  to,
  art,
  tags,
  location,
  title,
  titleText,
  children,
  footer,
}: ShellProps) {
  return (
    <motion.article className={`campaign-card ${className}`.trim()} {...cardMotion(index)}>
      <Link className="card-art-link" to={to} tabIndex={-1} aria-hidden="true">
        {art}
      </Link>
      <div className="art-tags">{tags}</div>
      <div className="card-body">
        <span className="location">{location}</span>
        <h2 className="clamp-2">
          <Link to={to} title={titleText ?? title}>
            {title}
          </Link>
        </h2>
        {children}
        {footer}
      </div>
    </motion.article>
  );
}

const badge = (tone: string, text: string): ReactNode => (
  <span className={`badge ${tone}`}>
    <span />
    {text}
  </span>
);

function Place({ icon, children }: { icon: 'pin' | 'clock'; children: ReactNode }) {
  return (
    <>
      <Icon name={icon} size={PIN_ICON} />
      {children}
    </>
  );
}

/** The batch's art, drawn from the batch read (S08's own key); nothing while that read is pending or failed. */
function BatchArt({ batchId }: { batchId: string }) {
  const { data } = useBatch(batchId);

  return data === undefined ? <div className="cb-scene" /> : <CreditArt batch={data} />;
}

function SpeciesArt({ batchId }: { batchId: string }) {
  const { data } = useBatch(batchId);

  return <Photo kind={artForSpecies(data?.campaign.species.code)} />;
}

type BalanceProps = { balance: Balance; index: number; online: boolean; onRetire: () => void };

/** An issued balance (state 7): what is left to retire, the share still held, "Retire credits". */
export function BalanceCard({ balance, index, online, onRetire }: BalanceProps) {
  const share = heldShare(balance);

  return (
    <Shell
      className="cb-batch-card"
      index={index}
      to={`/carbon/${balance.batchId}`}
      art={<BatchArt batchId={balance.batchId} />}
      tags={
        <>
          {badge('funding', copy.ISSUED)}
          <span className="species-label">{copy.batchTag(balance.batchId)}</span>
        </>
      }
      location={<Place icon="pin">{balance.campaign.region}</Place>}
      title={balance.campaign.title}
      footer={
        <button className="card-bottom" disabled={!online} onClick={onRetire}>
          <span>{copy.RETIRE_CREDITS}</span>
          <span className="arrow-circle">
            <Icon name="leaf" size={ARROW_ICON} />
          </span>
        </button>
      }
    >
      <div className="tree-target">
        <Icon name="carbon" size={TILE_ICON} />
        <strong>{balance.registry}</strong>
        <span className="dot-separator">·</span>
        Vintage {balance.vintage}
      </div>
      <div className="funding-row">
        <span>
          <strong>{tonnes(balance.amount)}</strong> <small>{copy.toRetire}</small>
        </span>
        <span>{share}%</span>
      </div>
      <Progress label={copy.SHARE_HELD} percent={share} />
      <div className="card-meta">
        <span>{copy.retiredSoFar(tonnes(balance.retiredAmount))}</span>
        <span>{copy.serialOf(balance.serialStart, balance.serialEnd)}</span>
      </div>
    </Shell>
  );
}

type ReservationProps = {
  reservation: Reservation;
  index: number;
  online: boolean;
  onDecline: () => void;
};

/** A reservation (states 9-11): the total reserved, what was issued, what is unfilled, "Decline unfilled share". */
export function ReservationCard({ reservation, index, online, onDecline }: ReservationProps) {
  const share = issuedShare(reservation);
  const spent = reservation.declined || reservation.unfilledAmount === '0';

  return (
    <Shell
      index={index}
      to={`/campaigns/${reservation.campaign.address}`}
      art={<Photo kind={artForSpecies(reservation.campaign.species.code)} />}
      tags={
        <>
          {badge(
            reservation.declined ? 'refunding' : 'active',
            reservation.declined ? copy.DECLINED : copy.RESERVED,
          )}
          <span className="species-label">{reservation.campaign.species.name}</span>
        </>
      }
      location={<Place icon="pin">{reservation.campaign.region}</Place>}
      title={reservation.campaign.title}
      footer={
        <button className="card-bottom" disabled={!online || spent} onClick={onDecline}>
          <span>{reservation.declined ? copy.RELEASED : copy.DECLINE}</span>
          <span className="arrow-circle">
            <Icon name={reservation.declined ? 'check' : 'close'} size={SMALL_ICON} />
          </span>
        </button>
      }
    >
      <div className="tree-target">
        <Icon name="leaf" size={TILE_ICON} />
        <strong>{tonnes(reservation.reservedAmount)}</strong> {copy.RESERVED_TOTAL}
        <span className="dot-separator">·</span>
        {copy.PRE_CERTIFICATION}
      </div>
      <div className="funding-row">
        <span>
          <strong>{tonnes(reservation.allocatedAmount)}</strong> <small>{copy.ISSUED_TO_YOU}</small>
        </span>
        <span>{share}%</span>
      </div>
      <Progress label={copy.RESERVATION_ISSUED} percent={share} />
      <div className="card-meta">
        <span>{copy.unfilledOf(tonnes(reservation.unfilledAmount))}</span>
        <span>{copy.updatedOf(cardDate(reservation.updatedAt))}</span>
      </div>
    </Shell>
  );
}

/** A retirement (state 13): who it was for and why, how much, the registry's status, "View record". */
export function RetirementCard({ retirement, index }: { retirement: Retirement; index: number }) {
  const to = `/carbon/retirements/${retirement.retirementId}`;
  const purpose = retirement.purpose ?? copy.NO_PURPOSE;

  return (
    <Shell
      index={index}
      to={to}
      art={<SpeciesArt batchId={retirement.batchId} />}
      tags={
        <>
          {badge('completed', copy.RETIRED)}
          <span className="species-label">{copy.batchTag(retirement.batchId)}</span>
        </>
      }
      location={<Place icon="clock">{cardDate(retirement.retiredAt)}</Place>}
      title={copy.forBeneficiary(retirement.beneficiary)}
      footer={
        <Link className="card-bottom" to={to}>
          <span>{copy.VIEW_RECORD}</span>
          <span className="arrow-circle">
            <Icon name="arrow" size={ARROW_ICON} />
          </span>
        </Link>
      }
    >
      <div className="tree-target">
        <Icon name="check" size={TILE_ICON} />
        <span className="clamp-2" title={purpose}>
          {purpose}
        </span>
      </div>
      <div className="funding-row">
        <span>
          <strong>{tonnes(retirement.amount)}</strong> <small>{copy.RETIRED_UNIT}</small>
        </span>
        <span>{retirement.registry}</span>
      </div>
      <Progress label={copy.RETIRED} percent={100} />
      <div className="card-meta">
        <span>{copy.ON_CHAIN}</span>
        <span>{copy.registryOf(retirement.registryRetirement.status)}</span>
      </div>
    </Shell>
  );
}

/** A section with nothing in it (states 8, 12, 15): the title, the line, and the way to S07. */
export function EmptySection({ title, text }: { title: string; text: string }) {
  return (
    <EmptyState variant="compact" icon="leaf" title={title}>
      <p>{text}</p>
      <Link className="button outline" to="/carbon">
        {copy.EXPLORE}
        <Icon name="arrow" size={SMALL_ICON} />
      </Link>
    </EmptyState>
  );
}
