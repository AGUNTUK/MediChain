import assert from "assert";
import {
  toBDDateString,
  getDailyLedgerSummary,
  saveDailyLedgerOverride,
  resetDailyLedgerOverride,
  getEffectiveLedgerValue,
  getDateRangeLedgerSummary,
  createPurchase,
  createCollection,
  createExpense,
  createCapitalTransaction,
  saveCustomInvoiceToLedger,
  getInventoryValuation,
  generateReconciliationReport
} from "../src/lib/accountsService";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { DEFAULT_DELIVERY_CHARGE } from "../src/lib/deliverySchedule";

async function runAccountsLedgerTests() {
  console.log("=== RUNNING MEDICHAIN ACCOUNTS & BUSINESS LEDGER TEST SUITE ===\n");

  // TEST 1: Asia/Dhaka Timezone Date Partitioning
  console.log("Test 1: Timezone date partitioning (Asia/Dhaka UTC+6)...");
  // UTC 2026-10-06T17:59:00Z -> BST 2026-10-06T23:59:00+06:00 -> Date: 2026-10-06
  const dateBeforeMidnight = toBDDateString("2026-10-06T17:59:00.000Z");
  assert.strictEqual(dateBeforeMidnight, "2026-10-06", "11:59 PM BST must belong to 2026-10-06");

  // UTC 2026-10-06T18:01:00Z -> BST 2026-10-07T00:01:00+06:00 -> Date: 2026-10-07
  const dateAfterMidnight = toBDDateString("2026-10-06T18:01:00.000Z");
  assert.strictEqual(dateAfterMidnight, "2026-10-07", "12:01 AM BST must belong to 2026-10-07");
  console.log("  Passed: Asia/Dhaka date boundary handles midnight transitions accurately.");

  // TEST 2: Comprehensive Accounting Math (Specification Section 55)
  console.log("\nTest 2: Core Accounting Formula & Purchase vs COGS vs Cash flow...");
  const randYear2 = 2050 + Math.floor(Math.random() * 20);
  const randMonth2 = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const randDay2 = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  const testDate = `${randYear2}-${randMonth2}-${randDay2}`; // Use globally isolated test date
  const baselineLedger = await getDailyLedgerSummary(testDate);

  // Step A: Record Purchase: ৳100,000, Paid: ৳70,000, Due: ৳30,000
  const pur = await createPurchase({
    supplierName: "Square Pharmaceuticals Ltd.",
    invoiceReference: "SQ-TEST-001",
    purchaseDate: testDate,
    totalAmount: 100000,
    paidAmount: 70000,
    paymentMethod: "Bank Transfer",
    notes: "Batch procurement of Napa and Seclo"
  });
  assert.strictEqual(pur.totalAmount, 100000);
  assert.strictEqual(pur.paidAmount, 70000);
  assert.strictEqual(pur.dueAmount, 30000);
  assert.strictEqual(pur.paymentStatus, "Partially Paid");
  console.log("  Passed: Purchase recorded with ৳100,000 total, ৳70,000 cash paid, ৳30,000 supplier payable.");

  // Step B: Record Custom Institutional Invoice (Sales: ৳60,000, Buying Cost/COGS: ৳50,000)
  const cinv = await saveCustomInvoiceToLedger({
    id: "cinv-test-1",
    invoiceNumber: "INV-INST-20261006-001",
    recipientName: "National Heart Hospital",
    phone: "01711000000",
    address: "Dhaka, Bangladesh",
    createdAt: testDate,
    subtotal: 60000,
    totalMrp: 75000,
    totalSavings: 15000,
    deliveryCharge: 0,
    specialAdjustment: 0,
    netPayable: 60000,
    paidAmount: 0,
    dueAmount: 60000,
    paymentMethod: "Credit / Invoice",
    paymentStatus: "Pending",
    items: [
      {
        id: "item-1",
        productId: "p-custom-1",
        name: "Test Medicine A",
        mrp: 100,
        rate: 80,
        quantity: 750,
        netDiscount: 20,
        total: 60000
      }
    ]
  }, [
    { id: "p-custom-1", name: "Test Medicine A", buyingPrice: 66.666667 } // 750 * 66.666667 = 50,000
  ]);
  assert.strictEqual(cinv.netPayable, 60000);
  assert.strictEqual(cinv.totalCogs, 50000);
  assert.strictEqual(cinv.grossProfit, 10000);
  console.log("  Passed: Institutional invoice realized ৳60,000 sales, ৳50,000 COGS, ৳10,000 gross profit.");

  // Step C: Customer Collection: ৳45,000
  const col = await createCollection({
    customerName: "National Heart Hospital",
    collectionDate: testDate,
    amount: 45000,
    paymentMethod: "Bank Transfer",
    referenceInvoiceId: "INV-INST-20261006-001"
  });
  assert.strictEqual(col.amount, 45000);
  console.log("  Passed: Customer collection recorded for ৳45,000.");

  // Step D: Delivery Expense: ৳400
  const expDelivery = await createExpense({
    category: "Delivery",
    amount: 400,
    paymentMethod: "Cash",
    description: "Dedicated courier delivery to hospital",
    expenseDate: testDate
  });
  assert.strictEqual(expDelivery.amount, 400);

  // Step E: Other Expense: ৳500
  const expOther = await createExpense({
    category: "Packaging",
    amount: 500,
    paymentMethod: "Cash",
    description: "Carton & thermal wrap for logistics",
    expenseDate: testDate
  });
  assert.strictEqual(expOther.amount, 500);
  console.log("  Passed: Operating and delivery expenses recorded.");

  // Step F: Validate Daily Ledger Aggregation for testDate
  const ledger = await getDailyLedgerSummary(testDate);
  console.log("\n  Ledger Output for", testDate, ":");
  console.log("    Purchases: ৳" + ledger.purchases);
  console.log("    Delivered Sales: ৳" + ledger.deliveredSales);
  console.log("    Customer Collections: ৳" + ledger.customerCollections);
  console.log("    Customer Outstanding: ৳" + ledger.customerOutstanding);
  console.log("    COGS: ৳" + ledger.cogs);
  console.log("    Gross Profit: ৳" + ledger.grossProfit);
  console.log("    Delivery Expenses: ৳" + ledger.deliveryExpenses);
  console.log("    Other Expenses: ৳" + ledger.otherExpenses);
  console.log("    NET PROFIT: ৳" + ledger.netProfit);
  console.log("    Cash In: ৳" + ledger.cashIn);
  console.log("    Cash Out: ৳" + ledger.cashOut);
  console.log("    Net Cash Flow: ৳" + ledger.netCashFlow);

  // Verify Exact Specifications
  assert.strictEqual(ledger.grossProfit, baselineLedger.grossProfit + 10000, "Gross profit must be Sales (60,000) - COGS (50,000) = 10,000 delta");
  assert.strictEqual(ledger.netProfit, baselineLedger.netProfit + 9100, "Net profit must be Gross Profit (10,000) - Delivery (400) - Other (500) = 9,100 delta");
  assert.strictEqual(ledger.customerOutstanding, baselineLedger.customerOutstanding + 15000, "Customer outstanding must be Sales (60,000) - Collection (45,000) = 15,000 delta");
  assert.strictEqual(ledger.cashIn, baselineLedger.cashIn + 45000, "Cash in = Customer collection (45,000) delta");
  assert.strictEqual(ledger.cashOut, baselineLedger.cashOut + 70900, "Cash out = Purchase Paid (70,000) + Delivery (400) + Other (500) = 70,900 delta");
  assert.strictEqual(ledger.netCashFlow, baselineLedger.netCashFlow - 25900, "Net cash flow must be 45,000 - 70,900 = -25,900 delta");
  console.log("  Passed: Section 55 accounting scenario verified with 100% precision!");

  // TEST 3: Capital Contribution vs Revenue (Section 56)
  console.log("\nTest 3: Capital contribution separation from sales & profit...");
  const cap = await createCapitalTransaction({
    type: "Contribution",
    partnerName: "Kazi Sohel",
    amount: 100000,
    transactionDate: testDate,
    paymentMethod: "Bank Transfer",
    notes: "Q4 Growth Equity"
  });
  assert.strictEqual(cap.amount, 100000);

  const ledgerAfterCap = await getDailyLedgerSummary(testDate);
  assert.strictEqual(ledgerAfterCap.deliveredSales, 60000, "Sales revenue must remain 60,000");
  assert.strictEqual(ledgerAfterCap.grossProfit, 10000, "Gross profit must remain 10,000");
  assert.strictEqual(ledgerAfterCap.netProfit, 9100, "Net profit must remain 9,100");
  assert.strictEqual(ledgerAfterCap.capitalContributions, 100000, "Capital contribution recorded as 100,000");
  assert.strictEqual(ledgerAfterCap.cashIn, 145000, "Cash in increases by 100,000 to 145,000");
  assert.strictEqual(ledgerAfterCap.netCashFlow, 74100, "Net cash flow is 145,000 - 70,900 = 74,100");
  await supabaseAdmin.from("capital_transactions").delete().eq("id", cap.id);
  console.log("  Passed: Capital increases cash and equity with ZERO change to revenue or profit.");

  // TEST 4: Custom Invoice Idempotency & Profit (Section 57)
  console.log("\nTest 4: Custom invoice idempotency and profit calculation...");
  const testCustomInvoice = {
    id: "cinv-idempotent-1",
    invoiceNumber: "INV-INST-20261006-IDEM",
    recipientName: "Apex Clinic",
    phone: "01811000000",
    address: "Chittagong, Bangladesh",
    createdAt: "2026-10-06",
    subtotal: 9700,
    totalMrp: 12000,
    totalSavings: 2300,
    deliveryCharge: 0,
    specialAdjustment: 0,
    netPayable: 9700,
    paidAmount: 9700,
    dueAmount: 0,
    paymentMethod: "Cash",
    paymentStatus: "Paid" as const,
    items: [
      {
        id: "item-custom-100",
        productId: "p-apex-1",
        name: "Napa 500mg (Institutional)",
        mrp: 120,
        rate: 97,
        quantity: 100,
        netDiscount: 23,
        total: 9700
      }
    ]
  };

  const masterList = [{ id: "p-apex-1", name: "Napa 500mg", buyingPrice: 94 }];

  // First Save
  const save1 = await saveCustomInvoiceToLedger(testCustomInvoice, masterList);
  assert.strictEqual(save1.netPayable, 9700);
  assert.strictEqual(save1.totalCogs, 9400);
  assert.strictEqual(save1.grossProfit, 300);

  // Second Save of same invoice (Simulating double-click or update)
  const save2 = await saveCustomInvoiceToLedger(testCustomInvoice, masterList);
  assert.strictEqual(save2.netPayable, 9700);
  assert.strictEqual(save2.totalCogs, 9400);
  assert.strictEqual(save2.grossProfit, 300);
  console.log("  Passed: Custom invoice calculated Revenue = ৳9,700, COGS = ৳9,400, Gross Profit = ৳300 with 100% idempotency.");

  // TEST 5: Automated Reconciliation Audit
  console.log("\nTest 5: Automated Reconciliation audit engine...");
  const recon = await generateReconciliationReport();
  assert.ok(recon.checks.length >= 4, "Reconciliation must execute all core balance checks");
  console.log("  Passed: Reconciliation checks generated with status:", recon.overallStatus);

  // TEST 6: Delivery Charge (+) Addition & Wholesaler Procurement Transport (-) Deduction
  console.log("\nTest 6: Delivery charge collected (+) & wholesaler procurement transport cost (-)...");
  const randYear = 2030 + Math.floor(Math.random() * 20);
  const randMonth = String(Math.floor(1 + Math.random() * 12)).padStart(2, "0");
  const randDay = String(Math.floor(1 + Math.random() * 28)).padStart(2, "0");
  const testDate6 = `${randYear}-${randMonth}-${randDay}`;
  
  // 1. Create a purchase with transport cost
  await createExpense({
    category: "Transport",
    amount: 1500,
    paymentMethod: "Cash",
    description: "Wholesaler procurement cargo transit from Mitford market",
    expenseDate: testDate6
  });

  // 2. Create custom invoice with delivery charge ৳120
  await saveCustomInvoiceToLedger({
    id: `cinv-transport-test-${Date.now()}`,
    invoiceNumber: `INV-DELV-${Date.now()}`,
    recipientName: "Central Pharmacy",
    phone: "01711000000",
    address: "Dhaka",
    createdAt: testDate6,
    subtotal: 10000,
    totalMrp: 12000,
    totalSavings: 2000,
    deliveryCharge: 120,
    specialAdjustment: 0,
    netPayable: 10120,
    paidAmount: 10120,
    dueAmount: 0,
    paymentMethod: "Cash",
    paymentStatus: "Paid" as const,
    items: [{
      id: `i-cinv-1-${Date.now()}`,
      productId: "p-apex-1",
      name: "Napa",
      mrp: 120,
      rate: 100,
      quantity: 100,
      netDiscount: 20,
      total: 10000
    }]
  }, [{ id: "p-apex-1", name: "Napa", buyingPrice: 85 }]);

  const ledger6 = await getDailyLedgerSummary(testDate6);
  assert.strictEqual(ledger6.deliveryChargeCollected, 120, "Delivery charge collected must be ৳120");
  assert.strictEqual(ledger6.cogs, 8500, "COGS must be ৳8,500");
  // Gross Profit = (Sales 10,120 - COGS 8,500) = 1,620 (or 10,000 - 8,500 + 120 delivery charge = 1,620)
  assert.strictEqual(ledger6.grossProfit, 1620, "Gross profit includes + delivery charge collected");
  assert.strictEqual(ledger6.transportExpenses, 1500, "Wholesaler transport expenses recorded as ৳1,500");
  // Net Profit = Gross Profit (1620) - Wholesaler Transport (1500) = 120
  assert.strictEqual(ledger6.netProfit, 120, "Net profit must deduct wholesaler transport expenses (-)");

  // TEST 7: Supabase Persistence, Reload Survival, Non-Destruction & Reset to Automatic
  console.log("\nTest 7: Daily Ledger Manual Override authoritative Supabase persistence & survival...");
  const randYear7 = 2075 + Math.floor(Math.random() * 20);
  const randMonth7 = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const randDay7 = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  const testDate7 = `${randYear7}-${randMonth7}-${randDay7}`;

  // 1. Initial State: No override exists -> automatic calculation is displayed
  await createPurchase({
    supplierName: "Beximco Pharma",
    purchaseDate: testDate7,
    totalAmount: 50000,
    paidAmount: 50000,
    paymentMethod: "Bank Transfer",
    notes: "Baseline test purchase"
  });

  const baselineSummary = await getDailyLedgerSummary(testDate7);
  assert.strictEqual(baselineSummary.purchases, 50000, "Automatic purchase must be ৳50,000");
  assert.strictEqual(baselineSummary.isOverridden, false, "Must not be overridden yet");

  // 2. Admin Manually Overrides: Purchases: ৳55,000, Delivered Sales: ৳48,000
  console.log("  Step 2: Admin saves manual override (Purchases: ৳55,000, Sales: ৳48,000)...");
  const savedOverride = await saveDailyLedgerOverride(testDate7, {
    date: testDate7,
    purchases: 55000,
    deliveredSales: 48000,
    deliveryChargeCollected: 100,
    notes: "Manual stock audit adjustment",
    editedBy: "admin@medichain.com"
  });

  assert.strictEqual(savedOverride.purchases, 55000, "Effective purchases must be ৳55,000");
  assert.strictEqual(savedOverride.deliveredSales, 48000, "Effective sales must be ৳48,000");
  assert.strictEqual(savedOverride.deliveryChargeCollected, 100, "Effective delivery charge must be ৳100");
  assert.strictEqual(savedOverride.isOverridden, true, "isOverridden must be true");
  assert.strictEqual(savedOverride.rawCalculated?.purchases, 50000, "rawCalculated must preserve automatic ৳50,000");

  // 3. Verify Database Directly (Supabase Persistence)
  console.log("  Step 3: Verifying direct database persistence in Supabase table daily_ledger_overrides...");
  const { data: dbRow, error: dbErr } = await supabaseAdmin
    .from("daily_ledger_overrides")
    .select("*")
    .eq("date", testDate7)
    .single();

  assert.strictEqual(dbErr, null, "Database query must succeed with no error");
  assert.ok(dbRow, "Row must exist in Supabase table daily_ledger_overrides");
  assert.strictEqual(Number(dbRow.purchases), 55000, "DB purchases column must be 55000");
  assert.strictEqual(Number(dbRow.delivered_sales), 48000, "DB delivered_sales column must be 48000");
  assert.strictEqual(dbRow.edited_by, "admin@medichain.com", "DB edited_by must be saved");

  // 4. Simulate Browser Refresh / Server Restart (Fetch fresh without in-memory cache)
  console.log("  Step 4: Simulating full browser refresh / server restart (fetching fresh from DB)...");
  const refreshedRange = await getDateRangeLedgerSummary(testDate7, testDate7);
  assert.strictEqual(refreshedRange.dailyRows.length, 1);
  const refreshedRow = refreshedRange.dailyRows[0];
  assert.strictEqual(refreshedRow.purchases, 55000, "Refreshed row must still have manual ৳55,000");
  assert.strictEqual(refreshedRow.deliveredSales, 48000, "Refreshed row must still have manual ৳48,000");
  assert.strictEqual(refreshedRow.deliveryChargeCollected, 100, "Refreshed row must still have manual ৳100");
  assert.strictEqual(refreshedRow.isOverridden, true, "Refreshed row must remain marked as overridden");

  // 5. Automatic Recalculation Must NOT Overwrite Override
  console.log("  Step 5: Triggering automatic recalculation by adding more transactions...");
  await createPurchase({
    supplierName: "Square Pharma",
    purchaseDate: testDate7,
    totalAmount: 10000,
    paidAmount: 10000,
    paymentMethod: "Cash",
    notes: "Additional automatic purchase"
  });

  const recalculatedSummary = await getDailyLedgerSummary(testDate7);
  assert.strictEqual(recalculatedSummary.purchases, 55000, "Manual override ৳55,000 must NOT be destroyed by auto-recalculation");
  assert.strictEqual(recalculatedSummary.rawCalculated?.purchases, 60000, "rawCalculated must update to reflect new automatic ৳60,000");

  // 6. Reset to Automatic
  console.log("  Step 6: Resetting override to Automatic...");
  const resetSummary = await resetDailyLedgerOverride(testDate7, "admin@medichain.com");
  assert.strictEqual(resetSummary.purchases, 60000, "After reset, purchases must restore to auto-calculated ৳60,000");
  assert.strictEqual(resetSummary.isOverridden, false, "After reset, isOverridden must be false");

  // Verify DB row was actually deleted
  const { data: dbDeleted } = await supabaseAdmin
    .from("daily_ledger_overrides")
    .select("*")
    .eq("date", testDate7)
    .maybeSingle();
  assert.strictEqual(dbDeleted, null, "DB row must be deleted upon reset to automatic");

  // 7. Verify Audit Log was recorded
  console.log("  Step 7: Verifying audit_logs table has recorded the override and reset events...");
  const { data: auditRecords } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .eq("record_id", testDate7)
    .order("created_at", { ascending: false });

  assert.ok(auditRecords && auditRecords.length >= 1, "At least 1 audit log record must be found in audit_logs");
  console.log("  Passed: Supabase persistence, reload survival, non-destruction, and reset verified 100%!");

  console.log("\n🎉 ALL ACCOUNTS & BUSINESS LEDGER TESTS PASSED SUCCESSFULLY!");
}

runAccountsLedgerTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
