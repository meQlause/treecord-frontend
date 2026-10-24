// D07 Flag tree (s05-tree.md §3.4, §6): the reason is saved through the API, then the contributor's wallet sends
// `TreeRegistry.flag(treeId, reasonHash)`. The flag counts only once the tree reads `flagged` (FR-060): no optimistic UI.
// A saved reason whose wallet step did not go through is `viewer.pendingFlag`; its retry sends the wallet step alone.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Address, Hash, Hex } from 'viem';
import { api } from '../../app/session/api';
import { config } from '../../app/session/config';
import { useSession, type Profile } from '../../app/session/session';
import { useToast } from '../../app/shell/toast-context';
import { ApiError } from '../../shared/api/errors';
import { campaignAbi, treeRegistryAbi } from '../../shared/chain/abis';
import { outcomeOf, type Outcome } from '../../shared/chain/errors';
import {
  actingChainId,
  sendWrite,
  settle,
  useChainSession,
  type ChainSession,
} from '../../shared/chain/wallet';
import { WalletAlert, ACTION_IDS } from '../../shared/chain/wallet.copy';
import { Banner } from '../../shared/ui/Banner';
import { Button } from '../../shared/ui/Button';
import { Field } from '../../shared/ui/Field';
import { Lorem } from '../../shared/ui/Lorem';
import { TxStatus } from '../../shared/ui/TxStatus';
import { WalletAbortError, useWalletTx } from '../../shared/ui/useWalletTx';
import { useDraftText } from '../carbon/draft';
import { useTree, type TreeDetail } from './tree.api';
import * as copy from './tree.copy';
import { REASON_LIMIT, flagDraftKey, reasonOk } from './tree.rules';

const POLL_MS = 2000;
const POLL_TRIES = 60;

const sleep = (millis: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, millis);
  });

/** What a refused or failed save says: a sentence in the review, a field line, or the form going away. */
type Notice = { field?: ReactNode; banner?: ReactNode; refetch?: boolean; walletMissing?: boolean };

const UNAVAILABLE: Notice = { banner: copy.UNAVAILABLE };

const REFUSED: Record<string, Notice> = {
  not_contributor: { banner: <Lorem id={copy.NOT_CONTRIBUTOR_COPY} />, refetch: true },
  tree_not_flaggable: { banner: <Lorem id={copy.NOT_FLAGGABLE_COPY} />, refetch: true },
  wallet_missing: { walletMissing: true, refetch: true },
  invalid_json: { banner: <Lorem id="COPY-002" /> },
};

const firstMessage = (error: ApiError): string | undefined =>
  Array.isArray(error.details) ? (error.details as { message?: string }[])[0]?.message : undefined;

const noticeOf = (error: unknown): Notice => {
  if (!(error instanceof ApiError)) {
    return UNAVAILABLE;
  }

  if (error.code === 'validation_error') {
    return { field: firstMessage(error) ?? <Lorem id="COPY-001" /> };
  }

  return REFUSED[error.code] ?? UNAVAILABLE;
};

type View = { notice: Notice; outcome: Outcome | null; saving: boolean };

const CLEAR: View = { notice: {}, outcome: null, saving: false };

type Hashes = { reasonHash: Hex | null; txHash: Hash | null };

const saveReason = async (treeId: string, reasonText: string): Promise<Hex> => {
  const { flag } = await api<{ flag: { reasonHash: Hex } }>('/flags', {
    method: 'POST',
    body: { treeId, reasonText },
  });

  return flag.reasonHash;
};

/** `TreeRegistry.flag`, on the registry the campaign names. */
const sendFlag = async (
  wallet: ChainSession,
  campaign: string,
  treeId: string,
  reasonHash: Hex,
): Promise<Hash> => {
  const registry = await wallet.publicClient.readContract({
    address: campaign as Address,
    abi: campaignAbi,
    functionName: 'treeRegistry',
  });

  return sendWrite(wallet, {
    address: registry,
    abi: treeRegistryAbi,
    functionName: 'flag',
    args: [BigInt(treeId), reasonHash],
  });
};

/** Re-reads the tree every couple of seconds until it reads `flagged` (NFR-063); false when it never does. */
const untilFlagged = async (
  refetch: () => Promise<{ data: TreeDetail | undefined }>,
): Promise<boolean> => {
  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    if ((await refetch()).data?.tree.status === 'flagged') {
      return true;
    }

    await sleep(POLL_MS);
  }

  return false;
};

/** The state and the steps of one flag attempt; `data` is the tree as the page last read it. */
function useFlag(data: TreeDetail, profile: Profile) {
  const { treeId, campaign } = data.tree;
  const chainId = actingChainId(config().chainId);
  const session = useChainSession();
  const tree = useTree(treeId);
  const { notify } = useToast();
  const draft = useDraftText(flagDraftKey(profile, chainId, treeId));
  const [view, setView] = useState<View>(CLEAR);
  const show = (patch: Partial<View>): void => setView((now) => ({ ...now, ...patch }));
  const held = useRef<Hashes>({ reasonHash: null, txHash: null });
  const pending = data.viewer?.pendingFlag ?? null;

  /** The POST, once: a reason already saved (pending, or by an earlier press) is not saved again. */
  const save = async (): Promise<void> => {
    if (pending !== null || held.current.reasonHash !== null) {
      return;
    }

    show({ saving: true });

    try {
      held.current.reasonHash = await saveReason(treeId, draft.text.trim());
      draft.clear();
      notify(copy.REASON_SAVED);
      void tree.refetch();
    } catch (error) {
      const found = noticeOf(error);

      show({ notice: found });

      if (found.refetch === true) {
        void tree.refetch();
      }

      throw new WalletAbortError(found.refetch === true ? 'idle' : 'confirm');
    } finally {
      show({ saving: false });
    }
  };

  /** The POST, then the wallet. Any failure returns the review with its message. */
  const send = async (): Promise<void> => {
    show({ notice: {}, outcome: null });
    await save();

    try {
      const reasonHash = (pending?.reasonHash ?? held.current.reasonHash) as Hex;

      held.current.txHash = await sendFlag(
        await session(chainId),
        campaign.address,
        treeId,
        reasonHash,
      );
    } catch (error) {
      show({ outcome: outcomeOf(error) });
      throw new WalletAbortError('confirm');
    }
  };

  /** The receipt by hash, then the tree until it reads `flagged`. */
  const index = async (): Promise<void> => {
    try {
      await settle(await session(chainId), held.current.txHash as Hash);

      if (await untilFlagged(tree.refetch)) {
        notify(copy.FLAG_OPENED);
      }
    } catch (error) {
      show({ outcome: outcomeOf(error) });
      throw new WalletAbortError('confirm');
    }
  };

  const flow = useWalletTx({ send, index });

  return { flow, draft, ...view, pending, tree };
}

type Flag = ReturnType<typeof useFlag>;

function Status({ flag }: { flag: Flag }) {
  const { flow, saving, outcome } = flag;
  const lines = {
    confirming: saving ? copy.SAVING : copy.WALLET_LINE,
    indexing: copy.FLAG_SENT,
  };

  return (
    <>
      <TxStatus state={flow.state} lines={lines} />
      {outcome !== null && (
        <Banner tone="error">
          <WalletAlert outcome={outcome} ids={ACTION_IDS} />
        </Banner>
      )}
    </>
  );
}

function Review({ flag }: { flag: Flag }) {
  const { flow, notice } = flag;

  return (
    <div
      className="ws-review"
      role="region"
      aria-label={copy.FLAG_TREE}
      aria-busy={flow.busy || undefined}
    >
      <h3>{copy.FLAG_TREE}</h3>
      <p>{copy.FLAG_SUMMARY}</p>
      {notice.banner !== undefined && <Banner tone="error">{notice.banner}</Banner>}
      <Status flag={flag} />
      <div className="ws-actions">
        <Button
          busy={flow.state === 'confirming'}
          disabled={flow.state !== 'confirm'}
          onClick={() => void flow.confirm()}
        >
          {copy.CONFIRM}
        </Button>
        <Button variant="outline" disabled={flow.busy} onClick={flow.reset}>
          {copy.CANCEL}
        </Button>
      </div>
    </div>
  );
}

function ReasonForm({ flag }: { flag: Flag }) {
  const { draft, flow, notice } = flag;

  return (
    <>
      <Field
        label={
          <>
            {copy.FLAG_REASON} · <Lorem id={copy.FLAG_RULE_COPY} kind="label" />
          </>
        }
        error={notice.field}
      >
        <textarea
          maxLength={REASON_LIMIT}
          value={draft.text}
          disabled={flow.active}
          onChange={(event) => draft.set(event.target.value)}
        />
      </Field>
      {flow.active ? (
        <Review flag={flag} />
      ) : (
        <Button icon="arrow" disabled={!reasonOk(draft.text)} onClick={() => flow.start(false)}>
          {copy.FLAG_TREE}
        </Button>
      )}
    </>
  );
}

/** F-13…F-16: the saved reason's wallet step again, straight from the button (no second POST, FR-060 #2). */
function RetryFlag({ flag }: { flag: Flag }) {
  const { flow } = flag;
  const pressed = useRef(false);

  // the press opens the transaction; it is confirmed on the render that sees it open
  useEffect(() => {
    if (pressed.current && flow.state === 'confirm') {
      pressed.current = false;
      void flow.confirm();
    }
  });

  return (
    <>
      <Status flag={flag} />
      <Button
        icon="arrow"
        busy={flow.busy}
        disabled={flow.active}
        onClick={() => {
          pressed.current = true;
          flow.start(false);
        }}
      >
        <Lorem id={copy.RETRY_FLAG_COPY} kind="label" />
      </Button>
    </>
  );
}

function WalletPending({ retry }: { retry: () => void }) {
  return (
    <Banner tone="callout" action={copy.TRY_AGAIN} onAction={retry}>
      {copy.WALLET_PENDING}
    </Banner>
  );
}

function Body({ data, profile }: { data: TreeDetail; profile: Profile }) {
  const flag = useFlag(data, profile);
  const { notice, pending, flow, tree } = flag;
  const open = ['alive', 'dead'].includes(data.tree.status);

  if (notice.walletMissing === true) {
    return <WalletPending retry={() => void tree.refetch()} />;
  }

  if (pending !== null && open) {
    return <RetryFlag flag={flag} />;
  }

  if (data.viewer?.flag.eligible !== true && !flow.active) {
    return notice.banner === undefined ? null : <Banner tone="error">{notice.banner}</Banner>;
  }

  return <ReasonForm flag={flag} />;
}

/** The D07 form (F-4…F-20): nothing for anyone who may not flag. */
export function FlagForm({ data }: { data: TreeDetail }) {
  const session = useSession();

  return session.phase === 'ready' && data.viewer !== null ? (
    <Body data={data} profile={session.profile} />
  ) : null;
}
