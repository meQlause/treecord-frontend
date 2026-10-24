// S24's pieces (s24-audit-session.md §1): a sample card, D13 Close session, and the rail (findings tally, session record).
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, useNavigate } from 'react-router';
import { useAccountKey } from '../../app/session/use-account-key';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/art/Icon';
import type { GlyphKind } from '../../shared/art/Glyph';
import { TreeCardArt } from '../../shared/art/TreeCardArt';
import { localDateTime } from '../../shared/format/datetime';
import { cardMotion } from '../../shared/motion/presets';
import { Banner } from '../../shared/ui/Banner';
import { Facts } from '../../shared/ui/Facts';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { ReviewAction } from '../../shared/ui/ReviewAction';
import { StockCard } from '../../shared/ui/StockCard';
import { label as statusLabel } from '../trees/tree.rules';
import { RailPanel, useAuditDraft } from './audit.common';
import { refreshSession, useCloseSession, type AuditSession, type Sample } from './audit.api';
import * as copy from './audit.copy';
import {
  cardLinkLabel,
  challengeLabel,
  missingText,
  pendingOf,
  shortHash,
  shortId,
} from './audit.rules';

const ICON = 14;
const BIG_ICON = 17;
const SMALL_ICON = 16;
const LINK_ICON = 14;
const SUMMARY_MAX = 5000;

/** One frozen sample, in position order: tree, its finding, the latest challenge, the way into S25. */
export function SampleCard({
  session,
  sample,
  index,
}: {
  session: AuditSession;
  sample: Sample;
  index: number;
}) {
  const { treeId, finding, challenge, notes } = sample;
  const to = `/app/audit/${session.id}/trees/${treeId}`;
  const tone = finding === null ? 'funding' : copy.FINDING_TONE[finding];
  const badge = finding === null ? copy.NO_FINDING_YET : copy.FINDING_LABEL[finding];
  const line =
    challenge === null
      ? `${statusLabel(sample.treeStatus)} · ${copy.NO_CHALLENGE}`
      : copy.challengeLine(challenge.code, challengeLabel(challenge).toLowerCase());

  return (
    <motion.article className="campaign-card" {...cardMotion(index)}>
      <Link className="card-art-link" to={to} tabIndex={-1} aria-hidden="true">
        <TreeCardArt kind={sample.treeStatus as GlyphKind} milestones={[]} seed={Number(treeId)} />
      </Link>
      <div className="art-tags">
        <span className={`badge ${tone}`}>
          <span />
          {badge}
        </span>
        <span className="species-label">{copy.position(index)}</span>
      </div>
      <div className="card-body">
        <span className="location">
          <Icon name="pin" size={ICON} />
          {session.campaign.regionName}
        </span>
        <h2>
          <Link to={to}>{copy.treeNumber(treeId)}</Link>
        </h2>
        <div className="tree-target">
          <Icon name="flag" size={BIG_ICON} />
          {line}
        </div>
        <div className="card-meta">
          <span>{notes ?? copy.OPEN_THE_EVIDENCE}</span>
        </div>
        <Link className="card-bottom" to={to}>
          <span>{cardLinkLabel(sample)}</span>
          <span className="arrow-circle">
            <Icon name="arrow" size={SMALL_ICON} />
          </span>
        </Link>
      </div>
    </motion.article>
  );
}

type Problem = { missing?: string; summary?: ReactNode; review?: ReactNode };

const problemOf = (error: unknown): Problem => {
  if (error instanceof ApiError && error.code === 'findings_incomplete') {
    const missing = (error.details as { missing?: string[] } | undefined)?.missing ?? [];

    return { missing: missing.map((id) => `#${id}`).join(', ') };
  }

  if (error instanceof ApiError && error.code === 'validation_error') {
    return { summary: <Lorem id={copy.COPY_VALIDATION} /> };
  }

  return { review: copy.UNAVAILABLE };
};

/** D13: the missing list or the closing sentence, the private summary, and the review that closes for good. */
export function CloseSession({ session, online }: { session: AuditSession; online: boolean }) {
  const close = useCloseSession(session.id);
  const client = useQueryClient();
  const { key } = useAccountKey();
  const navigate = useNavigate();
  const draft = useAuditDraft(`${session.id}:summary`);
  const [problem, setProblem] = useState<Problem>({});
  const pending = pendingOf(session.samples);
  const missing = problem.missing ?? missingText(session.samples);

  const confirm = async (): Promise<boolean> => {
    setProblem({});

    try {
      await close.mutateAsync(draft.text.trim());
      draft.clear();
      void navigate(`/app/audit/${session.id}/report`);

      return true;
    } catch (error) {
      const found = problemOf(error);

      setProblem(found);

      if (found.missing !== undefined) {
        refreshSession(client, key, session.id);
      }

      return false;
    }
  };

  return (
    <section className="cb-record">
      <h3>{copy.CLOSE_THE_SESSION}</h3>
      <div className="cb-cert">
        {problem.missing === undefined ? (
          <p className="pl-lead">
            {pending.length > 0 ? copy.missingLine(missing) : copy.EVERY_TREE_HAS_FINDING}
          </p>
        ) : (
          <Banner tone="error">{copy.missingLine(problem.missing)}</Banner>
        )}
        <Field label={copy.SUMMARY_LABEL} hint={copy.PRIVATE_HINT} error={problem.summary}>
          <textarea
            maxLength={SUMMARY_MAX}
            readOnly={close.isPending}
            value={draft.text}
            onChange={(event) => draft.set(event.target.value)}
          />
        </Field>
        <ReviewAction
          label={copy.CLOSE_SESSION}
          disabled={pending.length > 0 || !online}
          copy={copy.CLOSE_REVIEW}
          target={[
            [copy.SESSION_FACT, `${session.campaign.title} · ${shortId(session.id).toLowerCase()}`],
          ]}
          {...(problem.review === undefined ? {} : { error: problem.review })}
          onConfirm={confirm}
        />
      </div>
    </section>
  );
}

const code = (text: string): ReactNode => <code className="ev-code">{text}</code>;

/** The rail: the findings tally above, the session record with its links below. */
export function SessionRail({ session }: { session: AuditSession }) {
  const pending = pendingOf(session.samples);
  const closed = session.status === 'closed';
  const size = session.sampleSize;
  const done = session.findingsRecorded;

  return (
    <>
      <StockCard
        label={copy.RAIL_FINDINGS}
        icon="check"
        caption={copy.RAIL_RECORDED}
        value={`${done}/${size}`}
        unit={copy.RAIL_TREES}
        sub={{
          label: copy.RAIL_CHALLENGES,
          value: session.challengesIssued,
          unit: copy.RAIL_ISSUED,
        }}
        share={done / Math.max(1, size)}
        shareLabel={closed ? copy.STEP_CLOSED : copy.READY_TO_CLOSE}
        shareNote={
          pending.length > 0 ? copy.stillToReview(pending.length) : copy.EVERY_TREE_REVIEWED
        }
        note={copy.FINDINGS_ARE_YOURS}
      />
      <RailPanel
        title={copy.SESSION_RECORD}
        icon="carbon"
        eyebrow={session.campaign.title.toUpperCase()}
        note={copy.ANYONE_CAN_RECOMPUTE}
      >
        <Facts
          rows={[
            [copy.R_OPENED, localDateTime(session.createdAt)],
            [copy.R_SEED_BLOCK, `#${Number(session.seed.blockNumber).toLocaleString('en-US')}`],
            [copy.R_BLOCK_HASH, code(shortHash(session.seed.blockHash))],
            [copy.R_POPULATION, copy.populationOf(session.population.length)],
            [
              copy.R_REPORT_HASH,
              session.reportHash === null ? copy.ON_CLOSE : code(shortHash(session.reportHash)),
            ],
          ]}
        />
        <div className="pl-actions">
          <Link className="button outline" to={`/audit/${session.id}/reproduce`}>
            {copy.REPRODUCE}
            <Icon name="retry" size={SMALL_ICON} />
          </Link>
          {closed && (
            <Link className="button primary" to={`/app/audit/${session.id}/report`}>
              {copy.REPORT}
              <Icon name="arrow" size={SMALL_ICON} />
            </Link>
          )}
        </div>
        <Link className="text-button pl-link" to="/app/audit">
          {copy.ALL_SESSIONS}
          <Icon name="arrow" size={LINK_ICON} />
        </Link>
      </RailPanel>
    </>
  );
}
