import assert from "assert";
import {
  toBDDateString,
  getDailyLedgerSummary,
  saveDailyLedgerOverride,
  resetDailyLedgerOverride,
  getEffectiveLedgerValue,
  getDateRangeLedgerSummary,
  createPurchase,
  createExpense
} from "../src/lib/accountsService";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

async function runComprehensiveOverrideTests() {
  console.log("=== RUNNING DAILY BUSINESS LEDGER MANUAL OVERRIDE PERSISTENCE SUITE ===\n");

  const randOffset = Math.floor(100 + Math.random() * 800);
  const testDateA = `2036-05-${String(10 + (randOffset % 15))}`;
  const testDateB = `2036-05-${String(25 + (randOffset % 3))}`;

  // ---------------------------------------------------------
  // TEST 1: No override -> automatic value displayed
  // ---------------------------------------------------------
  console.log("Test 1: No override -> automatic value displayed...");
  await createPurchase({
    supplierName: "Incepta Pharmaceuticals",
    purchaseDate: testDateA,
    totalAmount: 40000,
    paidAmount: 40000,
    paymentMethod: "Bank Transfer",
    notes: "T1 Auto Purchase"
  });

  const t1Summary = await getDailyLedgerSummary(testDateA);
  assert.strictEqual(t1Summary.purchases, 40000);
  assert.strictEqual(t1Summary.isOverridden, false);
  console.log("  Passed: Automatic value ৳40,000 displayed with isOverridden = false.");

  // ---------------------------------------------------------
  // TEST 2: Create override -> manual value displayed
  // ---------------------------------------------------------
  console.log("\nTest 2: Create override -> manual value displayed...");
  const t2Saved = await saveDailyLedgerOverride(testDateA, {
    date: testDateA,
    purchases: 45000,
    deliveredSales: 52000,
    notes: "T2 Manual Audit",
    editedBy: "superadmin@medichain.com"
  });

  assert.strictEqual(t2Saved.purchases, 45000);
  assert.strictEqual(t2Saved.deliveredSales, 52000);
  assert.strictEqual(t2Saved.isOverridden, true);
  assert.strictEqual(t2Saved.rawCalculated?.purchases, 40000);
  console.log("  Passed: Manual override active: Purchases = ৳45,000, Sales = ৳52,000.");

  // ---------------------------------------------------------
  // TEST 3: Refresh/reload -> manual value still displayed (read from Supabase)
  // ---------------------------------------------------------
  console.log("\nTest 3: Refresh/reload -> manual value persists in Supabase...");
  // Query Supabase directly
  const { data: dbRowA } = await supabaseAdmin
    .from("daily_ledger_overrides")
    .select("*")
    .eq("date", testDateA)
    .single();

  assert.ok(dbRowA, "Row must exist in Supabase daily_ledger_overrides");
  assert.strictEqual(Number(dbRowA.purchases), 45000);
  assert.strictEqual(Number(dbRowA.delivered_sales), 52000);

  // Call range summary (which queries Supabase)
  const rangeReload = await getDateRangeLedgerSummary(testDateA, testDateA);
  const reloadedRow = rangeReload.dailyRows[0];
  assert.strictEqual(reloadedRow.purchases, 45000, "Must survive reload");
  assert.strictEqual(reloadedRow.deliveredSales, 52000, "Must survive reload");
  assert.strictEqual(reloadedRow.isOverridden, true);
  console.log("  Passed: Reload from Supabase confirmed authoritative manual values survive.");

  // ---------------------------------------------------------
  // TEST 4: Automatic calculation changes -> manual override remains
  // ---------------------------------------------------------
  console.log("\nTest 4: Automatic calculation changes -> manual override remains...");
  await createPurchase({
    supplierName: "Square Pharma",
    purchaseDate: testDateA,
    totalAmount: 15000,
    paidAmount: 15000,
    paymentMethod: "Cash",
    notes: "T4 Second Purchase"
  });

  const t4Summary = await getDailyLedgerSummary(testDateA);
  assert.strictEqual(t4Summary.purchases, 45000, "Manual Purchases ৳45,000 must NOT be overwritten");
  assert.strictEqual(t4Summary.rawCalculated?.purchases, 55000, "Automatic value updated to ৳55,000");
  console.log("  Passed: Manual override intact (৳45,000) while automatic value updated to ৳55,000.");

  // ---------------------------------------------------------
  // TEST 5: Reset override -> automatic value displayed & deleted from DB
  // ---------------------------------------------------------
  console.log("\nTest 5: Reset override -> automatic value displayed...");
  const t5Reset = await resetDailyLedgerOverride(testDateA, "superadmin@medichain.com");
  assert.strictEqual(t5Reset.purchases, 55000, "Restored to auto ৳55,000");
  assert.strictEqual(t5Reset.isOverridden, false);

  const { data: dbCheckDeleted } = await supabaseAdmin
    .from("daily_ledger_overrides")
    .select("*")
    .eq("date", testDateA)
    .maybeSingle();
  assert.strictEqual(dbCheckDeleted, null, "Supabase record must be deleted");
  console.log("  Passed: Reset removed Supabase row and restored automatic ৳55,000.");

  // ---------------------------------------------------------
  // TEST 6: Second edit updates existing override (no duplicate active rows)
  // ---------------------------------------------------------
  console.log("\nTest 6: Second edit updates existing override...");
  await saveDailyLedgerOverride(testDateA, {
    date: testDateA,
    purchases: 42000,
    notes: "First adjustment"
  });

  await saveDailyLedgerOverride(testDateA, {
    date: testDateA,
    purchases: 46000,
    notes: "Second adjustment"
  });

  const { data: dbRowsCount } = await supabaseAdmin
    .from("daily_ledger_overrides")
    .select("date")
    .eq("date", testDateA);

  assert.strictEqual(dbRowsCount?.length, 1, "Must have exactly 1 active override row for this date");
  const finalSummaryT6 = await getDailyLedgerSummary(testDateA);
  assert.strictEqual(finalSummaryT6.purchases, 46000);
  console.log("  Passed: Exactly 1 row in DB updated to latest value (৳46,000).");

  // ---------------------------------------------------------
  // TEST 7: Different fields remain independent
  // ---------------------------------------------------------
  console.log("\nTest 7: Different fields remain independent...");
  const t7Save = await saveDailyLedgerOverride(testDateA, {
    date: testDateA,
    purchases: 46000,
    customerCollections: 38000,
    otherExpenses: 700
  });

  assert.strictEqual(t7Save.purchases, 46000);
  assert.strictEqual(t7Save.customerCollections, 38000);
  assert.strictEqual(t7Save.otherExpenses, 700);
  console.log("  Passed: Multi-field overrides preserved independently.");

  // ---------------------------------------------------------
  // TEST 8: Different dates remain strictly isolated
  // ---------------------------------------------------------
  console.log("\nTest 8: Different dates remain strictly isolated...");
  await saveDailyLedgerOverride(testDateB, {
    date: testDateB,
    purchases: 99000,
    notes: "Isolated Date B"
  });

  const summaryA = await getDailyLedgerSummary(testDateA);
  const summaryB = await getDailyLedgerSummary(testDateB);

  assert.strictEqual(summaryA.purchases, 46000, "Date A purchases must remain 46,000");
  assert.strictEqual(summaryB.purchases, 99000, "Date B purchases must be 99,000");
  console.log("  Passed: Date isolation verified across separate calendar dates.");

  // ---------------------------------------------------------
  // TEST 9: Timezone & Date Boundary (Asia/Dhaka)
  // ---------------------------------------------------------
  console.log("\nTest 9: Timezone date boundary uses Asia/Dhaka...");
  const d1 = toBDDateString("2026-12-31T18:30:00Z"); // 00:30 on 2027-01-01 in BST
  assert.strictEqual(d1, "2027-01-01", "UTC 18:30 must be next day in BST");
  console.log("  Passed: Asia/Dhaka timezone offset (UTC+6) correctly mapped.");

  // ---------------------------------------------------------
  // TEST 10: getEffectiveLedgerValue precedence helper
  // ---------------------------------------------------------
  console.log("\nTest 10: Centralized getEffectiveLedgerValue helper logic...");
  assert.strictEqual(getEffectiveLedgerValue(50000, 48000, true), 48000);
  assert.strictEqual(getEffectiveLedgerValue(50000, undefined, true), 50000);
  assert.strictEqual(getEffectiveLedgerValue(50000, null, true), 50000);
  assert.strictEqual(getEffectiveLedgerValue(50000, 48000, false), 50000);
  console.log("  Passed: getEffectiveLedgerValue respects strict precedence.");

  // Clean up test dates
  await resetDailyLedgerOverride(testDateA);
  await resetDailyLedgerOverride(testDateB);

  console.log("\n🎉 ALL 10 COMPREHENSIVE OVERRIDE PERSISTENCE TESTS PASSED (100% SUCCESS)!");
}

runComprehensiveOverrideTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
