// ADR-014: only public, VITE_-prefixed settings reach the browser. Read lazily, so a missing value fails the first
// screen that needs it with a sentence, not an import of this file in a test.
const DEFAULT_API_URL = '/api/v1';
const DEFAULT_CHAIN_ID = 84532;
const DEFAULT_NETWORK_LABEL = 'Base Sepolia';
const DEFAULT_TIME_UNIT = 2_592_000;

type Config = {
  apiUrl: string;
  privyAppId: string;
  chainId: number;
  networkLabel: string;
  /** The CampaignFactory the wallet creates campaigns on (S14); empty until the deployment is known. */
  campaignFactory: string;
  /** `timeUnit` of a new campaign: a month in production, never a form field (FR-078). */
  timeUnitSeconds: number;
};

type Env = Readonly<Record<string, unknown>>;

const text = (env: Env, name: string): string => {
  const value = env[name];

  return typeof value === 'string' ? value.trim() : '';
};

/** Validates the `VITE_*` values; throws a sentence naming the one to fix. */
export const readConfig = (env: Env): Config => {
  const privyAppId = text(env, 'VITE_PRIVY_APP_ID');

  if (privyAppId === '') {
    throw new Error(
      'VITE_PRIVY_APP_ID is not set. Copy .env.example to .env.local and fill it in.',
    );
  }

  const chainId =
    text(env, 'VITE_CHAIN_ID') === '' ? DEFAULT_CHAIN_ID : Number(text(env, 'VITE_CHAIN_ID'));

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error('VITE_CHAIN_ID must be a positive whole number, e.g. 84532.');
  }

  return {
    apiUrl: text(env, 'VITE_API_URL') || DEFAULT_API_URL,
    privyAppId,
    chainId,
    networkLabel: text(env, 'VITE_NETWORK_LABEL') || DEFAULT_NETWORK_LABEL,
    campaignFactory: text(env, 'VITE_CAMPAIGN_FACTORY_ADDRESS'),
    timeUnitSeconds: Number(text(env, 'VITE_TIME_UNIT_SECONDS') || DEFAULT_TIME_UNIT),
  };
};

let current: Config | undefined;

/** The browser build's settings, read once. */
export const config = (): Config => (current ??= readConfig(import.meta.env));
