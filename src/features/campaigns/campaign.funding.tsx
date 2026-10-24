// S04's funding panel (s04-campaign.md §1 FundingPanel): ring, raised amount, dates, the amount chips with their
// preview, the call to action (or why there is none), the contract line, the impact-report link.
import { useEffect, useState, type CSSProperties } from 'react';
import { Icon, type IconName } from '../../shared/art/Icon';
import { Logo } from '../../shared/art/Logo';
import { number } from '../../shared/format/number';
import { shortAddress } from '../../shared/format/address';
import { ArrowLink } from '../../shared/ui/ArrowLink';
import { useStickyFit } from '../../shared/ui/useStickyFit';
import type { CampaignDetail, Viewer } from './campaigns.api';
import {
  AMOUNT_GROUP,
  CLAIM_DEADLINE,
  CONTRACT_LABEL,
  COPY_ADDRESS,
  DEADLINE_PASSED,
  DETAIL_NOTE,
  ENDED_LINE,
  FULL_ADDRESS,
  FUNDED,
  FUNDING_DEADLINE,
  IMPACT_REPORT,
  PLANTING_PROGRESS,
  PREVIEW_LABEL,
  SLOTS_PLANTED,
  TRY_AMOUNT,
  USDC,
  VERIFIED,
  daysLeft,
  plantedOf,
  previewShare,
  previewTrees,
  raisedOf,
} from './campaigns.copy';
import {
  AMOUNT_CHIPS,
  ctaLabel,
  deadlinesOf,
  instantTitle,
  litTrees,
  previewFor,
  type Deadline,
} from './campaign.rules';
import { percentOf, usdc } from './campaigns.rules';

const COUNT_MS = 1200;
const PERMILLE = 1000;
const CUBIC = 3;
const RING_SIZE = 128;
const RING_CENTRE = 64;
const RING_RADIUS = 52;
const PERCENT = 100;
const SMALL_ICON = 13;
const BUTTON_ICON = 18;
const COPY_ICON = 14;
const NOTE_LOGO = 20;
const PANEL_TOP = 104;
const PANEL_GAP = 24;
const TREE_ICONS = 25;
const TREE_PHASE_STEP = 0.12;
const TREE_PHASE_CYCLE = 13;
const TREE_ICON = 15;
const TREE_KEYS = Array.from({ length: TREE_ICONS }, (_tree, index) => index);

/** Counts from 0 to `target` once (the page-load moment) in whole permille steps: bigint, never a float amount. */
export function useCountUp(target: bigint, still: boolean): bigint {
  const [eased, setEased] = useState(0);

  useEffect(() => {
    if (still) {
      return undefined;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const done = Math.min(1, (now - start) / COUNT_MS);

      setEased(Math.round(PERMILLE * (1 - (1 - done) ** CUBIC)));

      if (done < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, still]);

  return still ? target : (target * BigInt(eased)) / BigInt(PERMILLE);
}

/** Funding ring: fills to the funded share once on load. */
function Ring({ percent, still }: { percent: number; still: boolean }) {
  const [shown, setShown] = useState(still ? percent : 0);
  const length = 2 * Math.PI * RING_RADIUS;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(percent));

    return () => cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <svg className="funding-ring" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden="true">
      <circle cx={RING_CENTRE} cy={RING_CENTRE} r={RING_RADIUS} className="ring-track" />
      <circle
        cx={RING_CENTRE}
        cy={RING_CENTRE}
        r={RING_RADIUS}
        className="ring-fill"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - Math.min(PERCENT, shown) / PERCENT)}
      />
    </svg>
  );
}

function FundingHead({ campaign, still }: { campaign: CampaignDetail; still: boolean }) {
  const raised = useCountUp(BigInt(campaign.fundedAmount), still);
  const percent = percentOf(campaign.progressBps);

  return (
    <div className="funding-head">
      <div className="ring-block">
        <Ring percent={percent} still={still} />
        <div className="ring-label">
          <strong>{percent}%</strong>
          <span>{FUNDED}</span>
        </div>
      </div>
      <div className="large-amount">
        {usdc(raised)}
        <span>{USDC}</span>
      </div>
      <div className="funding-summary">
        <span>{raisedOf(usdc(campaign.fundingTarget))}</span>
        {campaign.status === 'funding' && (
          <span className="days-chip">
            <Icon name="clock" size={SMALL_ICON} />
            {campaign.daysLeft === null ? DEADLINE_PASSED : daysLeft(campaign.daysLeft)}
          </span>
        )}
      </div>
    </div>
  );
}

/** P-14: the date in the viewer's zone; the instant, with its zone named, on the `<time>` title. */
function When({ deadline }: { deadline: Deadline }) {
  return deadline.instant === null ? (
    deadline.text
  ) : (
    <time dateTime={deadline.instant} title={instantTitle(deadline.instant)}>
      {deadline.text}
    </time>
  );
}

function FundingDates({ campaign, now }: { campaign: CampaignDetail; now: number }) {
  const dates = deadlinesOf(campaign, now);

  return (
    <dl className="funding-dates">
      <div>
        <dt>{FUNDING_DEADLINE}</dt>
        <dd>
          <When deadline={dates.funding} />
        </dd>
      </div>
      <div>
        <dt>{CLAIM_DEADLINE}</dt>
        <dd>
          <When deadline={dates.claim} />
        </dd>
      </div>
    </dl>
  );
}

type PreviewProps = {
  campaign: CampaignDetail;
  amount: number;
  onAmount: (amount: number) => void;
};

function Preview({ campaign, amount, onAmount }: PreviewProps) {
  const funding = campaign.status === 'funding';
  const preview = previewFor(amount, campaign);
  const lit = litTrees(campaign, preview.trees);
  const { planted } = campaign.slots;

  return (
    <section
      className="contribution-preview"
      aria-label={funding ? PREVIEW_LABEL : PLANTING_PROGRESS}
    >
      {funding ? (
        <>
          <span className="cp-label">
            {TRY_AMOUNT} <small>{USDC}</small>
          </span>
          <div className="cp-chips" role="group" aria-label={AMOUNT_GROUP}>
            {AMOUNT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                aria-pressed={chip === amount}
                onClick={() => onAmount(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
          <p className="cp-result" aria-live="polite">
            <strong>{previewTrees(preview.trees)}</strong>
            <span>{previewShare(usdc(preview.share))}</span>
          </p>
        </>
      ) : (
        <>
          <span className="cp-label">{SLOTS_PLANTED}</span>
          <p className="cp-result">
            <strong>{plantedOf(number(planted), number(campaign.treeTarget))}</strong>
            <span>{VERIFIED}</span>
          </p>
        </>
      )}
      <div className="cp-trees" aria-hidden="true">
        {TREE_KEYS.map((tree) => (
          <Icon
            key={tree}
            name="tree"
            size={TREE_ICON}
            className={tree < lit ? 'on' : ''}
            style={
              { '--phase': `${(tree % TREE_PHASE_CYCLE) * TREE_PHASE_STEP}s` } as CSSProperties
            }
          />
        ))}
      </div>
    </section>
  );
}

const ENDED_ICON: Record<CampaignDetail['status'], IconName> = {
  funding: 'clock',
  active: 'check',
  refunding: 'retry',
  completed: 'check',
};

type Props = {
  campaign: CampaignDetail;
  viewer: Viewer | null;
  amount: number;
  still: boolean;
  now: number;
  onAmount: (amount: number) => void;
  /** The button of §3.2: sign in, or scroll to the actions. */
  onCta: () => void;
  onCopy: () => void;
};

export function FundingPanel({
  campaign,
  viewer,
  amount,
  still,
  now,
  onAmount,
  onCta,
  onCopy,
}: Props) {
  const ref = useStickyFit<HTMLElement>({
    roomVar: '--panel-room',
    top: PANEL_TOP,
    gap: PANEL_GAP,
  });
  const open = campaign.status === 'funding' && !campaign.fundingDeadlinePassed;

  return (
    <aside className="funding-panel" ref={ref}>
      <FundingHead campaign={campaign} still={still} />
      <FundingDates campaign={campaign} now={now} />
      <Preview campaign={campaign} amount={amount} onAmount={onAmount} />
      {open ? (
        <button type="button" className="button primary contribute" onClick={onCta}>
          {ctaLabel(viewer, amount)}
          <Icon name="arrow" size={BUTTON_ICON} />
        </button>
      ) : (
        <div className="funding-ended">
          <Icon name={ENDED_ICON[campaign.status]} size={BUTTON_ICON} />
          {ENDED_LINE[campaign.status]}
        </div>
      )}
      <div className="contract-line">
        <span>{CONTRACT_LABEL}</span>
        <button type="button" className="copy-button" onClick={onCopy} title={COPY_ADDRESS}>
          {shortAddress(campaign.address)}
          <Icon name="copy" size={COPY_ICON} />
        </button>
      </div>
      <details className="full-address">
        <summary>{FULL_ADDRESS}</summary>
        <code>{campaign.address}</code>
      </details>
      <ArrowLink className="button outline" to={`/campaigns/${campaign.address}/report`}>
        {IMPACT_REPORT}
      </ArrowLink>
      <div className="detail-note">
        <Logo size={NOTE_LOGO} />
        <span>{DETAIL_NOTE}</span>
      </div>
    </aside>
  );
}
