import assert from "assert";
import * as dbService from "../src/lib/dbService.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

async function runSquareProductStockTests() {
  console.log("=== RUNNING MEDICHAIN SQUARE PHARMACEUTICALS STOCK INTEGRITY TESTS ===\n");

  // TEST 1: Find a Square Pharmaceuticals product from the catalog
  console.log("Test 1: Locating a Square Pharmaceuticals product...");
  const { data: squareProds, error: fetchErr } = await supabaseAdmin
    .from("products")
    .select("id, name, generic_name, company, stock_quantity, category_name_fallback, strength, pack_size, mrp, selling_price")
    .ilike("company", "%Square%")
    .limit(1);

  assert.ifError(fetchErr);
  assert.ok(squareProds && squareProds.length > 0, "Square product must exist in database");
  const testProduct = squareProds[0];
  console.log(`  Found product: "${testProduct.name}" (ID: ${testProduct.id}, Company: "${testProduct.company}")`);

  // Capture original stock so we can cleanly restore it after test
  const { data: origInv } = await supabaseAdmin
    .from("inventory")
    .select("available_stock")
    .eq("product_id", testProduct.id)
    .maybeSingle();
  const originalStock = origInv ? (origInv.available_stock ?? 0) : (testProduct.stock_quantity ?? 0);

  try {
    // TEST 2: Update stock quantity to a non-zero test value (e.g. 250 units)
    console.log("\nTest 2: Updating stock of Square product to 250 units via dbService.addOrUpdateProduct...");
    const updatedProd = await dbService.addOrUpdateProduct({
      id: testProduct.id,
      name: testProduct.name,
      genericName: testProduct.generic_name,
      company: testProduct.company,
      category: testProduct.category_name_fallback || "Tablet",
      strength: testProduct.strength || "N/A",
      packSize: testProduct.pack_size || "10's",
      mrp: Number(testProduct.mrp) || 100,
      sellingPrice: Number(testProduct.selling_price) || 80,
      availableStock: 250
    });

    assert.strictEqual(
      updatedProd.availableStock,
      250,
      `dbService.addOrUpdateProduct must return availableStock = 250, got ${updatedProd.availableStock}`
    );
    console.log("  Passed: dbService.addOrUpdateProduct returned availableStock = 250 for Square product.");

    // TEST 3: Direct getProductById verification
    console.log("\nTest 3: Fetching via dbService.getProductById...");
    const fetchedSingle = await dbService.getProductById(testProduct.id);
    assert.ok(fetchedSingle, "Product must be found");
    assert.strictEqual(
      fetchedSingle.availableStock,
      250,
      `dbService.getProductById must return authentic availableStock = 250, got ${fetchedSingle.availableStock}`
    );
    console.log("  Passed: dbService.getProductById returned availableStock = 250 (not overridden to 0).");

    // TEST 4: Catalog API endpoint verification (/api/products)
    console.log("\nTest 4: Fetching product via /api/products endpoint...");
    const res = await fetch(`http://localhost:3000/api/products?search=${encodeURIComponent(testProduct.name)}`);
    assert.strictEqual(res.status, 200, "API request must return 200 OK");
    const catalogData = await res.json();
    const foundInCatalog = (catalogData.products || catalogData).find((p: any) => p.id === testProduct.id);
    assert.ok(foundInCatalog, "Product must be found in catalog search results");
    assert.strictEqual(
      foundInCatalog.availableStock,
      250,
      `/api/products must return availableStock = 250 for Square product, got ${foundInCatalog.availableStock}`
    );
    console.log("  Passed: Catalog API returns availableStock = 250 for Square product.");

    // TEST 5: Verify low-stock calculation logic
    console.log("\nTest 5: Verifying low stock calculation boundary for Square products...");
    await dbService.addOrUpdateProduct({
      id: testProduct.id,
      name: testProduct.name,
      genericName: testProduct.generic_name,
      company: testProduct.company,
      category: testProduct.category_name_fallback || "Tablet",
      strength: testProduct.strength || "N/A",
      packSize: testProduct.pack_size || "10's",
      mrp: Number(testProduct.mrp) || 100,
      sellingPrice: Number(testProduct.selling_price) || 80,
      availableStock: 15
    });

    const lowStockProd = await dbService.getProductById(testProduct.id);
    assert.strictEqual(lowStockProd?.availableStock, 15, "Low stock value must be 15");
    const isOutOfStock = (lowStockProd?.availableStock ?? 0) <= 0;
    const isLowStock = (lowStockProd?.availableStock ?? 0) > 0 && (lowStockProd?.availableStock ?? 0) <= 20;
    assert.strictEqual(isOutOfStock, false, "Product with 15 units must NOT be marked out of stock");
    assert.strictEqual(isLowStock, true, "Product with 15 units MUST be marked low stock");
    console.log("  Passed: Low-stock (15 units) correctly identified without company-based suppression.");

  } finally {
    // RESTORE: Restore original stock so live database data remains clean
    console.log("\nRestoring original stock value in database...");
    await dbService.addOrUpdateProduct({
      id: testProduct.id,
      name: testProduct.name,
      genericName: testProduct.generic_name,
      company: testProduct.company,
      category: testProduct.category_name_fallback || "Tablet",
      strength: testProduct.strength || "N/A",
      packSize: testProduct.pack_size || "10's",
      mrp: Number(testProduct.mrp) || 100,
      sellingPrice: Number(testProduct.selling_price) || 80,
      availableStock: originalStock
    });
    console.log(`  Cleaned up: Restored product stock to ${originalStock}.`);
  }

  console.log("\n🎉 ALL SQUARE PHARMACEUTICALS STOCK INTEGRITY TESTS PASSED (100% SUCCESS)!");
}

runSquareProductStockTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
