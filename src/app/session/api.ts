// The one API client of the app (docs/FE/fe-architecture.md §5). It asks the Privy SDK for the access token on every
// request through the bridge below and keeps nothing (D-7, NFR-051).
import { createClient, type RequestOptions } from '../../shared/api/client';
import { config } from './config';

let tokenSource: () => Promise<string | null> = () => Promise.resolve(null);

/** `SessionBridge` hands over Privy's `getAccessToken` once it mounts; until then requests carry no token. */
export const setTokenSource = (source: () => Promise<string | null>): void => {
  tokenSource = source;
};

let client: ReturnType<typeof createClient> | undefined;

/** `api<T>('/me')`: JSON in and out, bearer token from Privy, the error envelope as an `ApiError`. */
export const api = <T>(path: string, options?: RequestOptions): Promise<T> => {
  client ??= createClient({ baseUrl: config().apiUrl, getToken: () => tokenSource() });

  return client<T>(path, options);
};

let publicClient: ReturnType<typeof createClient> | undefined;

/** `api`, but a token is never sent: for the public reads whose endpoint ignores one (carbon.md §1, §5). */
export const publicApi = <T>(path: string, options?: RequestOptions): Promise<T> => {
  publicClient ??= createClient({
    baseUrl: config().apiUrl,
    getToken: () => Promise.resolve(null),
  });

  return publicClient<T>(path, options);
};
