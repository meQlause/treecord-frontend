// Every sentence S22 (this device, with D02 Register and D03 Revoke) shows. Verbatim from the mockup (planter-pages.jsx
// :214-336), the SRS or error-handling §4; a COPY id with no approved text is a lorem placeholder (conventions §9).

export const DEVICE_EYEBROW = 'PLANTER WORKSPACE';

export const DEVICE_LINE = 'Signed on';

export const DEVICE_EM = 'this device.';

export const DEVICE_COORD = '08 / THIS DEVICE';

export const PANEL_KEY = 'Signing key';

export const PANEL_PROOF = 'What the key proves';

// ---- the key card ----
export const KEY_READY = 'SIGNING KEY · P-256';

export const KEY_MISSING = 'KEY MISSING ON THIS BROWSER';

export const KEY_NONE = 'NO KEY YET';

export const CARD_READY_LINE = 'NON-EXTRACTABLE · INDEXEDDB';

export const CARD_NONE_LINE = 'REGISTER TO SIGN EVIDENCE';

export const CARD_NONE_ALGORITHM = 'ECDSA P-256 · WEBCRYPTO';

export const CARD_READY = 'READY';

export const DASH = '—';

export const createdOn = (date: string): string => `CREATED ${date}`;

export const keyLabel = (thumbprint: string, label: string): string =>
  `Signing key ${thumbprint} on ${label}`;

export const NO_KEY_LABEL = 'No signing key on this browser';

// ---- facts ----
export const FACT_ALGORITHM = 'Algorithm';

export const ALGORITHM = 'ECDSA P-256 · WebCrypto';

export const FACT_PRIVATE = 'Private key';

export const PRIVATE_HERE = 'IndexedDB · non-extractable';

export const PRIVATE_NONE = 'None on this browser';

export const FACT_KEY_ID = 'Key ID';

export const FACT_LABEL = 'Device label';

export const FACT_HASH = 'Hash';

export const HASH = 'SHA-256 the moment recording stops';

export const FACT_PAYLOAD = 'Payload';

export const PAYLOAD = 'hash, GPS, accuracy, time, tree, kind, tag';

export const FACT_SIGNATURE = 'Signature';

export const SIGNATURE = 'this device’s key, checked by the server';

// ---- D02 register ----
export const LABEL_FIELD = 'Device label';

/** COPY-412 (the rule up front) and COPY-212 (the limit as a rule): lorem until the owner approves them. */
export const LABEL_RULE = 'COPY-412';

export const LABEL_HINT = 'COPY-212';

export const DEFAULT_LABEL = 'This browser';

export const REGISTER = 'Register this device';

export const CREATING = 'Creating key…';

export const REGISTERED = 'This device can now sign evidence';

export const NO_KEY = 'This browser cannot create a signing key. Try another browser.';

export const KEY_LOST =
  'This account lists a registered device, but this browser has no key (site data cleared or another browser). Register again; the old key cannot be recovered.';

export const NOTE_PRIVATE = 'The private key never leaves this browser.';

// ---- D03 revoke ----
export const REVOKE = 'Revoke this device';

export const REVIEW_SUMMARY =
  'The server stops accepting this device’s signatures and the key is deleted from this browser. Evidence it already signed stays valid and is never re-signed.';

export const REVOKED = 'Signing key removed from this browser';

export const CONFIRM = 'Confirm';

export const CANCEL = 'Cancel';

export const CLOSE = 'Close';

export const reviewRegion = (action: string): string => `Review ${action}`;

/** What a refused register or a failed revoke says: a registry or lorem copy id, or a plain sentence. */
export const ERROR_COPY = {
  LIMIT: { copyId: 'COPY-010' },
  ALREADY: { copyId: 'COPY-011' },
  FIELD: { copyId: 'COPY-001' },
  INVALID_JSON: { copyId: 'COPY-002' },
  FAILED: { copyId: 'COPY-214' },
  NO_KEY,
} as const;

export type ErrorKey = keyof typeof ERROR_COPY;

/** COPY-213: the warning before a revoke while recordings signed with this key are queued. */
export const QUEUED_WARNING = 'COPY-213';

// ---- what the key proves ----
export const FLOW_LABEL =
  "Each recording is hashed, the hash is signed with this device's key, the server verifies the signature";

export const FLOW_TITLE = 'FROM RECORDING TO PROOF';

export const FLOW_STEPS = ['VIDEO', 'SHA-256', 'SIGNED', 'VERIFIED'] as const;

export const FLOW_FOOT = 'ONE CHANGED BIT BREAKS IT';

export const FLOW_ACTIVE = 'ACTIVE HERE';

export const FLOW_NEEDS = 'NEEDS A KEY';

export const GO_TO_TREES = 'Go to my trees';

export const NOTE_GPS = 'Fake GPS is still caught later, by consistency and audits.';
