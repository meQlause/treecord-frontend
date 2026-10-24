// docs/error-handling.md §1 (the envelope) and §5 (what a screen does with each class of code).
export type ErrorClass = 'field' | 'blocking' | 'advisory' | 'screen' | 'navigation' | 'retry';

/** The two failures the server never sees: no answer, and no answer in time. Both behave as a read failure. */
export const NETWORK = 'network';

export const TIMEOUT = 'timeout';

const CLASS_OF_CODE: Readonly<Record<string, ErrorClass>> = {
  validation_error: 'field',
  not_enough_slots: 'field',
  planter_cap_exceeded: 'field',
  no_trees: 'field',
  invalid_cursor: 'advisory',
  forbidden_role: 'screen',
  not_found: 'screen',
  invalid_path: 'screen',
  missing_token: 'navigation',
  invalid_token: 'navigation',
  video_not_uploaded: 'retry',
  internal_error: 'retry',
  service_unavailable: 'retry',
  [NETWORK]: 'retry',
  [TIMEOUT]: 'retry',
};

/** Every other code in the registry blocks the action with its own sentence. */
export const classOf = (code: string): ErrorClass => CLASS_OF_CODE[code] ?? 'blocking';

export type ApiErrorInit = {
  code: string;
  message: string;
  status: number;
  details?: unknown;
  requestId?: string;
};

/** The error envelope as a typed error; `code` selects the behaviour (error-handling §5). */
export class ApiError extends Error {
  readonly code: string;

  readonly status: number;

  readonly details: unknown;

  readonly requestId: string | undefined;

  constructor({ code, message, status, details, requestId }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }

  get class(): ErrorClass {
    return classOf(this.code);
  }
}

type Envelope = { error: { code: string; message: string; details?: unknown; requestId?: string } };

const isEnvelope = (body: unknown): body is Envelope => {
  const error = (body as Partial<Envelope> | null)?.error;

  return typeof error?.code === 'string' && typeof error.message === 'string';
};

/** An error response, whatever its body: the envelope when there is one, `internal_error` when there is not. */
export const errorFromResponse = (status: number, body: unknown): ApiError => {
  if (isEnvelope(body)) {
    const { code, message, details, requestId } = body.error;

    return new ApiError({
      code,
      message,
      status,
      ...(details === undefined ? {} : { details }),
      ...(requestId === undefined ? {} : { requestId }),
    });
  }

  return new ApiError({ code: 'internal_error', message: `The server answered ${status}`, status });
};
