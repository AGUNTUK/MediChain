interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const STORAGE_PREFIX = "medichain_catalog_cache_v1_";

function getFromStorage<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setToStorage<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // Quota management: clear older catalog cache items
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX) && k !== STORAGE_PREFIX + key) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.slice(0, 10).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {}
  }
}

function removeFromStorage(keyPattern: string | RegExp): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        const cleanKey = k.replace(STORAGE_PREFIX, "");
        if (typeof keyPattern === "string" ? cleanKey.includes(keyPattern) : keyPattern.test(cleanKey)) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxEntries = 250; // Cap cache size to prevent unbounded memory growth

  /**
   * Retrieves an item from the cache.
   * If allowStale is true, returns cached data even if expired (great for 0ms initial render).
   */
  get<T>(key: string, allowStale = false): T | null {
    // 1. Check in-memory Map
    let entry = this.cache.get(key);

    // 2. Fallback to localStorage
    if (!entry) {
      const stored = getFromStorage<T>(key);
      if (stored) {
        entry = stored;
        this.cache.set(key, stored);
      }
    }

    if (!entry) return null;

    if (!allowStale && Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Sets an item in both in-memory cache and localStorage with LRU eviction.
   */
  set<T>(key: string, data: T, ttl?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now() + (ttl || this.defaultTTL)
    };

    this.cache.set(key, entry);

    // Persist catalog, product, and category responses to localStorage
    if (key.startsWith("products") || key.startsWith("categories") || key.startsWith("product_")) {
      setToStorage(key, entry);
    }
  }

  /**
   * Removes items matching the key pattern from memory and localStorage.
   */
  invalidate(keyPattern: string | RegExp): void {
    if (typeof keyPattern === "string") {
      for (const key of this.cache.keys()) {
        if (key.includes(keyPattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      for (const key of this.cache.keys()) {
        if (keyPattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
    removeFromStorage(keyPattern);
  }

  /**
   * Clears the entire cache and in-flight promises.
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  }

  /**
   * Stale-While-Revalidate fetch wrapper with persistent storage.
   * If cached data exists (even if stale), returns it INSTANTLY (0ms latency)
   * while revalidating fresh data from the network in the background.
   */
  async swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // 1. Check in-memory or storage cache
    let entry = this.cache.get(key);
    if (!entry) {
      const stored = getFromStorage<T>(key);
      if (stored) {
        entry = stored;
        this.cache.set(key, stored);
      }
    }

    const isStale = !entry || Date.now() > entry.timestamp;

    if (isStale) {
      // In-flight request deduplication
      let fetchPromise = this.inFlight.get(key) as Promise<T> | undefined;

      if (!fetchPromise) {
        fetchPromise = fetcher()
          .then((data) => {
            this.set(key, data, ttl);
            return data;
          })
          .catch((err) => {
            console.warn(`[APICache] SWR background revalidation failed for key "${key}":`, err);
            if (!entry) throw err;
            return entry.data;
          })
          .finally(() => {
            this.inFlight.delete(key);
          });

        this.inFlight.set(key, fetchPromise);
      }

      // If we don't have any cached data at all, we MUST wait for the fetch
      if (!entry) {
        return fetchPromise;
      }
    }

    // Return cached (potentially stale) data instantly
    return entry!.data;
  }
}

export const apiCache = new APICache();
