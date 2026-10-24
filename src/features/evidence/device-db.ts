// This phone's own storage (s22-device.md §1, fe-architecture §3): one IndexedDB, `treecord-device`, with the signing key
// record per profile, the original clips and the offline queue of recordings. Native IndexedDB, no library. A store is
// created the first time the database is opened, so every screen of the evidence feature meets the same three stores.
const DATABASE = 'treecord-device';
const VERSION = 1;

export const KEYS = 'keys';

const CLIPS = 'clips';

export const QUEUE = 'queue';

const STORES = [KEYS, CLIPS, QUEUE];

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);

    request.onupgradeneeded = () =>
      STORES.forEach((store) => {
        if (!request.result.objectStoreNames.contains(store)) {
          request.result.createObjectStore(store);
        }
      });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Runs one request on `store` and resolves with its result once the transaction has committed. */
export const inStore = async <T>(
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await open();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, mode);
    const request = run(transaction.objectStore(store));

    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};
