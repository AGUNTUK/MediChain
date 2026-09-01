import { test, expect } from "@playwright/test";
import { LRUCache } from "../src/lib/lruCache";

test.describe("High-Performance Bounded LRU Cache Unit Tests", () => {
  test("should store and retrieve items within TTL", () => {
    const cache = new LRUCache<string>(10, 5000);
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
    expect(cache.size()).toBe(1);
  });

  test("should evict oldest item when maxSize is reached", () => {
    const cache = new LRUCache<string>(3, 5000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    expect(cache.size()).toBe(3);

    // Adding 4th item must evict 'a' (oldest)
    cache.set("d", "4");
    expect(cache.size()).toBe(3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
  });

  test("should update LRU order on get access", () => {
    const cache = new LRUCache<string>(3, 5000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // Access 'a' so 'b' becomes the oldest
    expect(cache.get("a")).toBe("1");

    // Add 'd' -> 'b' should be evicted, 'a' should remain
    cache.set("d", "4");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
  });

  test("should expire items when TTL passes", async () => {
    const cache = new LRUCache<string>(10, 50); // 50ms TTL
    cache.set("expiring", "data");
    expect(cache.get("expiring")).toBe("data");

    await new Promise(resolve => setTimeout(resolve, 60));
    expect(cache.get("expiring")).toBeUndefined();
  });

  test("should clear and delete by pattern", () => {
    const cache = new LRUCache<string>(10, 5000);
    cache.set("products_page_1", "data1");
    cache.set("products_page_2", "data2");
    cache.set("categories", "cats");

    cache.deletePattern("products_");
    expect(cache.get("products_page_1")).toBeUndefined();
    expect(cache.get("products_page_2")).toBeUndefined();
    expect(cache.get("categories")).toBe("cats");

    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
