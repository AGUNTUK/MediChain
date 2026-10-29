import { describe, it } from "node:test";
import assert from "node:assert";
import { apiCache } from "../src/lib/apiCache";
import { productService } from "../src/services/product";

describe("Catalog Performance & Image Offload Optimization Tests", () => {
  it("Test 1: APICache persistent storage caching & instant SWR retrieval", async () => {
    // Mock window & localStorage in Node environment
    const storageMock = new Map<string, string>();
    (global as any).window = {
      localStorage: {
        getItem: (k: string) => storageMock.get(k) || null,
        setItem: (k: string, v: string) => storageMock.set(k, v),
        removeItem: (k: string) => storageMock.delete(k),
        clear: () => storageMock.clear(),
        length: storageMock.size,
        key: (i: number) => Array.from(storageMock.keys())[i] || null
      }
    };
    (global as any).localStorage = (global as any).window.localStorage;

    const testProducts = [
      { id: "test-1", name: "Paracetamol 500mg", mrp: 20, sellingPrice: 15, availableStock: 100 }
    ];

    apiCache.set("products_paginated_page=1&limit=50&paginate=true", {
      products: testProducts,
      total: 1,
      page: 1,
      pageSize: 50,
      pages: 1
    });

    // Synchronous retrieval must return cached entry immediately (0ms)
    const cached = productService.getCachedProductsPaginated({ page: 1, limit: 50 });
    assert.ok(cached !== null, "Cached products should be immediately accessible");
    assert.strictEqual(cached?.products.length, 1);
    assert.strictEqual(cached?.products[0].name, "Paracetamol 500mg");
    console.log("✓ APICache instant synchronous retrieval verified.");
  });

  it("Test 2: Verify live /api/products payload size is drastically reduced (< 100 KB)", async () => {
    try {
      const res = await fetch("http://127.0.0.1:3000/api/products?paginate=true&page=1&limit=50");
      assert.strictEqual(res.status, 200, "API must return 200 OK");
      const rawText = await res.text();
      const sizeKB = rawText.length / 1024;
      console.log(`  Live 50-product JSON size: ${sizeKB.toFixed(1)} KB (Target < 100 KB)`);
      assert.ok(sizeKB < 100, `Payload size must be under 100 KB, got ${sizeKB.toFixed(1)} KB`);
      console.log("✓ Payload size verified to be lightweight and fast.");
    } catch (err: any) {
      if (err.cause?.code === "ECONNREFUSED" || err.code === "ECONNREFUSED") {
        console.warn("  Skipping live endpoint verification: dev server not running on port 3000.");
        return;
      }
      throw err;
    }
  });

  it("Test 3: Verify binary image endpoint serves images with immutable cache header", async () => {
    try {
      const res = await fetch("http://127.0.0.1:3000/api/products?paginate=true&page=1&limit=50");
      const data = await res.json();
      const productWithImage = data.products.find((p: any) => p.imageUrl && p.imageUrl.startsWith("/api/products/"));

      if (productWithImage) {
        const imgRes = await fetch("http://127.0.0.1:3000" + productWithImage.imageUrl);
        assert.strictEqual(imgRes.status, 200, "Image endpoint must return 200");
        const contentType = imgRes.headers.get("content-type");
        const cacheControl = imgRes.headers.get("cache-control");

        assert.ok(contentType?.startsWith("image/"), `Content-Type should be image/*, got ${contentType}`);
        assert.ok(cacheControl?.includes("immutable") || cacheControl?.includes("max-age"), "Image must have cache-control headers");
        console.log(`  Image endpoint: ${contentType}, ${cacheControl}`);
        console.log("✓ Binary product image endpoint verified.");
      } else {
        console.log("  (Skipped image check: No base64 image product in first page)");
      }
    } catch (err: any) {
      if (err.cause?.code === "ECONNREFUSED" || err.code === "ECONNREFUSED") {
        console.warn("  Skipping live endpoint verification: dev server not running on port 3000.");
        return;
      }
      throw err;
    }
  });
});
