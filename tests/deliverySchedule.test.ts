import { getDeliveryWindow, isOrderEligibleForConsolidation, groupOrdersByDeliverySchedule, getConsolidatedLineItems } from "../src/lib/deliverySchedule";
import { Order, Pharmacy } from "../src/types";

// Helper for assertions
function assertEqual(actual: any, expected: any, testName: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    console.error(`❌ FAILED: ${testName}`);
    console.error(`  Expected: ${expectedStr}`);
    console.error(`  Actual:   ${actualStr}`);
    throw new Error(`Test Failed: ${testName}`);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

console.log("=== RUNNING MEDICHAIN DELIVERY SCHEDULE (MON/WED/SAT, 12:00 PM CUTOFF) TESTS ===");

// 1. Monday 11:59:59 AM BST (05:59:59 UTC) -> MONDAY delivery
const test1 = getDeliveryWindow("2026-10-05T05:59:59.000Z");
assertEqual(test1.deliveryDay, "MONDAY", "1. Monday 11:59:59 AM -> Monday delivery");
assertEqual(test1.deliveryDate, "2026-10-05", "1. Monday 11:59:59 AM delivery date is 2026-10-05");

// 2. Monday 12:00:00 PM BST (06:00:00 UTC) -> WEDNESDAY delivery
const test2 = getDeliveryWindow("2026-10-05T06:00:00.000Z");
assertEqual(test2.deliveryDay, "WEDNESDAY", "2. Monday 12:00:00 PM -> Wednesday delivery");
assertEqual(test2.deliveryDate, "2026-10-07", "2. Monday 12:00:00 PM delivery date is 2026-10-07");

// 3. Monday 12:01:00 PM BST (06:01:00 UTC) -> WEDNESDAY delivery
const test3 = getDeliveryWindow("2026-10-05T06:01:00.000Z");
assertEqual(test3.deliveryDay, "WEDNESDAY", "3. Monday 12:01 PM -> Wednesday delivery");
assertEqual(test3.deliveryDate, "2026-10-07", "3. Monday 12:01 PM delivery date is 2026-10-07");

// 4. Tuesday (any time) -> WEDNESDAY delivery
const test4 = getDeliveryWindow("2026-10-06T04:00:00.000Z"); // Tuesday 10:00 AM BST
assertEqual(test4.deliveryDay, "WEDNESDAY", "4. Tuesday -> Wednesday delivery");
assertEqual(test4.deliveryDate, "2026-10-07", "4. Tuesday delivery date is 2026-10-07");

// 5. Wednesday 11:59:59 AM BST (05:59:59 UTC) -> WEDNESDAY delivery
const test5 = getDeliveryWindow("2026-10-07T05:59:59.000Z");
assertEqual(test5.deliveryDay, "WEDNESDAY", "5. Wednesday 11:59:59 AM -> Wednesday delivery");
assertEqual(test5.deliveryDate, "2026-10-07", "5. Wednesday 11:59:59 AM delivery date is 2026-10-07");

// 6. Wednesday 12:00:00 PM BST (06:00:00 UTC) -> SATURDAY delivery
const test6 = getDeliveryWindow("2026-10-07T06:00:00.000Z");
assertEqual(test6.deliveryDay, "SATURDAY", "6. Wednesday 12:00:00 PM -> Saturday delivery");
assertEqual(test6.deliveryDate, "2026-10-10", "6. Wednesday 12:00:00 PM delivery date is 2026-10-10");

// 7. Thursday (any time) -> SATURDAY delivery
const test7 = getDeliveryWindow("2026-10-08T09:00:00.000Z"); // Thursday 3:00 PM BST
assertEqual(test7.deliveryDay, "SATURDAY", "7. Thursday -> Saturday delivery");
assertEqual(test7.deliveryDate, "2026-10-10", "7. Thursday delivery date is 2026-10-10");

// 8. Friday (any time) -> SATURDAY delivery
const test8 = getDeliveryWindow("2026-10-09T08:00:00.000Z"); // Friday 2:00 PM BST
assertEqual(test8.deliveryDay, "SATURDAY", "8. Friday -> Saturday delivery");
assertEqual(test8.deliveryDate, "2026-10-10", "8. Friday delivery date is 2026-10-10");

// 9. Saturday 11:59:59 AM BST (05:59:59 UTC) -> SATURDAY delivery
const test9 = getDeliveryWindow("2026-10-10T05:59:59.000Z");
assertEqual(test9.deliveryDay, "SATURDAY", "9. Saturday 11:59:59 AM -> Saturday delivery");
assertEqual(test9.deliveryDate, "2026-10-10", "9. Saturday 11:59:59 AM delivery date is 2026-10-10");

// 10. Saturday 12:00:00 PM BST (06:00:00 UTC) -> MONDAY delivery
const test10 = getDeliveryWindow("2026-10-10T06:00:00.000Z");
assertEqual(test10.deliveryDay, "MONDAY", "10. Saturday 12:00:00 PM -> Monday delivery");
assertEqual(test10.deliveryDate, "2026-10-12", "10. Saturday 12:00:00 PM delivery date is 2026-10-12");

// 11. Saturday afternoon/evening -> MONDAY delivery
const test11 = getDeliveryWindow("2026-10-10T11:00:00.000Z"); // Saturday 5:00 PM BST
assertEqual(test11.deliveryDay, "MONDAY", "11. Saturday afternoon/evening -> Monday delivery");
assertEqual(test11.deliveryDate, "2026-10-12", "11. Saturday evening delivery date is 2026-10-12");

// 12. Sunday (any time) -> MONDAY delivery
const test12 = getDeliveryWindow("2026-10-11T10:00:00.000Z"); // Sunday 4:00 PM BST
assertEqual(test12.deliveryDay, "MONDAY", "12. Sunday -> Monday delivery");
assertEqual(test12.deliveryDate, "2026-10-12", "12. Sunday delivery date is 2026-10-12");

// Exact Millisecond Cutoff Tests
const exactMonBefore = getDeliveryWindow("2026-10-05T05:59:59.999Z");
assertEqual(exactMonBefore.deliveryDay, "MONDAY", "11:59:59.999 BST on Monday is MONDAY delivery");
const exactMonAfter = getDeliveryWindow("2026-10-05T06:00:00.000Z");
assertEqual(exactMonAfter.deliveryDay, "WEDNESDAY", "12:00:00.000 BST on Monday is WEDNESDAY delivery");

// Month/Year Boundaries
const dec31 = getDeliveryWindow("2026-12-31T08:00:00.000Z"); // Dec 31, 2026 Thursday 2PM -> Saturday Jan 2, 2027
assertEqual(dec31.deliveryDay, "SATURDAY", "Year boundary delivery day");
assertEqual(dec31.deliveryDate, "2027-01-02", "Year boundary delivery date (2027-01-02)");

const feb28 = getDeliveryWindow("2027-02-28T05:00:00.000Z"); // Feb 28, 2027 Sunday 11AM -> Monday Mar 1, 2027
assertEqual(feb28.deliveryDay, "MONDAY", "Month boundary delivery day");
assertEqual(feb28.deliveryDate, "2027-03-01", "Month boundary delivery date (2027-03-01)");

// -------------------------------------------------------------
// COMBINED INVOICE GROUPING TESTS
// -------------------------------------------------------------

// 13. Same pharmacy + multiple Monday-before-cutoff orders -> ONE Monday invoice
const mockOrdersMonBefore: Order[] = [
  {
    id: "ord-mon-1",
    readableId: "MCH-M1",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 1000,
    totalSavings: 100,
    totalMrp: 1100,
    estimatedDelivery: "2026-10-05",
    createdAt: "2026-10-05T03:00:00.000Z", // Monday 9:00 AM BST
    items: [{ productId: "p1", name: "Napa", strength: "500mg", packSize: "Box 100", quantity: 10, sellingPrice: 100, mrp: 110, subtotal: 1000 }]
  },
  {
    id: "ord-mon-2",
    readableId: "MCH-M2",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 2000,
    totalSavings: 200,
    totalMrp: 2200,
    estimatedDelivery: "2026-10-05",
    createdAt: "2026-10-05T04:30:00.000Z", // Monday 10:30 AM BST
    items: [{ productId: "p2", name: "Ace Plus", strength: "500+65mg", packSize: "Box 100", quantity: 20, sellingPrice: 100, mrp: 110, subtotal: 2000 }]
  },
  {
    id: "ord-mon-3",
    readableId: "MCH-M3",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 500,
    totalSavings: 50,
    totalMrp: 550,
    estimatedDelivery: "2026-10-05",
    createdAt: "2026-10-05T05:45:00.000Z", // Monday 11:45 AM BST
    items: [{ productId: "p3", name: "Ceevit", strength: "250mg", packSize: "Box 50", quantity: 5, sellingPrice: 100, mrp: 110, subtotal: 500 }]
  }
];

const monGroups = groupOrdersByDeliverySchedule(mockOrdersMonBefore);
assertEqual(monGroups.length, 1, "13. Same pharmacy + multiple Monday-before-cutoff orders -> ONE invoice group");
assertEqual(monGroups[0].deliverySchedule, "MONDAY", "13. Group delivery schedule is MONDAY");
assertEqual(monGroups[0].orders.length, 3, "13. Contains all 3 orders");
assertEqual(monGroups[0].subtotal, 3500, "13. Subtotal = 1000 + 2000 + 500 = 3500");
assertEqual(monGroups[0].deliveryCharge, 40, "13. Single ৳40 delivery charge applied");
assertEqual(monGroups[0].grandTotal, 3540, "13. Grand total = 3540");

// 14. Same pharmacy + Monday-before-cutoff + Monday-after-cutoff -> separate Monday and Wednesday invoices
const mockOrdersMonSplit: Order[] = [
  mockOrdersMonBefore[0], // Monday 9:00 AM BST -> Monday
  mockOrdersMonBefore[1], // Monday 10:30 AM BST -> Monday
  {
    id: "ord-mon-after",
    readableId: "MCH-M4",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 800,
    totalSavings: 80,
    totalMrp: 880,
    estimatedDelivery: "2026-10-07",
    createdAt: "2026-10-05T07:00:00.000Z", // Monday 1:00 PM BST -> Wednesday delivery
    items: [{ productId: "p4", name: "Seclo", strength: "20mg", packSize: "Box 50", quantity: 8, sellingPrice: 100, mrp: 110, subtotal: 800 }]
  }
];

const monSplitGroups = groupOrdersByDeliverySchedule(mockOrdersMonSplit);
assertEqual(monSplitGroups.length, 2, "14. Same pharmacy + Monday before and after cutoff -> 2 separate invoice groups");
const monGroup = monSplitGroups.find(g => g.deliverySchedule === "MONDAY");
const wedGroup = monSplitGroups.find(g => g.deliverySchedule === "WEDNESDAY");
if (!monGroup || !wedGroup) throw new Error("14. Expected both Monday and Wednesday groups");
assertEqual(monGroup.orders.length, 2, "14. Monday invoice contains 2 orders");
assertEqual(wedGroup.orders.length, 1, "14. Wednesday invoice contains 1 order");

// 15. Same pharmacy + Wednesday-before-cutoff orders -> ONE Wednesday invoice
const mockOrdersWed: Order[] = [
  {
    id: "ord-wed-1",
    readableId: "MCH-W1",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 1200,
    totalSavings: 100,
    totalMrp: 1300,
    estimatedDelivery: "2026-10-07",
    createdAt: "2026-10-07T03:00:00.000Z", // Wednesday 9:00 AM BST
    items: [{ productId: "p1", name: "Napa", strength: "500mg", packSize: "Box 100", quantity: 12, sellingPrice: 100, mrp: 108.33, subtotal: 1200 }]
  },
  {
    id: "ord-wed-2",
    readableId: "MCH-W2",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 800,
    totalSavings: 50,
    totalMrp: 850,
    estimatedDelivery: "2026-10-07",
    createdAt: "2026-10-07T05:30:00.000Z", // Wednesday 11:30 AM BST
    items: [{ productId: "p2", name: "Ace Plus", strength: "500+65mg", packSize: "Box 100", quantity: 8, sellingPrice: 100, mrp: 106.25, subtotal: 800 }]
  }
];

const wedGroups = groupOrdersByDeliverySchedule(mockOrdersWed);
assertEqual(wedGroups.length, 1, "15. Wednesday before cutoff orders -> ONE Wednesday invoice");
assertEqual(wedGroups[0].deliverySchedule, "WEDNESDAY", "15. Delivery schedule is WEDNESDAY");
assertEqual(wedGroups[0].subtotal, 2000, "15. Subtotal = 2000");
assertEqual(wedGroups[0].deliveryCharge, 40, "15. Single ৳40 delivery charge");

// 16. Same pharmacy + Wednesday-before-cutoff + Wednesday-after-cutoff -> separate Wednesday and Saturday invoices
const mockOrdersWedSplit: Order[] = [
  ...mockOrdersWed,
  {
    id: "ord-wed-after",
    readableId: "MCH-W3",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 1500,
    totalSavings: 150,
    totalMrp: 1650,
    estimatedDelivery: "2026-10-10",
    createdAt: "2026-10-07T08:00:00.000Z", // Wednesday 2:00 PM BST -> Saturday
    items: [{ productId: "p5", name: "Tofen", strength: "1mg", packSize: "Box 50", quantity: 15, sellingPrice: 100, mrp: 110, subtotal: 1500 }]
  }
];

const wedSplitGroups = groupOrdersByDeliverySchedule(mockOrdersWedSplit);
assertEqual(wedSplitGroups.length, 2, "16. Separate Wednesday and Saturday invoices");
const wGroup = wedSplitGroups.find(g => g.deliverySchedule === "WEDNESDAY");
const sGroup = wedSplitGroups.find(g => g.deliverySchedule === "SATURDAY");
if (!wGroup || !sGroup) throw new Error("16. Expected both Wednesday and Saturday groups");
assertEqual(wGroup.orders.length, 2, "16. Wednesday invoice has 2 orders");
assertEqual(sGroup.orders.length, 1, "16. Saturday invoice has 1 order");

// 17. Same pharmacy + Saturday-before-cutoff + Saturday-after-cutoff -> separate Saturday and Monday invoices
const mockOrdersSatSplit: Order[] = [
  {
    id: "ord-sat-1",
    readableId: "MCH-S1",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 1000,
    totalSavings: 100,
    totalMrp: 1100,
    estimatedDelivery: "2026-10-10",
    createdAt: "2026-10-10T04:00:00.000Z", // Saturday 10:00 AM BST -> Saturday
    items: [{ productId: "p1", name: "Napa", strength: "500mg", packSize: "Box 100", quantity: 10, sellingPrice: 100, mrp: 110, subtotal: 1000 }]
  },
  {
    id: "ord-sat-2",
    readableId: "MCH-S2",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 1200,
    totalSavings: 120,
    totalMrp: 1320,
    estimatedDelivery: "2026-10-12",
    createdAt: "2026-10-10T08:00:00.000Z", // Saturday 2:00 PM BST -> Monday
    items: [{ productId: "p2", name: "Ace Plus", strength: "500+65mg", packSize: "Box 100", quantity: 12, sellingPrice: 100, mrp: 110, subtotal: 1200 }]
  }
];

const satSplitGroups = groupOrdersByDeliverySchedule(mockOrdersSatSplit);
assertEqual(satSplitGroups.length, 2, "17. Separate Saturday and Monday invoices");
assertEqual(satSplitGroups.find(g => g.deliverySchedule === "SATURDAY")?.orders.length, 1, "17. Saturday invoice has 1 order");
assertEqual(satSplitGroups.find(g => g.deliverySchedule === "MONDAY")?.orders.length, 1, "17. Monday invoice has 1 order");

// 18. Different pharmacies + same delivery date -> SEPARATE invoices
const mockOrdersMultiPharm: Order[] = [
  mockOrdersMonBefore[0], // Pharmacy A
  {
    id: "ord-pharm-b",
    readableId: "MCH-B1",
    pharmacyId: "pharm-b",
    pharmacyName: "Pharmacy B",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 1500,
    totalSavings: 150,
    totalMrp: 1650,
    estimatedDelivery: "2026-10-05",
    createdAt: "2026-10-05T03:30:00.000Z", // Monday 9:30 AM BST -> Monday
    items: [{ productId: "p1", name: "Napa", strength: "500mg", packSize: "Box 100", quantity: 15, sellingPrice: 100, mrp: 110, subtotal: 1500 }]
  }
];

const multiPharmGroups = groupOrdersByDeliverySchedule(mockOrdersMultiPharm);
assertEqual(multiPharmGroups.length, 2, "18. Different pharmacies + same delivery date -> separate invoices");
assertEqual(multiPharmGroups.filter(g => g.deliverySchedule === "MONDAY").length, 2, "18. Both have Monday delivery, but distinct groups for Pharmacy A and B");

// 19. Same pharmacy + different delivery dates -> SEPARATE invoices
const mockOrdersDiffDates: Order[] = [
  mockOrdersMonBefore[0], // Oct 5, 2026 Monday
  {
    id: "ord-next-mon",
    readableId: "MCH-NM1",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 900,
    totalSavings: 90,
    totalMrp: 990,
    estimatedDelivery: "2026-10-12",
    createdAt: "2026-10-12T03:00:00.000Z", // Next Monday Oct 12
    items: [{ productId: "p1", name: "Napa", strength: "500mg", packSize: "Box 100", quantity: 9, sellingPrice: 100, mrp: 110, subtotal: 900 }]
  }
];

const diffDateGroups = groupOrdersByDeliverySchedule(mockOrdersDiffDates);
assertEqual(diffDateGroups.length, 2, "19. Same pharmacy + different delivery dates -> separate invoices");

// 20. Idempotency test (repeating group calculation returns identical deterministic output)
const repeat1 = groupOrdersByDeliverySchedule(mockOrdersMonBefore);
const repeat2 = groupOrdersByDeliverySchedule(mockOrdersMonBefore);
assertEqual(repeat1[0].invoiceNumber, repeat2[0].invoiceNumber, "20. Invoice grouping is deterministic and idempotent");
assertEqual(repeat1[0].grandTotal, repeat2[0].grandTotal, "20. Totals are identical across repeated runs");

// 21. Historical orders preservation (Cancelled orders excluded, locked statuses respected)
const mockHistoricalOrders: Order[] = [
  ...mockOrdersMonBefore,
  {
    id: "ord-cancelled",
    readableId: "MCH-CANCELLED",
    pharmacyId: "pharm-a",
    pharmacyName: "Pharmacy A",
    status: "Cancelled",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 500,
    totalSavings: 50,
    totalMrp: 550,
    estimatedDelivery: "2026-10-05",
    createdAt: "2026-10-05T03:00:00.000Z",
    items: []
  }
];

const histGroups = groupOrdersByDeliverySchedule(mockHistoricalOrders);
assertEqual(histGroups[0].orders.length, 3, "21. Cancelled orders are strictly excluded from consolidation");
assertEqual(isOrderEligibleForConsolidation({ status: "Cancelled" }), false, "21. isOrderEligibleForConsolidation returns false for Cancelled");
assertEqual(isOrderEligibleForConsolidation({ status: "Packed" }), false, "21. isOrderEligibleForConsolidation returns false for Packed");
assertEqual(isOrderEligibleForConsolidation({ status: "Confirmed" }), true, "21. isOrderEligibleForConsolidation returns true for Confirmed");

// 22-24. Line Item Consolidation & Origin Traceability
const consolidatedItems = getConsolidatedLineItems(monGroups[0].orders);
assertEqual(consolidatedItems.items.length, 3, "22. All product line items preserved");
assertEqual(consolidatedItems.subtotal, 3500, "23. Consolidated subtotal matches");
assertEqual(monGroups[0].readableOrderIds, ["MCH-M1", "MCH-M2", "MCH-M3"], "24. Source orders fully traceable");

console.log("🎉 ALL 24 TESTS PASSED WITH 100% PRECISION!");
