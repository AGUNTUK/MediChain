import assert from "assert";
import { executeProductSearch, executeGenericSubstitution, processPharmacyCopilot } from "../src/lib/geminiCopilotService.js";
import { getDeliveryWindow } from "../src/lib/deliverySchedule.js";

async function runPharmacyCopilotTests() {
  console.log("=== RUNNING MEDICHAIN PHARMACY PROCUREMENT COPILOT TESTS ===\n");

  const mockCatalog = [
    {
      id: "prod-1",
      name: "Seclo 20",
      genericName: "Omeprazole",
      company: "Square Pharmaceuticals PLC",
      strength: "20 mg",
      packSize: "10x10 Box",
      category: "Capsule",
      sellingPrice: 500,
      mrp: 600,
      availableStock: 0, // Out of stock
      profitMarginPercent: 16.7
    },
    {
      id: "prod-2",
      name: "Omecon 20",
      genericName: "Omeprazole",
      company: "Beximco Pharmaceuticals Ltd",
      strength: "20 mg",
      packSize: "10x10 Box",
      category: "Capsule",
      sellingPrice: 470,
      mrp: 600,
      availableStock: 80, // In stock!
      profitMarginPercent: 21.7 // High margin!
    },
    {
      id: "prod-3",
      name: "Proceptin 20",
      genericName: "Omeprazole",
      company: "Incepta Pharmaceuticals Ltd",
      strength: "20 mg",
      packSize: "10x10 Box",
      category: "Capsule",
      sellingPrice: 480,
      mrp: 600,
      availableStock: 45,
      profitMarginPercent: 20.0
    },
    {
      id: "prod-4",
      name: "Napa Extra",
      genericName: "Paracetamol + Caffeine",
      company: "Beximco Pharmaceuticals Ltd",
      strength: "500 mg + 65 mg",
      packSize: "20x10 Box",
      category: "Tablet",
      sellingPrice: 450,
      mrp: 500,
      availableStock: 120,
      profitMarginPercent: 10.0
    }
  ];

  // TEST 1: Generic Substitution Matching
  console.log("Test 1: Testing bio-equivalent generic substitution for out-of-stock Seclo 20...");
  const { original, substitutes } = executeGenericSubstitution(mockCatalog, "Seclo 20");
  assert.ok(original, "Original product must be identified");
  assert.strictEqual(original.id, "prod-1");
  assert.ok(substitutes.length >= 2, "Must find alternative Omeprazole medicines");
  // First substitute should be in stock and have the highest profit margin (Omecon 20 with 21.7%)
  assert.strictEqual(substitutes[0].name, "Omecon 20");
  assert.strictEqual(substitutes[0].availableStock, 80);
  assert.strictEqual(substitutes[0].discountPercentage, 22);
  console.log(`  Passed: Recommended "${substitutes[0].name}" (${substitutes[0].discountPercentage}% discount, ${substitutes[0].availableStock} in stock) as top substitute for out-of-stock Seclo 20.`);

  // TEST 2: Product Search with In-Stock Filter
  console.log("\nTest 2: Testing catalog search with stock filtering...");
  const inStockResults = executeProductSearch(mockCatalog, "Omeprazole", "Capsule", true);
  assert.ok(inStockResults.length > 0, "Must find in-stock capsules");
  assert.ok(inStockResults.every(p => p.availableStock > 0), "All returned products must be in stock");
  assert.strictEqual(inStockResults.some(p => p.name === "Seclo 20"), false, "Out of stock Seclo 20 must be filtered out");
  console.log(`  Passed: Correctly returned ${inStockResults.length} in-stock Omeprazole medicines.`);

  // TEST 3: Delivery schedule inquiry handling
  console.log("\nTest 3: Testing delivery schedule calculation in Copilot engine...");
  const windowInfo = getDeliveryWindow(new Date());
  assert.ok(windowInfo.deliveryScheduleLabel, "Delivery schedule label must be generated");
  assert.ok(windowInfo.cutoffTimeLabel, "Cutoff time must be 12:00 PM BST");
  console.log(`  Passed: Calculated delivery schedule: "${windowInfo.deliveryScheduleLabel}" (Cutoff: ${windowInfo.cutoffTimeLabel}).`);

  // TEST 4: Full processPharmacyCopilot Execution
  console.log("\nTest 4: Testing processPharmacyCopilot with substitution inquiry...");
  const copilotRes = await processPharmacyCopilot({
    userId: "test-user-id",
    userPharmacyName: "Care Pharmacy Dhaka",
    messages: [
      { role: "user", text: "সেকলো ২০ স্টকে না থাকলে ভালো কোনো বিকল্প আছে কি?" }
    ],
    masterProducts: mockCatalog
  });

  assert.ok(copilotRes.reply, "Copilot must generate a response reply");
  assert.ok(copilotRes.recommendedProducts.length > 0, "Copilot must return recommended products");
  assert.strictEqual(copilotRes.recommendedProducts[0].genericName, "Omeprazole");
  console.log(`  Passed: Copilot answered with reply and attached ${copilotRes.recommendedProducts.length} therapeutic substitutes.`);

  // TEST 5: Copilot Delivery Inquiry
  console.log("\nTest 5: Testing processPharmacyCopilot with delivery schedule inquiry...");
  const deliveryRes = await processPharmacyCopilot({
    userId: "test-user-id",
    userPharmacyName: "Care Pharmacy Dhaka",
    messages: [
      { role: "user", text: "এখন অর্ডার কনফার্ম করলে ডেলিভারি কখন পাব?" }
    ],
    masterProducts: mockCatalog
  });

  assert.ok(deliveryRes.reply, "Delivery reply must be present");
  assert.ok(deliveryRes.deliveryInfo, "deliveryInfo metadata must be attached");
  console.log(`  Passed: Copilot delivery inquiry answered with live cutoff calculation.`);

  console.log("\n🎉 ALL PHARMACY PROCUREMENT COPILOT TESTS PASSED (100% SUCCESS)!");
  process.exit(0);
}

runPharmacyCopilotTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
