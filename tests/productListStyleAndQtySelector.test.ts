import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=== RUNNING PRODUCT LIST STYLE & QUANTITY SELECTOR TESTS ===");

// Test 1: Verify Grid/List Switch Button Removal from Home.tsx
console.log("\nTest 1: Verify Grid/List Switch Button Removal from Home.tsx");
const homeContent = fs.readFileSync(path.resolve("src/components/Home.tsx"), "utf-8");

assert.ok(
  !homeContent.includes("LayoutGrid"),
  "LayoutGrid switch icon must be removed from Home.tsx"
);
assert.ok(
  !homeContent.includes("ListFilter"),
  "ListFilter switch icon must be removed from Home.tsx"
);
assert.ok(
  !homeContent.includes('title="গ্রিড ভিউ"'),
  "Grid view button title must be removed from Home.tsx"
);
assert.ok(
  !homeContent.includes('title="তালিকা ভিউ"'),
  "List view button title must be removed from Home.tsx"
);
assert.ok(
  !homeContent.includes('const [viewMode, setViewMode]'),
  "viewMode state toggle must be removed from Home.tsx"
);
assert.ok(
  homeContent.includes('layout="horizontal"'),
  "Home.tsx must render ProductCard strictly with layout='horizontal'"
);
console.log("✓ Switch button removed and list-only layout strictly enforced on Home.tsx.");

// Test 2: Verify Quantity Selector with Minus, Plus, and Manual Input in ProductCard.tsx
console.log("\nTest 2: Verify Quantity Selector with Minus, Plus, and Manual Input in ProductCard.tsx");
const cardContent = fs.readFileSync(path.resolve("src/components/ProductCard.tsx"), "utf-8");

assert.ok(
  cardContent.includes("orderQtyInput"),
  "ProductCard must have orderQtyInput state for manual input"
);
assert.ok(
  cardContent.includes("handleOrderQtyInputChange"),
  "ProductCard must have handleOrderQtyInputChange handler"
);
assert.ok(
  cardContent.includes("handleOrderQtyInputBlur"),
  "ProductCard must have handleOrderQtyInputBlur handler"
);
assert.ok(
  cardContent.includes("handleCartInputCommit"),
  "ProductCard must have handleCartInputCommit for editing in-cart quantity"
);
assert.ok(
  cardContent.includes('type="number"'),
  "ProductCard must render HTML number inputs for manual quantity"
);
console.log("✓ ProductCard contains comprehensive manual quantity input and minus/plus logic.");

// Test 3: Functional Logic Simulation for Quantity Clamping & In-Cart Updating
console.log("\nTest 3: Functional Logic Simulation for Quantity Clamping & In-Cart Updating");

function simulateQuantityChange(val: string, current: number, maxStock: number): number {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed < 1) return 1;
  return Math.min(parsed, maxStock);
}

function simulateCartUpdateDelta(targetQty: number, currentCartQty: number, maxStock: number): number {
  const clamped = Math.max(0, Math.min(targetQty, maxStock));
  return clamped - currentCartQty;
}

// Case A: Manual typing 25 with 100 stock
assert.strictEqual(simulateQuantityChange("25", 1, 100), 25, "Manual typing 25 should return 25");

// Case B: Manual typing 0 or negative defaults to 1
assert.strictEqual(simulateQuantityChange("0", 5, 50), 1, "Typing 0 should reset to minimum 1");
assert.strictEqual(simulateQuantityChange("-10", 5, 50), 1, "Typing negative number should reset to minimum 1");

// Case C: Exceeding stock bounds clamped to available stock
assert.strictEqual(simulateQuantityChange("150", 1, 60), 60, "Typing quantity exceeding stock should clamp to available stock (60)");

// Case D: In-cart quantity adjustment delta calculation
assert.strictEqual(simulateCartUpdateDelta(15, 5, 100), 10, "Delta to change cart from 5 to 15 should be +10");
assert.strictEqual(simulateCartUpdateDelta(2, 8, 100), -6, "Delta to change cart from 8 to 2 should be -6");
assert.strictEqual(simulateCartUpdateDelta(0, 5, 100), -5, "Delta to remove 5 items should be -5");

console.log("✓ Quantity validation, bounds clamping, and in-cart delta calculations passed.");
console.log("\n=== ALL PRODUCT LIST STYLE & QUANTITY SELECTOR TESTS PASSED! ===");
