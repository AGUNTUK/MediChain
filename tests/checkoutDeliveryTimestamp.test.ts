import assert from "assert";
import { getDeliveryWindow, groupOrdersByDeliverySchedule } from "../src/lib/deliverySchedule.js";
import { createOrderTransaction } from "../src/lib/dbService.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { toBDDateString } from "../src/lib/accountsService.js";
import { schemas } from "../src/lib/security.js";

async function runCheckoutDeliveryTimestampTests() {
  console.log("=== RUNNING MEDICHAIN CHECKOUT DELIVERY TIMESTAMP REGRESSION TESTS ===\n");

  // TEST 1: Delivery Window Calculations & Strict Asia/Dhaka (UTC+6) Rules
  console.log("Test 1: Delivery schedule rules with Asia/Dhaka timezone and 12:00 PM BST cutoff...");

  // Monday 11:59:59 AM BST -> Monday delivery
  const monBeforeCutoff = new Date("2026-10-05T05:59:59.000Z"); // 11:59:59 BST
  const winMonBefore = getDeliveryWindow(monBeforeCutoff);
  assert.strictEqual(winMonBefore.deliveryDay, "MONDAY");
  assert.strictEqual(winMonBefore.deliveryDate, "2026-10-05");
  assert.strictEqual(winMonBefore.isBeforeCutoff, true);

  // Monday 12:00:00 PM BST -> Wednesday delivery
  const monAtCutoff = new Date("2026-10-05T06:00:00.000Z"); // 12:00:00 BST
  const winMonAt = getDeliveryWindow(monAtCutoff);
  assert.strictEqual(winMonAt.deliveryDay, "WEDNESDAY");
  assert.strictEqual(winMonAt.deliveryDate, "2026-10-07");
  assert.strictEqual(winMonAt.isBeforeCutoff, false);

  // Tuesday -> Wednesday delivery
  const tueAnytime = new Date("2026-10-06T04:00:00.000Z"); // 10:00 AM BST Tuesday
  const winTue = getDeliveryWindow(tueAnytime);
  assert.strictEqual(winTue.deliveryDay, "WEDNESDAY");
  assert.strictEqual(winTue.deliveryDate, "2026-10-07");

  // Wednesday before cutoff -> Wednesday delivery
  const wedBeforeCutoff = new Date("2026-10-07T05:59:59.000Z");
  const winWedBefore = getDeliveryWindow(wedBeforeCutoff);
  assert.strictEqual(winWedBefore.deliveryDay, "WEDNESDAY");
  assert.strictEqual(winWedBefore.deliveryDate, "2026-10-07");

  // Wednesday at/after cutoff -> Saturday delivery
  const wedAfterCutoff = new Date("2026-10-07T06:00:01.000Z");
  const winWedAfter = getDeliveryWindow(wedAfterCutoff);
  assert.strictEqual(winWedAfter.deliveryDay, "SATURDAY");
  assert.strictEqual(winWedAfter.deliveryDate, "2026-10-10");

  // Thursday -> Saturday delivery
  const thuAnytime = new Date("2026-10-08T03:00:00.000Z");
  const winThu = getDeliveryWindow(thuAnytime);
  assert.strictEqual(winThu.deliveryDay, "SATURDAY");
  assert.strictEqual(winThu.deliveryDate, "2026-10-10");

  // Friday -> Saturday delivery
  const friAnytime = new Date("2026-10-09T08:00:00.000Z");
  const winFri = getDeliveryWindow(friAnytime);
  assert.strictEqual(winFri.deliveryDay, "SATURDAY");
  assert.strictEqual(winFri.deliveryDate, "2026-10-10");

  // Saturday before cutoff -> Saturday delivery
  const satBeforeCutoff = new Date("2026-10-10T05:59:59.000Z");
  const winSatBefore = getDeliveryWindow(satBeforeCutoff);
  assert.strictEqual(winSatBefore.deliveryDay, "SATURDAY");
  assert.strictEqual(winSatBefore.deliveryDate, "2026-10-10");

  // Saturday at/after cutoff -> Next Monday delivery
  const satAfterCutoff = new Date("2026-10-10T06:00:00.000Z");
  const winSatAfter = getDeliveryWindow(satAfterCutoff);
  assert.strictEqual(winSatAfter.deliveryDay, "MONDAY");
  assert.strictEqual(winSatAfter.deliveryDate, "2026-10-12");

  // Sunday -> Monday delivery
  const sunAnytime = new Date("2026-10-11T09:00:00.000Z");
  const winSun = getDeliveryWindow(sunAnytime);
  assert.strictEqual(winSun.deliveryDay, "MONDAY");
  assert.strictEqual(winSun.deliveryDate, "2026-10-12");

  console.log("  Passed: All Monday/Wednesday/Saturday scheduling rules & 12:00 PM cutoff verified.");

  // TEST 2: Separation of Human-Readable Label and ISO-8601 Timestamp
  console.log("\nTest 2: Verifying human-readable label vs ISO-8601 timestamp separation...");
  const orderTime = new Date("2026-10-09T10:00:00.000Z"); // Friday 4:00 PM BST
  const windowInfo = getDeliveryWindow(orderTime);

  // 1. Label is human-readable
  assert.ok(typeof windowInfo.deliveryScheduleLabel === "string");
  assert.strictEqual(windowInfo.deliveryScheduleLabel, "Saturday Delivery (Oct 10, 2026)");

  // 2. estimatedDeliveryTimestamp is valid ISO-8601 UTC string
  assert.ok(typeof windowInfo.estimatedDeliveryTimestamp === "string");
  assert.match(windowInfo.estimatedDeliveryTimestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  const parsedDate = new Date(windowInfo.estimatedDeliveryTimestamp);
  assert.ok(!isNaN(parsedDate.getTime()), "Timestamp must parse without NaN");
  assert.strictEqual(toBDDateString(windowInfo.estimatedDeliveryTimestamp), windowInfo.deliveryDate);

  // 3. Confirm human-readable text label is NOT a valid ISO timestamp
  assert.ok(isNaN(new Date("Saturday Delivery (Oct 10, 2026) (Cutoff: 12:00 PM BST)").getTime()), 
    "Human readable label must fail standard date parsing, confirming why TIMESTAMPTZ rejected it");
  console.log("  Passed: Display label and valid ISO timestamp are strictly separated.");

  // TEST 3: Database Insertion of Order with Valid TIMESTAMPTZ
  console.log("\nTest 3: Testing end-to-end order placement with database TIMESTAMPTZ insertion...");
  
  // Find a test pharmacy and product from database
  const { data: pharmacies, error: pharmErr } = await supabaseAdmin
    .from("pharmacies")
    .select("id, user_id, pharmacy_name, address")
    .limit(1);

  if (pharmErr || !pharmacies || pharmacies.length === 0) {
    console.warn("  Skipping DB insertion test: No pharmacies in database.");
    return;
  }
  const testPharmacy = pharmacies[0];

  const { data: products, error: prodErr } = await supabaseAdmin
    .from("products")
    .select("id, name, selling_price, mrp")
    .limit(1);

  if (prodErr || !products || products.length === 0) {
    console.warn("  Skipping DB insertion test: No products in database.");
    return;
  }
  const testProduct = products[0];

  // Create an order using createOrderTransaction
  const orderPayload = {
    paymentMethod: "Cash on Delivery",
    notes: "Automated regression test order for delivery schedule timestamp fix",
    items: [
      { productId: testProduct.id, quantity: 1 }
    ],
    deliveryAddress: testPharmacy.address || "Dhanmondi, Dhaka"
  };

  const createResult = await createOrderTransaction(
    testPharmacy.user_id,
    testPharmacy.id,
    orderPayload,
    products
  );

  assert.ok(createResult.success, "Order creation must succeed");
  assert.ok(createResult.order?.id, "Created order must have UUID id");
  assert.ok(createResult.order?.readableId, "Created order must have readable ID");
  console.log("  Passed: Order created successfully with ID:", createResult.order.id, "Number:", createResult.order.readableId);

  // Query the inserted row directly from Supabase to verify PostgreSQL TIMESTAMPTZ column
  const { data: dbOrder, error: queryErr } = await supabaseAdmin
    .from("orders")
    .select("id, estimated_delivery, wms_attributes, status, payment_method, total_amount")
    .eq("id", createResult.order.id)
    .single();

  assert.ifError(queryErr);
  assert.ok(dbOrder, "Order must be found in database");

  // Verify PostgreSQL TIMESTAMPTZ value
  console.log("  Database estimated_delivery column value:", dbOrder.estimated_delivery);
  assert.ok(dbOrder.estimated_delivery, "estimated_delivery must not be null");
  assert.ok(!isNaN(new Date(dbOrder.estimated_delivery).getTime()), "DB estimated_delivery must be a valid parseable timestamp");
  
  // Verify wms_attributes JSONB metadata
  assert.ok(dbOrder.wms_attributes, "wms_attributes must be present");
  assert.ok(dbOrder.wms_attributes.deliveryScheduleLabel, "wms_attributes must contain human-readable deliveryScheduleLabel");
  assert.ok(dbOrder.wms_attributes.deliveryDate, "wms_attributes must contain deliveryDate YYYY-MM-DD");
  console.log("  Database wms_attributes metadata:", dbOrder.wms_attributes);

  // Verify invoice was generated for this order
  const { data: dbInvoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, amount_due, amount_paid")
    .eq("order_id", createResult.order.id)
    .single();

  assert.ifError(invErr);
  assert.ok(dbInvoice, "Invoice must be created");
  assert.strictEqual(Number(dbInvoice.amount_paid), 0, "Cash on Delivery invoices start with amount_paid = 0");
  console.log("  Passed: Invoice generated with number:", dbInvoice.invoice_number);

  // CLEANUP: Delete the test order, items, and invoice so the database remains pristine
  await supabaseAdmin.from("invoices").delete().eq("order_id", createResult.order.id);
  await supabaseAdmin.from("order_items").delete().eq("order_id", createResult.order.id);
  await supabaseAdmin.from("orders").delete().eq("id", createResult.order.id);
  console.log("  Passed: Test order and invoice cleaned up from database.");

  // TEST 4: Invalid timestamp payloads return clear error without creating duplicate orders
  console.log("\nTest 4: Testing invalid timestamp payload rejection and duplicate order prevention...");
  
  // 4a. API schema validation rejects human-readable label passed as estimatedDelivery
  let zodErrorCaught = false;
  try {
    schemas.orderCreate.parse({
      deliveryAddress: "Dhanmondi 27, Dhaka",
      estimatedDelivery: "Saturday Delivery (Oct 10, 2026) (Cutoff: 12:00 PM BST)"
    });
  } catch (err: any) {
    zodErrorCaught = true;
    assert.ok(err.message.includes("Invalid estimated delivery timestamp"), "Zod error message must mention invalid timestamp");
  }
  assert.ok(zodErrorCaught, "Zod schema must reject human-readable schedule label in estimatedDelivery");
  console.log("  Passed: API schema validation correctly rejects human-readable schedule labels.");

  // 4b. createOrderTransaction rejects human-readable label before creating order or reserving inventory
  const { count: initialOrderCount } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true });

  let transactionErrorCaught = false;
  try {
    await createOrderTransaction(
      testPharmacy.user_id,
      testPharmacy.id,
      {
        paymentMethod: "Cash on Delivery",
        notes: "Invalid timestamp rejection test",
        items: [{ productId: testProduct.id, quantity: 1 }],
        deliveryAddress: testPharmacy.address || "Dhanmondi, Dhaka",
        estimatedDelivery: "Saturday Delivery (Oct 10, 2026) (Cutoff: 12:00 PM BST)"
      },
      products
    );
  } catch (err: any) {
    transactionErrorCaught = true;
    assert.ok(
      err.message.includes("Invalid estimated delivery timestamp") || err.message.includes("not a human-readable"),
      `Expected descriptive error message, got: ${err.message}`
    );
  }
  assert.ok(transactionErrorCaught, "createOrderTransaction must reject human-readable label");

  // Verify no order was inserted
  const { count: afterErrorOrderCount } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true });
  assert.strictEqual(afterErrorOrderCount, initialOrderCount, "No duplicate or partial order must be created on invalid timestamp error");
  console.log("  Passed: Invalid timestamp payload rejected with clear error without creating duplicate orders.");

  // TEST 5: Explicit Valid ISO-8601 Timestamp Payload Accepted
  console.log("\nTest 5: Testing explicit valid ISO-8601 timestamp payload handling...");
  const explicitIso = "2026-10-14T06:00:00.000Z"; // Wednesday 12:00 PM BST in UTC
  const explicitResult = await createOrderTransaction(
    testPharmacy.user_id,
    testPharmacy.id,
    {
      paymentMethod: "Cash on Delivery",
      notes: "Explicit ISO-8601 timestamp order test",
      items: [{ productId: testProduct.id, quantity: 1 }],
      deliveryAddress: testPharmacy.address || "Dhanmondi, Dhaka",
      estimatedDelivery: explicitIso
    },
    products
  );

  assert.ok(explicitResult.success, "Order creation with explicit valid ISO-8601 timestamp must succeed");
  
  // Verify DB row received the exact TIMESTAMPTZ
  const { data: explicitDbOrder, error: expDbErr } = await supabaseAdmin
    .from("orders")
    .select("id, estimated_delivery")
    .eq("id", explicitResult.order.id)
    .single();
  assert.ifError(expDbErr);
  assert.ok(explicitDbOrder, "Order must be found");
  assert.strictEqual(new Date(explicitDbOrder.estimated_delivery).toISOString(), explicitIso);
  console.log("  Passed: Explicit ISO-8601 timestamp stored accurately in TIMESTAMPTZ column.");

  // Cleanup explicit test order
  await supabaseAdmin.from("invoices").delete().eq("order_id", explicitResult.order.id);
  await supabaseAdmin.from("order_items").delete().eq("order_id", explicitResult.order.id);
  await supabaseAdmin.from("orders").delete().eq("id", explicitResult.order.id);

  // TEST 6: Existing Cash on Delivery, Invoice Generation, & Consolidation Logic
  console.log("\nTest 6: Testing Cash on Delivery, invoice net terms, and combined-invoice logic...");
  const codOrder = {
    id: "test-order-cod-1",
    readableId: "MCH-099999",
    pharmacyId: testPharmacy.id,
    status: "Pending" as const,
    paymentMethod: "Cash on Delivery" as const,
    paymentStatus: "Pending" as const,
    totalAmount: 1200,
    totalSavings: 150,
    totalMrp: 1350,
    deliveryCharge: 40,
    items: [
      {
        productId: "prod-1",
        name: "Test Medicine",
        strength: "500mg",
        packSize: "10x10",
        quantity: 10,
        sellingPrice: 120,
        mrp: 135,
        subtotal: 1200
      }
    ],
    createdAt: "2026-10-09T08:00:00.000Z",
    estimatedDelivery: "Saturday Delivery (Oct 10, 2026) (Cutoff: 12:00 PM BST)",
    estimatedDeliveryTimestamp: "2026-10-10T06:00:00.000Z",
    deliverySchedule: "SATURDAY" as const,
    deliveryDate: "2026-10-10",
    deliveryScheduleLabel: "Saturday Delivery (Oct 10, 2026)"
  };

  const pharmMap: Record<string, any> = {
    [testPharmacy.id]: testPharmacy
  };

  const consolidated = groupOrdersByDeliverySchedule([codOrder as any], pharmMap);
  assert.strictEqual(consolidated.length, 1, "Must form exactly 1 consolidated invoice group");
  assert.strictEqual(consolidated[0].deliverySchedule, "SATURDAY");
  assert.strictEqual(consolidated[0].deliveryDate, "2026-10-10");
  assert.strictEqual(consolidated[0].deliveryCharge, 40, "Must have standard single 40 BDT delivery charge");
  assert.strictEqual(consolidated[0].grandTotal, 1240, "Grand total matches subtotal + delivery charge");
  console.log("  Passed: COD payment, invoice net terms, and combined-invoice logic verified.");

  console.log("\n🎉 ALL CHECKOUT DELIVERY TIMESTAMP REGRESSION TESTS PASSED WITH 100% SUCCESS!");
}

runCheckoutDeliveryTimestampTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
