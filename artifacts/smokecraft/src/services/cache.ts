/**
 * IndexedDB cache service.
 *
 * Stores recommendation results and product lists so the app can serve
 * meaningful content when the network is unavailable.
 *
 * All operations are async and fail silently — cache errors must never
 * disrupt the core user experience.
 */

const DB_NAME    = "smokecraft_cache_v1";
const DB_VERSION = 1;
const STORES     = ["recommendations", "products"] as const;
type StoreName   = (typeof STORES)[number];

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "cacheKey" });
        }
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

/** Write a value to the named store. */
export async function cacheSet<T>(store: StoreName, key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx  = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).put({ cacheKey: key, value, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(req.error);
    });
  } catch {
    // Non-critical — silently swallow
  }
}

/** Read a value from the named store, returning null on miss or error. */
export async function cacheGet<T>(store: StoreName, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise<T | null>((resolve) => {
      const tx  = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve((req.result?.value as T) ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch {
    return null;
  }
}
