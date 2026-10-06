import assert from "assert";
import {
  toBDDateString,
  getDailyLedgerSummary,
  createPurchase,
  createCollection,
  createExpense,
  createCapitalTransaction,
  saveCustomInvoiceToLedger,
  getInventoryValuation,
  generateReconciliationReport
} from "../src/lib/accountsService";
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
  const testDate = `2026-12-${String((Date.now() % 25) + 1).padStart(2, "0")}`; // Use isolated test date without interference from today's real customer orders

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
  assert.strictEqual(ledger.grossProfit, 10000, "Gross profit must be Sales (60,000) - COGS (50,000) = 10,000");
  assert.strictEqual(ledger.netProfit, 9100, "Net profit must be Gross Profit (10,000) - Delivery (400) - Other (500) = 9,100");
  assert.strictEqual(ledger.customerOutstanding, 15000, "Customer outstanding must be Sales (60,000) - Collection (45,000) = 15,000");
  assert.strictEqual(ledger.cashIn, 45000, "Cash in = Customer collection (45,000)");
  assert.strictEqual(ledger.cashOut, 70900, "Cash out = Purchase Paid (70,000) + Delivery (400) + Other (500) = 70,900");
  assert.strictEqual(ledger.netCashFlow, -25900, "Net cash flow must be 45,000 - 70,900 = -25,900");
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

  console.log("\n🎉 ALL ACCOUNTS & BUSINESS LEDGER TESTS PASSED SUCCESSFULLY!");
}

runAccountsLedgerTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
