// The "Record status" panel (s09-certificate.md §1): the two statuses, the record id and the three things a visitor
// can do with the record — copy its link, print it, follow it to the batch or the campaign. It changes nothing (FR-237).
import { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link } from 'react-router';
import { useToast } from '../../app/shell/toast-context';
import { Icon } from '../../shared/art/Icon';
import { localDateLong } from '../../shared/format/datetime';
import { Button } from '../../shared/ui/Button';
import type { Retirement } from './certificate.api';
import {
  CAMPAIGN,
  COPY_FAILED,
  COPY_LINK,
  LINK_COPIED,
  ON_CHAIN,
  PANEL_EYEBROW,
  PANEL_NOTE,
  PANEL_TITLE,
  PRINT,
  RECORD_ID,
  STEP_REGISTRY,
  batchLink,
  confirmedOn,
  registryLine,
} from './certificate.copy';

const HEADING_ICON = 22;
const ROW_ICON = 16;
const LINK_ICON = 14;
const COPIED_MS = 1800;

/** FR-237 "about 2 s": the button says "Link copied" for 1.8 s, a timer cleared if the page goes first. */
function useCopied() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  return [copied, setCopied] as const;
}

export function RecordStatusPanel({ retirement }: { retirement: Retirement }) {
  const { batch, campaign, registryRetirement } = retirement;
  const { notify } = useToast();
  const [copied, setCopied] = useCopied();
  const done = registryRetirement.status === 'done';

  // a refused or missing clipboard is advisory: the link stays in the address bar, so an error toast (state 10)
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      notify(COPY_FAILED, true);
    }
  };

  return (
    <aside className="cb-buy rc-panel">
      <div className="cb-buy-heading">
        <h2>{PANEL_TITLE}</h2>
        <Icon name="check" size={HEADING_ICON} />
      </div>
      <span className="eyebrow">{PANEL_EYEBROW}</span>
      <ul className="rc-status">
        <li className="done">
          <Icon name="check" size={ROW_ICON} />
          <div>
            <strong>{ON_CHAIN}</strong>
            <span>{confirmedOn(localDateLong(retirement.retiredAt))}</span>
          </div>
        </li>
        <li className={done ? 'done' : 'now'}>
          {done ? <Icon name="check" size={ROW_ICON} /> : <i />}
          <div>
            <strong>{STEP_REGISTRY}</strong>
            <span>
              {registryLine(
                registryRetirement.status,
                batch.registry,
                registryRetirement.reference,
              )}
            </span>
          </div>
        </li>
      </ul>
      <div className="rc-id">
        <span>{RECORD_ID}</span>
        <code>{retirement.retirementId}</code>
      </div>
      <Button icon={copied ? 'check' : 'copy'} onClick={() => void copy()}>
        <span aria-live="polite">{copied ? LINK_COPIED : COPY_LINK}</span>
      </Button>
      <Button variant="outline" icon="arrow" onClick={() => window.print()}>
        {PRINT}
      </Button>
      <div className="rc-links">
        <Link className="text-button" to={`/carbon/${batch.batchId}`}>
          {batchLink(batch.batchId)}
          <Icon name="arrow" size={LINK_ICON} />
        </Link>
        <Link className="text-button" to={`/campaigns/${campaign.address}`}>
          {CAMPAIGN}
          <Icon name="arrow" size={LINK_ICON} />
        </Link>
      </div>
      <div className="cb-buy-note">
        <Icon name="leaf" size={ROW_ICON} />
        <span>{PANEL_NOTE}</span>
      </div>
    </aside>
  );
}
