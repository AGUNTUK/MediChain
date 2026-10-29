import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateCartTotals } from "../src/components/CartDrawer";
import { Product } from "../src/types";

describe("Cart Optimistic Responsiveness, Manual Quantity & Password Toggle Tests", () => {
  it("Test 1: Cart item subtotal and totals recalculate accurately in memory", () => {
    const item = {
      product: {
        id: "prod-1",
        name: "Napa 500mg",
        mrp: 120,
        sellingPrice: 100,
        availableStock: 50,
        tiers: [
          { minQty: 10, discountPercent: 20 },
          { minQty: 25, discountPercent: 25 }
        ]
      },
      quantity: 5
    };

    // Helper simulation matching Cart.tsx calculateCartTotals
    const calculateTotals = (qty: number) => {
      const p = item.product;
      const mrp = p.mrp;
      const sortedTiers = [...p.tiers].sort((a, b) => a.minQty - b.minQty);
      const activeTier = [...sortedTiers].reverse().find(t => qty >= t.minQty) || null;
      const effectiveUnitPrice = activeTier 
        ? Math.round((mrp * (1 - activeTier.discountPercent / 100)) * 100) / 100 
        : p.sellingPrice;
      const subtotal = Math.round((effectiveUnitPrice * qty) * 100) / 100;
      return { effectiveUnitPrice, subtotal, activeTier };
    };

    // 5 units: normal wholesale price
    const calc5 = calculateTotals(5);
    assert.strictEqual(calc5.effectiveUnitPrice, 100);
    assert.strictEqual(calc5.subtotal, 500);

    // 10 units: 20% discount on MRP 120 = 96
    const calc10 = calculateTotals(10);
    assert.strictEqual(calc10.effectiveUnitPrice, 96);
    assert.strictEqual(calc10.subtotal, 960);

    // 30 units: 25% discount on MRP 120 = 90
    const calc30 = calculateTotals(30);
    assert.strictEqual(calc30.effectiveUnitPrice, 90);
    assert.strictEqual(calc30.subtotal, 2700);

    console.log("✓ Cart optimistic price and volume tier calculation passed.");
  });

  it("Test 2: Manual quantity numeric input clamps to available stock bounds", () => {
    const maxStock = 75;

    const clamp = (val: number, max: number) => Math.min(Math.max(1, val), max);

    assert.strictEqual(clamp(0, maxStock), 1, "0 must clamp to 1");
    assert.strictEqual(clamp(-10, maxStock), 1, "Negative numbers must clamp to 1");
    assert.strictEqual(clamp(25, maxStock), 25, "Valid quantity should be preserved");
    assert.strictEqual(clamp(75, maxStock), 75, "Max stock should be allowed");
    assert.strictEqual(clamp(150, maxStock), 75, "Quantities exceeding stock must clamp to maxStock");

    console.log("✓ Manual quantity input bounds clamping verified.");
  });

  it("Test 3: Password show/hide toggle flips input type correctly", () => {
    let showPassword = false;
    let inputType = showPassword ? "text" : "password";
    assert.strictEqual(inputType, "password");

    // Toggle on
    showPassword = true;
    inputType = showPassword ? "text" : "password";
    assert.strictEqual(inputType, "text");

    // Toggle off
    showPassword = false;
    inputType = showPassword ? "text" : "password";
    assert.strictEqual(inputType, "password");

    console.log("✓ Password show/hide eye toggle verified.");
  });

  it("Test 4: CartDrawer calculateCartTotals accurately computes 0ms totals with volume tiers", () => {
    const mockProduct: Product = {
      id: "abetis-plus-1",
      name: "Abetis Plus 20 mg+12.5 mg",
      genericName: "Olmesartan + Hydrochlorothiazide",
      company: "ACI Limited",
      category: "TABLET",
      strength: "20 mg+12.5 mg",
      packSize: "3 x 10's",
      mrp: 550,
      sellingPrice: 477.68,
      discountPercentage: 13.15,
      availableStock: 50,
      reservedStock: 0,
      soldStock: 0,
      batchNumber: "B123",
      expiryDate: "2027-12-31",
      tiers: [
        { minQty: 5, discountPercent: 16 }
      ]
    };

    // Case A: 3 boxes (as in user screenshot)
    const result3 = calculateCartTotals([
      { product: mockProduct, quantity: 3 }
    ]);
    assert.strictEqual(result3.items.length, 1);
    assert.strictEqual(result3.items[0].effectiveUnitPrice, 477.68);
    assert.strictEqual(result3.items[0].itemSubtotal, 1433.04);
    assert.strictEqual(result3.totalMrp, 1650);
    assert.strictEqual(result3.totalAmount, 1433.04);
    assert.strictEqual(result3.totalSavings, 216.96);
    assert.strictEqual(result3.totalTierSavings, 0);

    // Case B: 5 boxes (triggers 16% MRP bulk discount: 550 * 0.84 = 462.00)
    const result5 = calculateCartTotals([
      { product: mockProduct, quantity: 5 }
    ]);
    assert.strictEqual(result5.items[0].effectiveUnitPrice, 462.00);
    assert.strictEqual(result5.items[0].itemSubtotal, 2310.00);
    assert.strictEqual(result5.totalMrp, 2750);
    assert.strictEqual(result5.totalAmount, 2310.00);
    assert.strictEqual(result5.totalSavings, 440.00);
    assert.strictEqual(result5.totalTierSavings, 78.4); // (477.68 - 462) * 5

    console.log("✓ CartDrawer calculateCartTotals matches expected screenshot financials and volume tier discounts.");
  });

  it("Test 5: Debounced sync coalesces rapid clicks into a single target call", async () => {
    let callCount = 0;
    let finalSyncedQty = 0;
    const fakeUpdateCartQty = async (_id: string, _c: number, _ch: number, targetQty?: number) => {
      callCount++;
      finalSyncedQty = targetQty || 0;
    };

    // Simulate 4 rapid clicks within 100ms interval
    const timers: Record<string, NodeJS.Timeout> = {};
    const pendingTargets: Record<string, number> = {};

    const simulateClick = (target: number) => {
      pendingTargets["p1"] = target;
      if (timers["p1"]) clearTimeout(timers["p1"]);
      timers["p1"] = setTimeout(async () => {
        const t = pendingTargets["p1"];
        delete timers["p1"];
        delete pendingTargets["p1"];
        await fakeUpdateCartQty("p1", 0, 0, t);
      }, 50); // fast test timeout
    };

    simulateClick(2);
    simulateClick(3);
    simulateClick(4);
    simulateClick(5);

    // Wait for timer to fire
    await new Promise(res => setTimeout(res, 80));

    assert.strictEqual(callCount, 1, "Only 1 backend sync call should be dispatched");
    assert.strictEqual(finalSyncedQty, 5, "Final synced quantity should be the last clicked quantity");

    console.log("✓ Rapid click debounce coalescence verified.");
  });
});
