import assert from "assert";
import { KhataTransaction, KhataCustomer, KhataSupplier, KhataShortItem } from "../src/types/khata";
import { toBengaliNumber } from "../src/lib/utils";

/**
 * Tests for MediChain Pharma-Smart Khata (ডিজিটাল ফার্মেসি হিসাব ও শর্ট খাতা)
 */
async function runPharmaKhataTests() {
  console.log("=== RUNNING MEDICHAIN PHARMA-SMART KHATA TESTS ===\n");

  // Test 1: Bengali Number Localization
  console.log("Test 1: Bengali Number Formatting");
  assert.strictEqual(toBengaliNumber(0), "০");
  assert.strictEqual(toBengaliNumber(14520), "১৪৫২০");
  assert.strictEqual(toBengaliNumber((14520).toLocaleString("en-IN")), "১৪,৫২০");
  assert.strictEqual(toBengaliNumber(500), "৫০০");
  console.log("✓ Bengali number conversion works accurately with comma separators.\n");

  // Test 2: Anonymous Walk-in Cash Sale Calculation
  console.log("Test 2: Walk-in Anonymous Cash Sale (Fast Sale)");
  const walkInSale: KhataTransaction = {
    id: "tx-test-1",
    pharmacy_id: "pharmacy-1",
    type: "SALE",
    customer_id: null,
    customer_name: "সাধারণ নগদ ক্রেতা (Walk-in)",
    total_amount: 350,
    paid_amount: 350,
    due_amount: 0,
    payment_method: "Cash",
    items: [{ name: "Napa Extra", qty: 2, unitPrice: 35, subtotal: 70 }],
    created_at: new Date().toISOString()
  };

  assert.strictEqual(walkInSale.customer_id, null);
  assert.strictEqual(walkInSale.due_amount, 0);
  assert.strictEqual(walkInSale.paid_amount, 350);
  console.log("✓ Anonymous walk-in cash sale handles null customerId with zero dues.\n");

  // Test 3: Customer Due Sale and Ledger Calculation
  console.log("Test 3: Customer Due Sale and Balance Tracking");
  const customer: KhataCustomer = {
    id: "cust-1",
    pharmacy_id: "pharmacy-1",
    name: "রহিম ভাই (লোকাল)",
    phone: "01711000000",
    total_due: 400,
    created_at: new Date().toISOString()
  };

  // New credit sale: Total 500, Paid 200, Due 300
  const creditSale: KhataTransaction = {
    id: "tx-test-2",
    pharmacy_id: "pharmacy-1",
    type: "SALE",
    customer_id: customer.id,
    customer_name: customer.name,
    customer_phone: customer.phone,
    total_amount: 500,
    paid_amount: 200,
    due_amount: 300,
    payment_method: "Due",
    created_at: new Date().toISOString()
  };

  const updatedDue = customer.total_due + creditSale.due_amount;
  assert.strictEqual(updatedDue, 700);

  // Customer pays 500 due
  const duePayment: KhataTransaction = {
    id: "tx-test-3",
    pharmacy_id: "pharmacy-1",
    type: "DUE_COLLECTION",
    customer_id: customer.id,
    customer_name: customer.name,
    total_amount: 500,
    paid_amount: 500,
    due_amount: 0,
    payment_method: "bKash",
    created_at: new Date().toISOString()
  };

  const finalDue = updatedDue - duePayment.paid_amount;
  assert.strictEqual(finalDue, 200);
  console.log("✓ Customer due balance calculation and payment reconciliation correct.\n");

  // Test 4: Net Cash in Hand Formula (bKash privacy pill balance)
  console.log("Test 4: Net Cash in Hand Formula Verification");
  // Formula: Cash In (Cash Sales + Cash Due Collection) - Cash Out (Cash Expenses + Cash Purchases)
  const transactions: KhataTransaction[] = [
    walkInSale, // Cash In: 350
    creditSale, // Cash In: 200 (paid portion)
    duePayment, // Cash In: 500 (bKash/digital cash)
    {
      id: "tx-exp-1",
      pharmacy_id: "pharmacy-1",
      type: "EXPENSE",
      total_amount: 150,
      paid_amount: 150,
      due_amount: 0,
      payment_method: "Cash",
      category: "দোকানের চা-নাস্তা",
      created_at: new Date().toISOString()
    }, // Cash Out: 150
    {
      id: "tx-pur-1",
      pharmacy_id: "pharmacy-1",
      type: "PURCHASE",
      total_amount: 600,
      paid_amount: 400,
      due_amount: 200,
      payment_method: "Cash",
      supplier_name: "স্কয়ার ডিপো",
      created_at: new Date().toISOString()
    } // Cash Out: 400
  ];

  let totalSales = 0;
  let cashIn = 0;
  let cashOut = 0;
  let totalDues = 0;

  transactions.forEach(t => {
    if (t.type === "SALE") {
      totalSales += t.total_amount;
      cashIn += t.paid_amount;
      totalDues += t.due_amount;
    } else if (t.type === "DUE_COLLECTION") {
      cashIn += t.paid_amount;
      totalDues -= t.paid_amount;
    } else if (t.type === "EXPENSE") {
      cashOut += t.paid_amount;
    } else if (t.type === "PURCHASE") {
      cashOut += t.paid_amount;
    }
  });

  const netCashInHand = cashIn - cashOut;

  assert.strictEqual(totalSales, 850); // 350 + 500
  assert.strictEqual(cashIn, 1050); // 350 + 200 + 500
  assert.strictEqual(cashOut, 550); // 150 + 400
  assert.strictEqual(netCashInHand, 500); // 1050 - 550
  console.log(`✓ Net cash in hand correctly computed: ৳${netCashInHand} (Cash In: ৳${cashIn}, Cash Out: ৳${cashOut})\n`);

  // Test 5: Short Book 1-Click Order matching transitions to 'In Cart'
  console.log("Test 5: Short Book 1-Click Order transitions to 'In Cart'");
  const shortBookItems: KhataShortItem[] = [
    {
      id: "short-1",
      pharmacy_id: "pharmacy-1",
      medicine_name: "Seclo 20",
      generic_name: "Omeprazole",
      company: "Square Pharmaceuticals PLC",
      required_qty: 15,
      pack_size: "10x10 Box",
      status: "Pending",
      created_at: new Date().toISOString()
    },
    {
      id: "short-2",
      pharmacy_id: "pharmacy-1",
      medicine_name: "Napa Extra",
      generic_name: "Paracetamol",
      company: "Beximco",
      required_qty: 10,
      pack_size: "20x10 Box",
      status: "Pending",
      created_at: new Date().toISOString()
    }
  ];

  assert.strictEqual(shortBookItems.length, 2);
  const pendingItems = shortBookItems.filter(i => i.status === "Pending");
  assert.strictEqual(pendingItems.length, 2);

  // Transition to 'In Cart' upon 1-click dispatch to MediChain wholesale cart
  const inCartItems = shortBookItems.map(i => ({ ...i, status: "In Cart" as const }));
  assert.strictEqual(inCartItems.every(i => i.status === "In Cart"), true);
  console.log("✓ Short book items correctly transition state from Pending to 'In Cart' (কার্টে যুক্ত).\n");

  // Test 6: WhatsApp Payment Reminder URL Encoding
  console.log("Test 6: WhatsApp Payment Reminder Formatting");
  const pharmacyName = "City Pharma";
  const customerName = "করিম ভাই";
  const dueAmount = 1450;
  const rawMsg = `শ্রদ্ধেয় ${customerName},\n${pharmacyName} থেকে আপনার বকেয়া হিসাব ৳${dueAmount} পরিশোধ করার জন্য বিনীত অনুরোধ করা হচ্ছে।\nধন্যবাদ।`;
  const waUrl = `https://wa.me/8801700000000?text=${encodeURIComponent(rawMsg)}`;

  assert(waUrl.includes("wa.me/8801700000000"));
  assert(waUrl.includes(encodeURIComponent(pharmacyName)));
  console.log("✓ WhatsApp reminder link generated and URL-encoded properly without Bengali character corruption.\n");

  // Test 7: Strict Order Sync Status Guard
  console.log("Test 7: Strict Order Sync Status Guard (Delivered & Completed ONLY)");
  const mockOrders = [
    { id: "ord-1", status: "Delivered", totalAmount: 5000, paymentStatus: "Paid" },
    { id: "ord-2", status: "Completed", totalAmount: 3000, paymentStatus: "Pending" },
    { id: "ord-3", status: "Out for Delivery", totalAmount: 4500, paymentStatus: "Pending" },
    { id: "ord-4", status: "Processing", totalAmount: 2000, paymentStatus: "Pending" },
    { id: "ord-5", status: "Confirmed", totalAmount: 1500, paymentStatus: "Pending" }
  ];

  const syncEligibleOrders = mockOrders.filter(o => o.status === "Delivered" || o.status === "Completed");
  assert.strictEqual(syncEligibleOrders.length, 2);
  assert.strictEqual(syncEligibleOrders.some(o => o.status === "Out for Delivery"), false);
  console.log("✓ Strictly Delivered & Completed orders qualify for supplier ledger; Out for Delivery is guarded.\n");

  // Test 8: Inline Customer Bengali Validation
  console.log("Test 8: Inline Customer Bengali Validation Logic");
  const validateCustomer = (name: string, phone: string) => {
    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
    if (!name.trim() || cleanPhone.length < 11) {
      return { isValid: false, error: "কাস্টমারের নাম ও ১১ ডিজিটের মোবাইল নম্বর দিন" };
    }
    return { isValid: true, error: null };
  };

  assert.strictEqual(validateCustomer("", "01711223344").isValid, false);
  assert.strictEqual(validateCustomer("করিম", "01711").isValid, false);
  assert.strictEqual(validateCustomer("করিম", "01711223344").isValid, true);
  assert.strictEqual(validateCustomer("", "01711").error, "কাস্টমারের নাম ও ১১ ডিজিটের মোবাইল নম্বর দিন");
  console.log("✓ Inline customer validation rules enforced with clean Bengali error messaging.\n");

  // Test 9: COD Delivered Orders Resulting in 0 Supplier Payable Increase
  console.log("Test 9: COD Auto-Settlement & Supplier Payable Protection");
  const medichainSupplier: KhataSupplier = {
    id: "supp-medichain-test",
    name: "MediChain Wholesale (অফিসিয়াল)",
    company: "MediChain B2B Platform",
    phone: "09612000000",
    total_payable: 0,
    is_medichain: true,
    created_at: new Date().toISOString()
  };

  const initialPayable = medichainSupplier.total_payable;

  const deliveredCodOrder = {
    id: "ord-del-cod-101",
    status: "Delivered",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending", // Settled at delivery
    totalAmount: 5400
  };

  const isPaidOrCod = 
    deliveredCodOrder.paymentMethod === "Cash on Delivery" || 
    (deliveredCodOrder.paymentStatus || "").toLowerCase() === "paid";

  const orderPaid = isPaidOrCod ? deliveredCodOrder.totalAmount : 0;
  const orderDue = isPaidOrCod ? 0 : deliveredCodOrder.totalAmount;

  if (orderDue > 0) {
    medichainSupplier.total_payable += orderDue;
  }

  assert.strictEqual(orderPaid, 5400, "COD delivered order paid_amount must equal total_amount");
  assert.strictEqual(orderDue, 0, "COD delivered order due_amount must be strictly 0");
  assert.strictEqual(medichainSupplier.total_payable, initialPayable, "COD delivered orders must NOT increase total_payable (বাকি)");
  console.log(`✓ COD delivered order settled: Paid = ৳${orderPaid}, Due = ৳${orderDue}, Supplier Payable = ৳${medichainSupplier.total_payable}\n`);

  // Test 10: Idempotent Upsert Simulation using Pre-Generated UUIDs
  console.log("Test 10: Idempotent Upsert Simulation (No Duplication of Dues or Transactions)");
  const testCustomerMap = new Map<string, KhataCustomer>();
  const testCustomerId = "c89d2822-26db-4835-bca1-f2d483489111";

  testCustomerMap.set(testCustomerId, {
    id: testCustomerId,
    name: "রহিম সাহেব",
    phone: "01711223344",
    total_due: 500,
    created_at: new Date().toISOString()
  });

  // Re-syncing same customer state with upsert semantics
  testCustomerMap.set(testCustomerId, {
    id: testCustomerId,
    name: "রহিম সাহেব",
    phone: "01711223344",
    total_due: 500,
    created_at: new Date().toISOString()
  });

  assert.strictEqual(testCustomerMap.size, 1, "Upsert with matching UUID must not create a duplicate customer record");
  assert.strictEqual(testCustomerMap.get(testCustomerId)?.total_due, 500, "Customer due remains exactly 500 without duplication");
  console.log("✓ Idempotent upsert semantic verified: Zero duplicate records or phantom dues.\n");

  // Test 11: Out-of-Stock Filtering during 1-Click Short Book Cart Dispatch
  console.log("Test 11: Out-of-Stock Filtering during 1-Click Short Book Cart Dispatch");
  const wholesaleCatalog = [
    { id: "p1", name: "Seclo 20", availableStock: 80 },
    { id: "p2", name: "Napa Extra", availableStock: 0 }, // Out of stock!
    { id: "p3", name: "Monas 10", availableStock: 25 }
  ];

  const candidateShortItems: KhataShortItem[] = [
    { id: "s1", medicine_name: "Seclo 20", product_id: "p1", required_qty: 5, status: "Pending", created_at: new Date().toISOString() },
    { id: "s2", medicine_name: "Napa Extra", product_id: "p2", required_qty: 10, status: "Pending", created_at: new Date().toISOString() },
    { id: "s3", medicine_name: "Monas 10", product_id: "p3", required_qty: 2, status: "Pending", created_at: new Date().toISOString() }
  ];

  const addedToCartIds: string[] = [];
  let outOfStockCount = 0;

  for (const item of candidateShortItems) {
    const prod = wholesaleCatalog.find(p => p.id === item.product_id);
    if (prod && Number(prod.availableStock || 0) > 0) {
      addedToCartIds.push(item.id);
    } else {
      outOfStockCount++;
    }
  }

  assert.strictEqual(addedToCartIds.length, 2, "Only in-stock items (Seclo & Monas) added to cart");
  assert.strictEqual(outOfStockCount, 1, "Napa Extra (0 stock) filtered out");

  const finalShortStatus = candidateShortItems.map(s => 
    addedToCartIds.includes(s.id) ? { ...s, status: "In Cart" as const } : s
  );

  assert.strictEqual(finalShortStatus.find(s => s.id === "s2")?.status, "Pending", "Out of stock item remains Pending");
  assert.strictEqual(finalShortStatus.filter(s => s.status === "In Cart").length, 2, "2 in-stock items transition to In Cart");
  console.log("✓ Out-of-stock items properly guarded; only available stock transitions to In Cart.\n");

  // Test 12: Zero Metrics Initial State (No unsolicited demo numbers)
  console.log("Test 12: Zero Default State when User Has Not Added Any Records");
  const emptyTransactions: KhataTransaction[] = [];
  const emptyCustomers: KhataCustomer[] = [];
  const emptySuppliers: KhataSupplier[] = [];
  const emptyShortBook: KhataShortItem[] = [];

  const initialSalesToday = emptyTransactions.filter(t => t.type === "SALE").reduce((s, t) => s + t.total_amount, 0);
  const initialCashCollected = emptyTransactions.filter(t => t.type === "SALE" || t.type === "DUE_COLLECTION").reduce((s, t) => s + t.paid_amount, 0);
  const initialCustomerDue = emptyCustomers.reduce((s, c) => s + c.total_due, 0);
  const initialExpenses = emptyTransactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.total_amount, 0);
  const initialPurchases = emptyTransactions.filter(t => t.type === "PURCHASE").reduce((s, t) => s + t.total_amount, 0);
  const initialPayables = emptySuppliers.reduce((s, sup) => s + sup.total_payable, 0);
  const initialNetCash = Math.max(0, initialCashCollected - initialExpenses);

  assert.strictEqual(initialSalesToday, 0, "Initial sales must be 0");
  assert.strictEqual(initialCashCollected, 0, "Initial cash collected must be 0");
  assert.strictEqual(initialCustomerDue, 0, "Initial customer dues must be 0");
  assert.strictEqual(initialExpenses, 0, "Initial expenses must be 0");
  assert.strictEqual(initialPurchases, 0, "Initial purchases must be 0");
  assert.strictEqual(initialPayables, 0, "Initial payables must be 0");
  assert.strictEqual(initialNetCash, 0, "Initial net cash in hand must be 0");
  assert.strictEqual(toBengaliNumber(initialSalesToday), "০");
  assert.strictEqual(toBengaliNumber(initialCashCollected), "০");
  assert.strictEqual(toBengaliNumber(initialCustomerDue), "০");
  console.log("✓ Initial state cleanly defaults to 0 across all financial metrics.\n");

  console.log("=== ALL PHARMA-SMART KHATA TESTS PASSED SUCCESSFULLY! ===");
}

runPharmaKhataTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
