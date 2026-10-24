// S18's ticket (s18-challenges.md §1, mockup planter-pages.jsx:190-212): the scene, the badge, what to do about it in three
// steps, and the foot — when it expires and how to answer. The server decides whether it can be answered; the ticket only
// shows the first reason it gave.
import { motion } from 'motion/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { PrintQR } from '../../shared/art/QR';
import { localDate } from '../../shared/format/datetime';
import { cardMotion } from '../../shared/motion/presets';
import type { PlanterChallenge } from './planter.api';
import {
  HOWTO,
  NO_TAG,
  PRINT_QR,
  RECORD_RESPONSE,
  challengePrintLine,
  daysLeftLine,
  issuedOn,
  treeNumber,
} from './planter.copy';
import { daysOf, ticketOf } from './planter.rules';
import { ChallengeScene } from './challenges.art';

const PIN_ICON = 14;
const CLOCK_ICON = 14;
const ARROW_ICON = 16;

/** The three steps, each with the glyph the mockup draws; the second names the code and the tag. */
const STEP_GLYPH = ['M-7-4h3l2-3h4l2 3h3v10h-14Z', 'M-8-5h16v10h-16Z', 'M-3-5v10l8-5Z'];

function HowTo({ challenge, can }: { challenge: PlanterChallenge; can: boolean }) {
  const stroke = can ? '#2f6b43' : '#9aab88';

  return (
    <ol className="pl-howto">
      {HOWTO.map((step, index) => (
        <li key={step}>
          <svg viewBox="-14 -14 28 28" aria-hidden="true">
            <circle r="13" fill={can ? '#e3efd8' : '#f1f2ec'} />
            <path
              className={`pl-ico pl-ico-${index}`}
              d={STEP_GLYPH[index]}
              fill={index === 2 ? stroke : 'none'}
              stroke={stroke}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            {index === 1 ? (
              <>
                Hold <strong>{challenge.code}</strong> beside tag {challenge.tree.tag ?? NO_TAG}
              </>
            ) : (
              step
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

type FootProps = { challenge: PlanterChallenge; expires: string; now: number };

/** The foot: days left and expiry, and either "Record response", the held check-in's link, or why it waits. */
function Foot({ challenge, expires, now }: FootProps) {
  const ticket = ticketOf(challenge);
  const days = daysOf(challenge, now);

  return (
    <div className="pl-ticket-foot">
      <span className="pl-expiry">
        <Icon name="clock" size={CLOCK_ICON} />
        {daysLeftLine(days.left, expires)}
      </span>
      {ticket.can && (
        <Link
          className="button primary"
          to={`/app/planter/record?tree=${challenge.tree.treeId}&kind=ALIVE`}
        >
          {RECORD_RESPONSE}
          <Icon name="arrow" size={ARROW_ICON} />
        </Link>
      )}
      {ticket.held !== null && (
        <Link className="pl-wait" to={ticket.held.to}>
          {ticket.held.text}
        </Link>
      )}
      {ticket.waiting !== null && <span className="pl-wait">{ticket.waiting}</span>}
    </div>
  );
}

type TicketProps = { challenge: PlanterChallenge; now: number; index: number };

export function ChallengeTicket({ challenge, now, index }: TicketProps) {
  const { tree } = challenge;
  const ticket = ticketOf(challenge);
  const expires = localDate(challenge.expiresAt);
  const to = `/trees/${tree.treeId}`;

  return (
    <motion.article
      className={`pl-ticket ${ticket.can ? '' : 'is-waiting'}`}
      {...cardMotion(index, false)}
    >
      <Link className="pl-ticket-art" to={to} tabIndex={-1} aria-hidden="true">
        <ChallengeScene challenge={challenge} days={daysOf(challenge, now)} />
      </Link>
      <div className="pl-ticket-body">
        <div className="pl-ticket-tags">
          <span className={`badge ${ticket.can ? 'active' : 'refunding'}`}>
            <span />
            {ticket.badge}
          </span>
          <span className="species-label">{issuedOn(localDate(challenge.issuedAt))}</span>
          <PrintQR text={challenge.qr} line={challengePrintLine(tree.treeId, expires)}>
            {PRINT_QR}
          </PrintQR>
        </div>
        <h2>
          <Link to={to}>{treeNumber(tree.treeId)}</Link>
        </h2>
        <span className="location">
          <Icon name="pin" size={PIN_ICON} />
          <span className="wrap-any">
            {tree.campaign.title} · {tree.campaign.regionName}
          </span>
        </span>
        <HowTo challenge={challenge} can={ticket.can} />
        <Foot challenge={challenge} expires={expires} now={now} />
      </div>
    </motion.article>
  );
}
