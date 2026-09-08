interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxEntries = 250; // Cap cache size to prevent unbounded memory growth (J2)

  /**
   * Retrieves an item from the cache.
   * Enforces TTL expiration (J1) - returns null if expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Sets an item in the cache with LRU entry eviction when capacity is exceeded (J2).
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
    this.cache.set(key, { data, timestamp: Date.now() + (ttl || this.defaultTTL) });
  }

  /**
   * Removes items matching the key pattern (string includes or regex).
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
  }

  /**
   * Clears the entire cache and in-flight promises.
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  /**
   * Stale-While-Revalidate fetch wrapper.
   * Features in-flight promise deduplication (thundering herd protection),
   * safe background error handling without unhandled rejections,
   * and bounded memory footprint (J2).
   */
  async swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const entry = this.cache.get(key);
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
