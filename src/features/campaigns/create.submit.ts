// "Create campaign" (s14-create-campaign.md §6): metadata (skipped when the stored one is for the same inputs), preflight,
// the wallet, the receipt, the indexing poll. Each step answers with what it made or the stage the page should show; nothing
// is retried by itself, and every failure leaves the inputs as they were.
import { isAddress, zeroAddress, type Address } from 'viem';
import { ApiError } from '../../shared/api/errors';
import { outcomeOf, type Outcome } from '../../shared/chain/errors';
import { settle, type ChainSession } from '../../shared/chain/wallet';
import { saveMetadata, untilIndexed } from './create.api';
import { create, createdAddress, preflight } from './create.chain';
import type { Metadata } from './create.draft';
import {
  configOf,
  inputKey,
  metadataBody,
  validate,
  type Draft,
  type Errors,
} from './create.rules';

export type Stage =
  | 'idle'
  | 'metadata'
  | 'preflight'
  | 'wallet'
  | 'submitted'
  | 'indexing'
  | 'complete'
  | 'rejected'
  | 'failed'
  | 'preflight-failed'
  | 'gas'
  | 'network'
  | 'unavailable'
  | 'invalid-json';

export type Failure = { stage: Stage; errors?: Errors };

export type Context = {
  draft: Draft;
  speciesCodes: readonly string[];
  stored: Metadata | null;
  operator: boolean;
  chainId: number;
  factory: Address;
  timeUnit: number;
  session: (chainId: number) => Promise<ChainSession>;
  setStage: (stage: Stage) => void;
  keep: (metadata: Metadata) => void;
};

const STAGE_OF: Record<Outcome, Stage> = {
  rejected: 'rejected',
  reverted: 'failed',
  insufficientGas: 'gas',
  wrongNetwork: 'network',
  failed: 'failed',
};

/** campaigns.md §4: where a server path lands (`imageUrls.3` is the URLs field); an unmapped path is COPY-001. */
const FIELD_OF: Readonly<Record<string, keyof Draft>> = {
  title: 'title',
  description: 'description',
  speciesCode: 'species',
  regionName: 'region',
  'regionCenter.lat': 'lat',
  'regionCenter.lon': 'lon',
  regionRadiusM: 'radius',
  imageUrls: 'urls',
};

const UNMAPPED = 'COPY-001';

const fieldOf = (path: string): keyof Draft | undefined =>
  FIELD_OF[path.replace(/^imageUrls\.\d+$/u, 'imageUrls')];

/** A refused save as the client's own sentences under the named fields (the field table is the source, error-handling §4). */
const refused = (error: ApiError, { draft, speciesCodes }: Context): Failure => {
  const paths = Array.isArray(error.details)
    ? (error.details as { path?: unknown }[]).map(({ path }) => String(path))
    : [];
  const own = validate(draft, 0, speciesCodes, Date.now());
  const fields = paths.map(fieldOf);
  const errors: Errors = Object.fromEntries(
    fields.flatMap((field) => (field === undefined ? [] : [[field, own[field] ?? '']])),
  );

  return {
    stage: 'idle',
    errors:
      fields.includes(undefined) || fields.length === 0 ? { ...errors, box: UNMAPPED } : errors,
  };
};

const saveFailure = (error: unknown, context: Context): Failure => {
  if (error instanceof ApiError && error.code === 'validation_error') {
    return refused(error, context);
  }

  return {
    stage:
      error instanceof ApiError && error.code === 'invalid_json' ? 'invalid-json' : 'unavailable',
  };
};

/** The saved metadata for these inputs: the stored one when it is for the same body (FR-079), else a new save. */
const metadataStep = async (context: Context): Promise<Metadata | Failure> => {
  const body = metadataBody(context.draft, context.draft.species);
  const key = inputKey(body);

  if (context.stored?.inputKey === key) {
    return context.stored;
  }

  context.setStage('metadata');

  try {
    const metadata = { inputKey: key, ...(await saveMetadata(body)) };

    context.keep(metadata);

    return metadata;
  } catch (error) {
    return saveFailure(error, context);
  }
};

/** The creator is the signer, or for an operator the typed wallet: a bad address is the zero one, which the contract refuses. */
const creatorOf = (draft: Draft, operator: boolean, own: Address): Address => {
  const typed = draft.creator.trim();

  if (!operator) {
    return own;
  }

  return isAddress(typed) ? typed : zeroAddress;
};

const isFailure = (value: object): value is Failure => 'stage' in value;

/** The wallet's clients and the preflight: a refusal here sends nothing (CC-9). */
const preflightStep = async (context: Context, metadata: Metadata) => {
  context.setStage('preflight');

  try {
    const session = await context.session(context.chainId);
    const config = configOf({
      draft: context.draft,
      speciesCode: context.draft.species,
      metadataURI: metadata.metadataURI,
      creator: creatorOf(context.draft, context.operator, session.account),
      timeUnit: context.timeUnit,
    });

    await preflight(session, context.factory, config).catch(() => {
      throw new PreflightError();
    });

    return { session, config };
  } catch (error) {
    return {
      stage: error instanceof PreflightError ? 'preflight-failed' : STAGE_OF[outcomeOf(error)],
    } as Failure;
  }
};

class PreflightError extends Error {}

type Ready = Exclude<Awaited<ReturnType<typeof preflightStep>>, Failure>;

/** Sign, then the receipt by hash as long as it takes: the address of the new campaign. */
const sendStep = async (
  context: Context,
  { session, config }: Ready,
): Promise<Address | Failure> => {
  try {
    context.setStage('wallet');

    const hash = await create(session, context.factory, config);

    context.setStage('submitted');

    return createdAddress(await settle(session, hash)) ?? { stage: 'failed' };
  } catch (error) {
    return { stage: STAGE_OF[outcomeOf(error)] };
  }
};

/** The whole submit; resolves with the new campaign's address once the catalog shows it. */
export const submit = async (context: Context): Promise<Address | Failure> => {
  const metadata = await metadataStep(context);

  if (isFailure(metadata)) {
    return metadata;
  }

  const ready = await preflightStep(context, metadata);

  if (isFailure(ready)) {
    return ready;
  }

  const address = await sendStep(context, ready);

  if (typeof address !== 'string') {
    return address;
  }

  context.setStage('indexing');

  return untilIndexed(address).then(
    () => address,
    (): Failure => ({ stage: 'unavailable' }),
  );
};
