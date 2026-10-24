// S09's pieces (s09-certificate.md §1): the certificate, the retirement journey, the on-chain record and "Where it
// grew". Each takes the one record and prints it; nothing here fetches or changes anything (FR-237).
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { Photo } from '../../shared/art/Photo';
import { shortAddress } from '../../shared/format/address';
import { tonnes } from '../../shared/format/carbon';
import { localDate, localDateLong, utcDateTime } from '../../shared/format/datetime';
import { Journey, type JourneyStep } from '../../shared/ui/Journey';
import { artForSpecies } from '../campaigns/art';
import { UNIT } from './carbon.copy';
import type { Retirement } from './certificate.api';
import {
  CERTIFICATE_EYEBROW,
  CERTIFICATE_LABEL,
  CERTIFIES,
  CONFIRMED,
  JOURNEY,
  LEDGER,
  NOT_AVAILABLE,
  NO_PURPOSE,
  RECORD_EYEBROW,
  RECORD_TITLE,
  REGISTRY_LABEL,
  REMOVAL_FROM,
  SIGNATURE,
  STEP_HELD,
  STEP_ISSUED,
  STEP_REGISTRY,
  STEP_RETIRED,
  VIEW_CAMPAIGN,
  WHERE_IT_GREW,
  batchFact,
  certificateNumber,
  issuedAs,
  quoted,
  speciesMeta,
  vintageNote,
} from './certificate.copy';
import { SerialRange } from './carbon.parts';

const SMALL_ICON = 12;
const PIN_ICON = 14;
const ARROW_ICON = 16;
const ROSETTE = 16;
const SEAL_RADIUS = 27;

// ---- the guilloche bands ----
const WAVE_POINTS = 151;
const WAVE_STEP = 4;
const WAVE_MIDLINE = 12;
const WAVE_LENGTH = 40;
const BANDS = [
  { amplitude: 8, phase: 0, stroke: '#cfdcbf' },
  { amplitude: 8, phase: Math.PI, stroke: '#cfdcbf' },
  { amplitude: 5, phase: Math.PI / 2, stroke: '#d8b96a' },
];

const wave = (amplitude: number, phase: number): string =>
  `M${Array.from({ length: WAVE_POINTS }, (_item, point) => {
    const across = point * WAVE_STEP;
    const down = WAVE_MIDLINE + amplitude * Math.sin((across / WAVE_LENGTH) * 2 * Math.PI + phase);

    return `${across} ${down.toFixed(2)}`;
  }).join('L')}`;

function Guilloche({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      className={`rc-guilloche${flip ? ' flip' : ''}`}
      viewBox="0 0 600 24"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {BANDS.map(({ amplitude, phase, stroke }) => (
        <path
          key={`${amplitude}-${phase}`}
          d={wave(amplitude, phase)}
          fill="none"
          stroke={stroke}
          strokeWidth="1.3"
          pathLength="1"
          strokeDasharray="1"
        />
      ))}
    </svg>
  );
}

const ROSETTE_KEYS = Array.from({ length: ROSETTE }, (_item, key) => key);

function Seal() {
  return (
    <svg className="rc-seal" viewBox="-40 -40 80 96" aria-hidden="true">
      <path d="M-14 18-22 54-10 46-2 56 4 22M14 18l8 36-12-8-8 10-6-34" fill="#2f6b43" />
      <g className="rc-rosette">
        {ROSETTE_KEYS.map((key) => (
          <circle
            key={key}
            cx={Math.cos((key * Math.PI) / (ROSETTE / 2)) * SEAL_RADIUS}
            cy={Math.sin((key * Math.PI) / (ROSETTE / 2)) * SEAL_RADIUS}
            r="6"
            fill="#2E9E5B"
          />
        ))}
        <circle r="27" fill="#2E9E5B" />
        <circle r="21" fill="none" stroke="#bfe5c9" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
      </g>
      <path
        d="M-9 0l6 6 12-13"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SIGN_PATH =
  'M4 26c8-14 14-22 18-14s-6 16 2 8 12-20 18-12-3 13 4 7 10-13 16-7 2 9 10 4 8-8 14-4 6 4 12 1 10-3 16-2';

/** `retirement` read by every part below; the registry label is the one place `status` becomes words. */
export function CertificateCard({ retirement }: { retirement: Retirement }) {
  const { batch, campaign, registryRetirement } = retirement;

  return (
    <article className="rc-cert" aria-label={CERTIFICATE_LABEL}>
      <Guilloche />
      <Seal />
      <div className="rc-cert-body">
        <div className="rc-line rc-cert-top">
          <span className="eyebrow">{CERTIFICATE_EYEBROW}</span>
          <span className="rc-no">{certificateNumber(retirement.retirementId)}</span>
        </div>
        <p className="rc-line rc-lead">{CERTIFIES}</p>
        <p className="rc-line rc-amount">
          <strong>{tonnes(retirement.amount)}</strong>
          <span>{UNIT}</span>
        </p>
        <p className="rc-line rc-lead">
          {REMOVAL_FROM} <em>{campaign.title}</em>
          {issuedAs(batch.batchId, batch.registry)}
        </p>
        <p className="rc-line rc-name">{retirement.beneficiary}</p>
        <p className="rc-line rc-purpose">
          {retirement.purpose === null || retirement.purpose === ''
            ? NO_PURPOSE
            : quoted(retirement.purpose)}
        </p>
        <div className="rc-line rc-foot">
          <dl>
            {(
              [
                ['Retired on', localDateLong(retirement.retiredAt)],
                ['Ledger', LEDGER],
                ['Registry', REGISTRY_LABEL[registryRetirement.status]],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="rc-sign">
            <svg viewBox="0 0 120 34" aria-hidden="true">
              <path
                d={SIGN_PATH}
                fill="none"
                stroke="#3f6b35"
                strokeWidth="1.6"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
              />
            </svg>
            <span>{SIGNATURE}</span>
          </div>
        </div>
      </div>
      <Guilloche flip />
    </article>
  );
}

/** The four steps from issuance to the registry; the last is `now` until the registry says done (FR-235). */
export function RetirementJourney({ retirement }: { retirement: Retirement }) {
  const { batch, registryRetirement } = retirement;
  const done = registryRetirement.status === 'done';
  const steps: JourneyStep[] = [
    {
      icon: 'carbon',
      label: STEP_ISSUED,
      note: vintageNote(batch.registry, batch.vintage),
      state: 'done',
    },
    { icon: 'wallet', label: STEP_HELD, note: shortAddress(retirement.holder), state: 'done' },
    { icon: 'check', label: STEP_RETIRED, note: localDate(retirement.retiredAt), state: 'done' },
    {
      icon: done ? 'check' : 'clock',
      label: STEP_REGISTRY,
      note: REGISTRY_LABEL[registryRetirement.status],
      state: done ? 'done' : 'now',
    },
  ];

  return <Journey title={JOURNEY} label={JOURNEY} steps={steps} {...(done ? { fill: 1 } : {})} />;
}

/** "Issuance transaction": the link when the contract gives one, the short hash as text, or "Not available yet". */
export function IssuanceTx({ issuedTx }: { issuedTx: Retirement['batch']['issuedTx'] }) {
  if (issuedTx === null) {
    return NOT_AVAILABLE;
  }

  return issuedTx.url === null ? (
    shortAddress(issuedTx.hash)
  ) : (
    <a href={issuedTx.url} target="_blank" rel="noopener noreferrer">
      {shortAddress(issuedTx.hash)}
    </a>
  );
}

/** The on-chain record: seven facts and the serial range. */
export function ProvenanceRecord({ retirement }: { retirement: Retirement }) {
  const { batch, campaign, registryRetirement } = retirement;
  const rows: [string, ReactNode][] = [
    ['Retired at', utcDateTime(retirement.retiredAt)],
    ['Holder', shortAddress(retirement.holder)],
    ['Batch', batchFact(batch.batchId, batch.registry, batch.vintage)],
    ['Public geohash', campaign.region.geohash],
    ['Retirement transaction', shortAddress(retirement.txHash)],
    ['Issuance transaction', <IssuanceTx key="issuance" issuedTx={batch.issuedTx} />],
    ['Registry reference', registryRetirement.reference ?? NOT_AVAILABLE],
  ];

  return (
    <section className="cb-record">
      <h3>{RECORD_TITLE}</h3>
      <div className="cb-cert">
        <div className="cb-cert-head">
          <div>
            <span className="eyebrow">{RECORD_EYEBROW}</span>
            <strong>{retirement.retirementId}</strong>
          </div>
          <span className="rc-chip">
            <Icon name="check" size={SMALL_ICON} />
            {CONFIRMED}
          </span>
        </div>
        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <i aria-hidden="true" />
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <SerialRange
          batchId={batch.batchId}
          start={batch.serialStart}
          end={batch.serialEnd}
          issued={batch.issuedAmount}
        />
      </div>
    </section>
  );
}

/** A link to the campaign the credits grew in. */
export function WhereItGrew({ campaign }: { campaign: Retirement['campaign'] }) {
  return (
    <Link className="cb-provenance rc-where" to={`/campaigns/${campaign.address}`}>
      <div>
        <span className="cb-issued">
          <Icon name="leaf" size={SMALL_ICON} />
          {WHERE_IT_GREW}
        </span>
        <h2>{campaign.title}</h2>
        <span className="location">
          <Icon name="pin" size={PIN_ICON} />
          {campaign.region.name}
        </span>
        <span className="cb-prov-meta">
          {speciesMeta(campaign.species.name, campaign.treeTarget)}
        </span>
        <span className="tr-go">
          {VIEW_CAMPAIGN}
          <span className="arrow-circle">
            <Icon name="arrow" size={ARROW_ICON} />
          </span>
        </span>
      </div>
      <div className="cb-prov-art">
        <Photo kind={artForSpecies(campaign.species.code)} />
      </div>
    </Link>
  );
}
