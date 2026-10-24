// S08's pieces (s08-batch.md §1): the provenance card, the batch record and the buy panel. Each takes the one batch and
// prints it. The buy panel is the read side of D08: price, inventory and what the availability allows. F2b: the amount,
// the quote and the wallet transaction states are wired there, so its controls stay off until then.
import type { ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { Icon } from '../../shared/art/Icon';
import { tonnes } from '../../shared/format/carbon';
import { Button } from '../../shared/ui/Button';
import { FacetCoin } from '../../shared/ui/FacetCoin';
import { CreditArt } from './art/CreditArt';
import {
  AMOUNT_LABEL,
  BUY_EYEBROW,
  BUY_NOTE,
  BUY_TITLE,
  GAS_NOTE,
  ISSUED_ON,
  MAX,
  NO_VALUE,
  PER_TONNE,
  RECORD_EYEBROW,
  RECORD_TITLE,
  TOTAL,
  USDC,
  provenanceMeta,
} from './batch.copy';
import { issuedOn, priceText } from './batch.rules';
import type { BatchDetail } from './carbon.api';
import { AVAILABILITY_LABEL, AVAILABLE_UNIT, ISSUED } from './carbon.copy';
import { SerialRange } from './carbon.parts';
import { IssuanceTx } from './certificate.parts';

const SMALL_ICON = 12;
const PIN_ICON = 14;
const BUY_ICON = 22;
const NOTE_ICON = 16;
const COIN_SIZE = { cx: 30, cy: 28, r: 22 };
const SEAL_DOTS = 12;
const SEAL_RADIUS = 17;
const SEAL_KEYS = Array.from({ length: SEAL_DOTS }, (_item, dot) => dot);

/** The campaign the batch came from, the credit art beside it. */
export function Provenance({ batch }: { batch: BatchDetail }) {
  const { campaign } = batch;

  return (
    <div className="cb-provenance">
      <div>
        {batch.label === 'issued' && (
          <span className="cb-issued">
            <Icon name="check" size={SMALL_ICON} />
            {ISSUED}
          </span>
        )}
        <h2 className="wrap-any">
          <Link to={`/campaigns/${campaign.address}`}>{campaign.title}</Link>
        </h2>
        <span className="location wrap-any">
          <Icon name="pin" size={PIN_ICON} />
          {campaign.region}
        </span>
        <span className="cb-prov-meta wrap-any">
          {provenanceMeta(batch.registry, batch.vintage, campaign.species.name)}
        </span>
      </div>
      <div className="cb-prov-art">
        <CreditArt batch={batch} />
      </div>
    </div>
  );
}

function RegistrySeal() {
  return (
    <svg className="cb-cert-seal" viewBox="-30 -30 60 60" aria-hidden="true">
      <g className="ba-rosette">
        {SEAL_KEYS.map((dot) => (
          <circle
            key={dot}
            cx={Math.cos((dot * Math.PI) / (SEAL_DOTS / 2)) * SEAL_RADIUS}
            cy={Math.sin((dot * Math.PI) / (SEAL_DOTS / 2)) * SEAL_RADIUS}
            r="5"
            fill="#2E9E5B"
          />
        ))}
        <circle r="17" fill="#2E9E5B" />
        <circle r="12.5" fill="none" stroke="#bfe5c9" strokeDasharray="2 2" />
      </g>
      <path
        d="M-6 0l4 4 8-9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "Batch provenance": the registry record, five facts and the serial range. */
export function BatchRecord({ batch }: { batch: BatchDetail }) {
  const rows: [string, ReactNode][] = [
    ['Vintage', batch.vintage],
    ['Species', batch.campaign.species.name],
    ['Campaign', batch.campaign.title],
    [ISSUED_ON, issuedOn(batch.issuedAt)],
    ['Issuance transaction', <IssuanceTx key="issuance" issuedTx={batch.issuedTx} />],
  ];

  return (
    <section className="cb-record">
      <h3>{RECORD_TITLE}</h3>
      <div className="cb-cert">
        <div className="cb-cert-head">
          <div>
            <span className="eyebrow">{RECORD_EYEBROW}</span>
            <strong>{batch.registry}</strong>
          </div>
          <RegistrySeal />
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

/** D08's panel, read side: what the batch costs and what is left; the controls are off (F2b). */
export function BuyPanel({ batch }: { batch: BatchDetail }) {
  const available = batch.availability === 'available';

  return (
    <aside className="cb-buy">
      <div className="cb-buy-heading">
        <h2>{BUY_TITLE}</h2>
        <Icon name="wallet" size={BUY_ICON} />
      </div>
      <span className="eyebrow">{BUY_EYEBROW}</span>
      <div className="cb-buy-price">
        <svg className="cb-buy-coin" viewBox="0 0 60 60" aria-hidden="true">
          <FacetCoin {...COIN_SIZE} id={`buy-${batch.batchId}`} />
        </svg>
        <strong>{priceText(batch.usdcPerTonne)}</strong>
        <span>{PER_TONNE}</span>
      </div>
      <form noValidate>
        <label className="cb-quantity" htmlFor="credit-quantity">
          {AMOUNT_LABEL}
          <div>
            <input id="credit-quantity" inputMode="decimal" defaultValue="" disabled />
            <button type="button" disabled>
              {MAX}
            </button>
          </div>
        </label>
        <span className="cb-inventory">
          {tonnes(batch.inventoryAmount)} {AVAILABLE_UNIT}
        </span>
        <div className="cb-quote">
          <span>{TOTAL}</span>
          <strong>
            {NO_VALUE} <small>{USDC}</small>
          </strong>
        </div>
        <p className="cb-gas-note">{GAS_NOTE}</p>
        <Button icon="arrow" disabled>
          {available ? BUY_TITLE : AVAILABILITY_LABEL[batch.availability]}
        </Button>
      </form>
      <div className="cb-buy-note">
        <Icon name="leaf" size={NOTE_ICON} />
        <span>{BUY_NOTE}</span>
      </div>
    </aside>
  );
}
