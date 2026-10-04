import { getDeliveryWindow, isOrderEligibleForConsolidation, groupOrdersByDeliverySchedule, getConsolidatedLineItems } from "../src/lib/deliverySchedule";
import { Order } from "../src/types";

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

console.log("=== RUNNING DELIVERY WINDOW & CONSOLIDATION TESTS ===");

// 1. Tuesday Cutoff Tests
// Tuesday 4:59 PM BST = 10:59 AM UTC (Before cutoff -> Tuesday delivery)
const tuesBefore = getDeliveryWindow("2026-10-06T10:59:59.000Z");
assertEqual(tuesBefore.deliveryDay, "TUESDAY", "Tuesday 4:59:59 PM BST -> TUESDAY delivery");
assertEqual(tuesBefore.deliveryDate, "2026-10-06", "Tuesday 4:59:59 PM BST delivery date is 2026-10-06");

// Tuesday 5:00 PM BST = 11:00 AM UTC (At cutoff -> FRIDAY delivery)
const tuesAt = getDeliveryWindow("2026-10-06T11:00:00.000Z");
assertEqual(tuesAt.deliveryDay, "FRIDAY", "Tuesday 5:00:00 PM BST -> FRIDAY delivery");
assertEqual(tuesAt.deliveryDate, "2026-10-09", "Tuesday 5:00:00 PM BST delivery date is 2026-10-09");

// 2. Friday Cutoff Tests
// Friday 4:59 PM BST = 10:59 AM UTC (Before cutoff -> Friday delivery)
const friBefore = getDeliveryWindow("2026-10-09T10:59:59.000Z");
assertEqual(friBefore.deliveryDay, "FRIDAY", "Friday 4:59:59 PM BST -> FRIDAY delivery");
assertEqual(friBefore.deliveryDate, "2026-10-09", "Friday 4:59:59 PM BST delivery date is 2026-10-09");

// Friday 5:00 PM BST = 11:00 AM UTC (At cutoff -> SUNDAY delivery)
const friAt = getDeliveryWindow("2026-10-09T11:00:00.000Z");
assertEqual(friAt.deliveryDay, "SUNDAY", "Friday 5:00:00 PM BST -> SUNDAY delivery");
assertEqual(friAt.deliveryDate, "2026-10-11", "Friday 5:00:00 PM BST delivery date is 2026-10-11");

// 3. Sunday Cutoff Tests
// Sunday 4:59 PM BST = 10:59 AM UTC (Before cutoff -> Sunday delivery)
const sunBefore = getDeliveryWindow("2026-10-11T10:59:59.000Z");
assertEqual(sunBefore.deliveryDay, "SUNDAY", "Sunday 4:59:59 PM BST -> SUNDAY delivery");
assertEqual(sunBefore.deliveryDate, "2026-10-11", "Sunday 4:59:59 PM BST delivery date is 2026-10-11");

// Sunday 5:00 PM BST = 11:00 AM UTC (At cutoff -> TUESDAY delivery)
const sunAt = getDeliveryWindow("2026-10-11T11:00:00.000Z");
assertEqual(sunAt.deliveryDay, "TUESDAY", "Sunday 5:00:00 PM BST -> TUESDAY delivery");
assertEqual(sunAt.deliveryDate, "2026-10-13", "Sunday 5:00:00 PM BST delivery date is 2026-10-13");

// Sunday 5:01 PM BST = 11:01 AM UTC (After cutoff -> TUESDAY delivery)
const sunAfter = getDeliveryWindow("2026-10-11T11:01:00.000Z");
assertEqual(sunAfter.deliveryDay, "TUESDAY", "Sunday 5:01:00 PM BST -> TUESDAY delivery");
assertEqual(sunAfter.deliveryDate, "2026-10-13", "Sunday 5:01:00 PM BST delivery date is 2026-10-13");

// 4. Intermediate Days Tests
// Wednesday 12:00 PM BST (Friday window)
const wed = getDeliveryWindow("2026-10-07T06:00:00.000Z");
assertEqual(wed.deliveryDay, "FRIDAY", "Wednesday 12:00 PM BST -> FRIDAY delivery");
assertEqual(wed.deliveryDate, "2026-10-09", "Wednesday delivery date is 2026-10-09");

// Thursday 3:00 PM BST (Friday window)
const thu = getDeliveryWindow("2026-10-08T09:00:00.000Z");
assertEqual(thu.deliveryDay, "FRIDAY", "Thursday 3:00 PM BST -> FRIDAY delivery");

// Saturday 12:00 PM BST (Sunday window)
const sat = getDeliveryWindow("2026-10-10T06:00:00.000Z");
assertEqual(sat.deliveryDay, "SUNDAY", "Saturday 12:00 PM BST -> SUNDAY delivery");
assertEqual(sat.deliveryDate, "2026-10-11", "Saturday delivery date is 2026-10-11");

// Monday 10:00 AM BST (Tuesday window)
const mon = getDeliveryWindow("2026-10-12T04:00:00.000Z");
assertEqual(mon.deliveryDay, "TUESDAY", "Monday 10:00 AM BST -> TUESDAY delivery");
assertEqual(mon.deliveryDate, "2026-10-13", "Monday delivery date is 2026-10-13");

// 5. Month and Year Boundaries
// Dec 31, 2026 (Thursday) 6:00 PM BST -> Friday Jan 1, 2027 delivery
const dec31 = getDeliveryWindow("2026-12-31T12:00:00.000Z");
assertEqual(dec31.deliveryDay, "FRIDAY", "Dec 31, 2026 Thursday 6PM -> FRIDAY Jan 1, 2027 delivery");
assertEqual(dec31.deliveryDate, "2027-01-01", "Year boundary delivery date");

// Feb 28, 2027 (Sunday) 5:30 PM BST -> Tuesday Mar 2, 2027 delivery
const feb28 = getDeliveryWindow("2027-02-28T11:30:00.000Z");
assertEqual(feb28.deliveryDay, "TUESDAY", "Feb 28, 2027 Sunday 5:30PM -> TUESDAY Mar 2, 2027 delivery");
assertEqual(feb28.deliveryDate, "2027-03-02", "Month boundary delivery date");

// 6. Order Consolidation Multi-Order Grouping & Single ৳40 Delivery Charge
const mockOrders: Order[] = [
  // Pharmacy 1: 3 orders in Friday Oct 9 window
  {
    id: "ord-1",
    readableId: "MCH-001",
    pharmacyId: "pharm-dontoh",
    pharmacyName: "Dontoh Pharmacy",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 1000,
    totalSavings: 200,
    totalMrp: 1200,
    estimatedDelivery: "2026-10-09",
    createdAt: "2026-10-08T09:00:00.000Z", // Thursday 3:00 PM BST
    items: [
      { productId: "p1", name: "Napa 500mg", strength: "500mg", packSize: "Box 100", quantity: 5, sellingPrice: 100, mrp: 120, subtotal: 500 },
      { productId: "p2", name: "Ace Plus", strength: "500+65mg", packSize: "Box 100", quantity: 5, sellingPrice: 100, mrp: 120, subtotal: 500 }
    ]
  },
  {
    id: "ord-2",
    readableId: "MCH-002",
    pharmacyId: "pharm-dontoh",
    pharmacyName: "Dontoh Pharmacy",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 2000,
    totalSavings: 400,
    totalMrp: 2400,
    estimatedDelivery: "2026-10-09",
    createdAt: "2026-10-09T04:00:00.000Z", // Friday 10:00 AM BST
    items: [
      { productId: "p1", name: "Napa 500mg", strength: "500mg", packSize: "Box 100", quantity: 10, sellingPrice: 100, mrp: 120, subtotal: 1000 },
      { productId: "p3", name: "Ceevit", strength: "250mg", packSize: "Box 100", quantity: 10, sellingPrice: 100, mrp: 120, subtotal: 1000 }
    ]
  },
  {
    id: "ord-3",
    readableId: "MCH-003",
    pharmacyId: "pharm-dontoh",
    pharmacyName: "Dontoh Pharmacy",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 500,
    totalSavings: 100,
    totalMrp: 600,
    estimatedDelivery: "2026-10-09",
    createdAt: "2026-10-09T10:55:00.000Z", // Friday 4:55 PM BST
    items: [
      { productId: "p4", name: "Seclo 20", strength: "20mg", packSize: "Box 50", quantity: 5, sellingPrice: 100, mrp: 120, subtotal: 500 }
    ]
  },
  // Pharmacy 1: 1 order in Sunday Oct 11 window (After Friday 5:00 PM BST)
  {
    id: "ord-4",
    readableId: "MCH-004",
    pharmacyId: "pharm-dontoh",
    pharmacyName: "Dontoh Pharmacy",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 800,
    totalSavings: 150,
    totalMrp: 950,
    estimatedDelivery: "2026-10-11",
    createdAt: "2026-10-09T11:01:00.000Z", // Friday 5:01 PM BST -> Sunday window
    items: [
      { productId: "p5", name: "Tofen", strength: "1mg", packSize: "Box 50", quantity: 8, sellingPrice: 100, mrp: 118.75, subtotal: 800 }
    ]
  },
  // Pharmacy 2: 1 order in Friday Oct 9 window
  {
    id: "ord-5",
    readableId: "MCH-005",
    pharmacyId: "pharm-city",
    pharmacyName: "City Pharma",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 1200,
    totalSavings: 200,
    totalMrp: 1400,
    estimatedDelivery: "2026-10-09",
    createdAt: "2026-10-09T08:00:00.000Z", // Friday 2:00 PM BST
    items: [
      { productId: "p1", name: "Napa 500mg", strength: "500mg", packSize: "Box 100", quantity: 12, sellingPrice: 100, mrp: 116.66, subtotal: 1200 }
    ]
  },
  // Cancelled order (must be excluded)
  {
    id: "ord-6-cancelled",
    readableId: "MCH-006",
    pharmacyId: "pharm-dontoh",
    pharmacyName: "Dontoh Pharmacy",
    status: "Cancelled",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 900,
    totalSavings: 100,
    totalMrp: 1000,
    estimatedDelivery: "2026-10-09",
    createdAt: "2026-10-09T07:00:00.000Z",
    items: []
  }
];

const groups = groupOrdersByDeliverySchedule(mockOrders);

assertEqual(groups.length, 3, "Total 3 distinct invoice groups generated (Dontoh Friday, Dontoh Sunday, City Friday)");

const dontohFriday = groups.find(g => g.pharmacyId === "pharm-dontoh" && g.deliverySchedule === "FRIDAY");
if (!dontohFriday) throw new Error("Dontoh Friday group not found");

assertEqual(dontohFriday.orders.length, 3, "Dontoh Friday group has 3 consolidated orders");
assertEqual(dontohFriday.orderIds, ["ord-1", "ord-2", "ord-3"], "Order IDs correctly tracked");
assertEqual(dontohFriday.readableOrderIds, ["MCH-001", "MCH-002", "MCH-003"], "Readable Order IDs correctly tracked");
assertEqual(dontohFriday.subtotal, 3500, "Subtotal is sum of orders (1000 + 2000 + 500 = 3500)");
assertEqual(dontohFriday.deliveryCharge, 40, "Delivery charge is exactly ONE single ৳40 fee");
assertEqual(dontohFriday.grandTotal, 3540, "Grand total is 3500 + 40 = 3540");

const dontohSunday = groups.find(g => g.pharmacyId === "pharm-dontoh" && g.deliverySchedule === "SUNDAY");
if (!dontohSunday) throw new Error("Dontoh Sunday group not found");
assertEqual(dontohSunday.orders.length, 1, "Dontoh Sunday has only 1 order (Order 4 placed at 5:01 PM)");
assertEqual(dontohSunday.readableOrderIds, ["MCH-004"], "Dontoh Sunday order is MCH-004");

const cityFriday = groups.find(g => g.pharmacyId === "pharm-city" && g.deliverySchedule === "FRIDAY");
if (!cityFriday) throw new Error("City Pharma Friday group not found");
assertEqual(cityFriday.orders.length, 1, "City Pharma Friday has only 1 order");

// Test Line Item Consolidation (Product p1 quantity combined across Order 1 and Order 2)
const consolidatedItems = getConsolidatedLineItems(dontohFriday.orders);
const p1Consolidated = consolidatedItems.items.find(i => i.productId === "p1");
assertEqual(p1Consolidated?.quantity, 15, "Product p1 (Napa 500mg) combined quantity = 5 + 10 = 15");
assertEqual(p1Consolidated?.subtotal, 1500, "Product p1 combined subtotal = 1500");
assertEqual(p1Consolidated?.orderReferences, ["MCH-001", "MCH-002"], "Product p1 traces back to MCH-001 and MCH-002");

// 7. Packing / Locking Lifecycle Tests
const pendingOrder: Partial<Order> = { status: "Pending" };
const confirmedOrder: Partial<Order> = { status: "Confirmed" };
const processingOrder: Partial<Order> = { status: "Processing" };
const packedOrder: Partial<Order> = { status: "Packed" };
const outForDeliveryOrder: Partial<Order> = { status: "Out for Delivery" };
const deliveredOrder: Partial<Order> = { status: "Delivered" };
const cancelledOrder: Partial<Order> = { status: "Cancelled" };

assertEqual(isOrderEligibleForConsolidation(pendingOrder), true, "Pending order is eligible for consolidation");
assertEqual(isOrderEligibleForConsolidation(confirmedOrder), true, "Confirmed order is eligible for consolidation");
assertEqual(isOrderEligibleForConsolidation(processingOrder), true, "Processing order is eligible for consolidation");
assertEqual(isOrderEligibleForConsolidation(packedOrder), false, "Packed order is NOT eligible for new consolidation (locked)");
assertEqual(isOrderEligibleForConsolidation(outForDeliveryOrder), false, "Out for delivery order is NOT eligible for new consolidation (locked)");
assertEqual(isOrderEligibleForConsolidation(deliveredOrder), false, "Delivered order is NOT eligible for new consolidation (locked)");
assertEqual(isOrderEligibleForConsolidation(cancelledOrder), false, "Cancelled order is NEVER eligible for consolidation");

// 8. Exact Millisecond Cutoff Tests
// 16:59:59.999 BST (10:59:59.999 UTC) -> Current Window
const exactTuesdayBefore = getDeliveryWindow("2026-10-06T10:59:59.999Z");
assertEqual(exactTuesdayBefore.deliveryDay, "TUESDAY", "16:59:59.999 BST on Tuesday is still TUESDAY delivery");

// 17:00:00.000 BST (11:00:00.000 UTC) -> Next Window
const exactTuesdayAfter = getDeliveryWindow("2026-10-06T11:00:00.000Z");
assertEqual(exactTuesdayAfter.deliveryDay, "FRIDAY", "17:00:00.000 BST on Tuesday is FRIDAY delivery");

// 9. 5+ Orders in One Window (High Volume Pharmacy Consolidation)
const highVolumeOrders: Order[] = Array.from({ length: 6 }, (_, i) => ({
  id: `hv-ord-${i + 1}`,
  readableId: `MCH-HV${i + 1}`,
  pharmacyId: "pharm-apex",
  pharmacyName: "Apex Pharmacy",
  status: "Confirmed",
  paymentMethod: "Cash on Delivery",
  paymentStatus: "Pending",
  totalAmount: 1000,
  totalSavings: 200,
  totalMrp: 1200,
  estimatedDelivery: "2026-10-09",
  createdAt: "2026-10-08T09:00:00.000Z", // Thursday 3:00 PM BST
  items: [
    { productId: `p-${i}`, name: `Medicine ${i + 1}`, strength: "10mg", packSize: "Box 100", quantity: 10, sellingPrice: 100, mrp: 120, subtotal: 1000 }
  ]
}));

const highVolumeGroups = groupOrdersByDeliverySchedule(highVolumeOrders);
assertEqual(highVolumeGroups.length, 1, "6 orders from Apex Pharmacy in Friday window consolidated into EXACTLY 1 group");
assertEqual(highVolumeGroups[0].orders.length, 6, "All 6 orders present in the group");
assertEqual(highVolumeGroups[0].subtotal, 6000, "Subtotal is 6 * 1000 = 6000");
assertEqual(highVolumeGroups[0].deliveryCharge, 40, "Delivery charge is strictly ONE single ৳40 fee (NOT ৳40 * 6)");
assertEqual(highVolumeGroups[0].grandTotal, 6040, "Grand total is 6000 + 40 = 6040");

console.log("🎉 ALL TESTS PASSED WITH 100% PRECISION!");
