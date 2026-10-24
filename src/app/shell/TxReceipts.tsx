import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Icon, type IconName } from '../../shared/art/Icon';
import { dismissTx, useTxFeed, type TxEntry } from '../../shared/chain/tx-feed';
import { shortAddress } from '../../shared/format/address';
import { txUrl } from '../../shared/format/explorer';
import { popMotion } from '../../shared/motion/presets';
import { SHELL_COPY } from './shell.copy';

// The receipt of every transaction this tab signs: Privy's dialog shows no hash, so each one gets a card with its
// status, hash (copyable), block and explorer link. Fed by shared/chain/tx-feed; the shell draws it once, beside the toast.
const ICON_SIZE = 16;
const COPIED_MS = 1500;
const STATUS: Record<TxEntry['status'], { icon: IconName; title: string }> = {
  pending: { icon: 'clock', title: SHELL_COPY.tx.pending },
  confirmed: { icon: 'check', title: SHELL_COPY.tx.confirmed },
  reverted: { icon: 'warning', title: SHELL_COPY.tx.reverted },
};

/** `createCampaign` → "Create campaign": the contract function, in words. */
const actionWords = (action: string): string => {
  const words = action.replace(/(?<lower>[a-z])(?=[A-Z])/gu, '$<lower> ').toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

function CopyHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard?.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    });
  };

  return (
    <button className="tx-copy" type="button" onClick={copy} aria-label={SHELL_COPY.tx.copy}>
      <code>{shortAddress(hash)}</code>
      <Icon name={copied ? 'check' : 'copy'} size={ICON_SIZE} />
      {copied && <span className="sr-only">{SHELL_COPY.tx.copied}</span>}
    </button>
  );
}

function Receipt({ entry }: { entry: TxEntry }) {
  const { icon, title } = STATUS[entry.status];
  const link = txUrl(entry.hash);

  return (
    <motion.li className={`tx-receipt tx-${entry.status}`} layout {...popMotion}>
      <span className="tx-icon">
        <Icon name={icon} size={ICON_SIZE} />
      </span>
      <div className="tx-body">
        <strong>{title}</strong>
        {entry.action !== '' && <span className="tx-action">{actionWords(entry.action)}</span>}
        <dl>
          <dt>{SHELL_COPY.tx.hash}</dt>
          <dd>
            <CopyHash hash={entry.hash} />
          </dd>
          {entry.block !== null && (
            <>
              <dt>{SHELL_COPY.tx.block}</dt>
              <dd>{entry.block}</dd>
            </>
          )}
        </dl>
        {link !== null && (
          <a className="tx-link" href={link} target="_blank" rel="noopener noreferrer">
            {SHELL_COPY.tx.explorer}
            <Icon name="arrow" size={ICON_SIZE} />
          </a>
        )}
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label={SHELL_COPY.tx.dismiss}
        onClick={() => dismissTx(entry.hash)}
      >
        <Icon name="close" size={ICON_SIZE} />
      </button>
    </motion.li>
  );
}

export function TxReceipts() {
  const entries = useTxFeed();

  return (
    <ul className="tx-receipts" aria-label={SHELL_COPY.tx.region} aria-live="polite">
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <Receipt key={entry.hash} entry={entry} />
        ))}
      </AnimatePresence>
    </ul>
  );
}
