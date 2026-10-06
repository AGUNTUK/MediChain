/**
 * Ultra-fast Bounded In-Memory LRU Cache with automatic TTL eviction.
 * 
 * Prevents memory leaks and V8 Garbage Collection pauses by strictly capping
 * the maximum number of items in memory (default: 500 items).
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T = any> {
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;
  private readonly cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 500, defaultTtlMs = 60000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh LRU order (delete & re-insert moves key to the end)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // If key already exists, delete it first to reset insertion order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first) item in Map
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  deletePattern(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxSize: number; hits: number; misses: number; hitRatio: string } {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? ((this.hits / total) * 100).toFixed(1) + "%" : "0.0%";
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio
    };
  }
}
