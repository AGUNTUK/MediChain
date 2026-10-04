/**
 * MediChain Delivery Schedule & Order Consolidation Engine
 * 
 * BUSINESS RULES:
 * - MediChain delivers only on: SUNDAY, TUESDAY, FRIDAY.
 * - Daily cut-off time is exactly 5:00 PM Bangladesh time (Asia/Dhaka, UTC+6:00).
 * - Orders from the same pharmacy in the same delivery window are consolidated into ONE invoice.
 * - At exactly 5:00 PM (17:00:00.000), orders belong to the NEXT delivery window.
 * 
 * WINDOWS:
 * 1. FRIDAY WINDOW:  Tuesday 5:00 PM -> Friday 5:00 PM  (Delivery: Friday)
 * 2. SUNDAY WINDOW:  Friday 5:00 PM -> Sunday 5:00 PM   (Delivery: Sunday)
 * 3. TUESDAY WINDOW: Sunday 5:00 PM -> Tuesday 5:00 PM  (Delivery: Tuesday)
 */

import { Order, OrderItem, Pharmacy } from "../types";

export type DeliveryScheduleDay = "SUNDAY" | "TUESDAY" | "FRIDAY";

export interface DeliveryWindowInfo {
  deliveryDay: DeliveryScheduleDay;
  deliveryDate: string; // YYYY-MM-DD
  windowKey: string; // e.g. "FRIDAY_2026-10-02"
  windowStart: string; // ISO string UTC
  windowEnd: string; // ISO string UTC
  deliveryScheduleLabel: string; // e.g. "Friday Delivery (Oct 2, 2026)"
  cutoffTimeLabel: string; // e.g. "5:00 PM BST"
  isBeforeCutoff: boolean;
  formattedDeliveryDate: string; // e.g. "Friday, Oct 2, 2026"
}

export interface ConsolidatedInvoiceGroup {
  groupKey: string; // `${pharmacyId}__${windowKey}`
  pharmacyId: string;
  pharmacyName: string;
  pharmacyOwner?: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  pharmacyLicense?: string;
  deliverySchedule: DeliveryScheduleDay;
  deliveryDate: string;
  windowKey: string;
  windowStart: string;
  windowEnd: string;
  deliveryScheduleLabel: string;
  invoiceNumber: string; // e.g. "INV-COMB-F034F-62EAD" or "INV-20261002-XXXX"
  orders: Order[];
  orderIds: string[];
  readableOrderIds: string[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  totalMrp: number;
  totalSavings: number;
  deliveryCharge: number; // 40 BDT single charge
  grandTotal: number;
  isLocked: boolean; // True if any order is Packed / Out for Delivery / Delivered
  lockReason?: string;
  statuses: string[];
  primaryStatus: string;
  createdAt: string;
}

const BD_TIMEZONE_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka is fixed UTC+6:00
export const DEFAULT_DELIVERY_CHARGE = 40; // Standard MediChain ৳40 per invoice

/**
 * Calculates the authoritative delivery window for any given order timestamp.
 * Guaranteed timezone-safe (Asia/Dhaka) regardless of server/client system clock.
 */
export function getDeliveryWindow(dateInput: string | Date | number): DeliveryWindowInfo {
  const d = typeof dateInput === "number" || typeof dateInput === "string" 
    ? new Date(dateInput) 
    : dateInput;

  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date input for getDeliveryWindow: ${dateInput}`);
  }

  // Shift UTC timestamp to Bangladesh local calendar time (UTC+6)
  const bdTime = new Date(d.getTime() + BD_TIMEZONE_OFFSET_MS);

  const year = bdTime.getUTCFullYear();
  const month = bdTime.getUTCMonth();
  const date = bdTime.getUTCDate();
  const day = bdTime.getUTCDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  const hours = bdTime.getUTCHours();
  const minutes = bdTime.getUTCMinutes();
  const seconds = bdTime.getUTCSeconds();
  const ms = bdTime.getUTCMilliseconds();

  // Exactly at 5:00:00.000 PM (hours >= 17), cutoff is reached and the order enters the NEXT window
  const isBefore5PM = (hours < 17);

  let deliveryDay: DeliveryScheduleDay;
  let daysToDelivery: number;
  let startOffsetDays: number;
  let endOffsetDays: number;

  if (day === 0) {
    // SUNDAY
    if (isBefore5PM) {
      deliveryDay = "SUNDAY";
      daysToDelivery = 0;
      startOffsetDays = -2; // Friday 5:00 PM was 2 days ago
      endOffsetDays = 0;    // Sunday 5:00 PM is today
    } else {
      deliveryDay = "TUESDAY";
      daysToDelivery = 2;   // Tuesday is in 2 days
      startOffsetDays = 0;  // Sunday 5:00 PM is today
      endOffsetDays = 2;    // Tuesday 5:00 PM is in 2 days
    }
  } else if (day === 1) {
    // MONDAY
    deliveryDay = "TUESDAY";
    daysToDelivery = 1;
    startOffsetDays = -1;   // Sunday 5:00 PM was 1 day ago
    endOffsetDays = 1;     // Tuesday 5:00 PM is tomorrow
  } else if (day === 2) {
    // TUESDAY
    if (isBefore5PM) {
      deliveryDay = "TUESDAY";
      daysToDelivery = 0;
      startOffsetDays = -2; // Sunday 5:00 PM was 2 days ago
      endOffsetDays = 0;    // Tuesday 5:00 PM is today
    } else {
      deliveryDay = "FRIDAY";
      daysToDelivery = 3;   // Friday is in 3 days
      startOffsetDays = 0;  // Tuesday 5:00 PM is today
      endOffsetDays = 3;    // Friday 5:00 PM is in 3 days
    }
  } else if (day === 3) {
    // WEDNESDAY
    deliveryDay = "FRIDAY";
    daysToDelivery = 2;
    startOffsetDays = -1;   // Tuesday 5:00 PM was 1 day ago
    endOffsetDays = 2;     // Friday 5:00 PM is in 2 days
  } else if (day === 4) {
    // THURSDAY
    deliveryDay = "FRIDAY";
    daysToDelivery = 1;
    startOffsetDays = -2;   // Tuesday 5:00 PM was 2 days ago
    endOffsetDays = 1;     // Friday 5:00 PM is tomorrow
  } else if (day === 5) {
    // FRIDAY
    if (isBefore5PM) {
      deliveryDay = "FRIDAY";
      daysToDelivery = 0;
      startOffsetDays = -3; // Tuesday 5:00 PM was 3 days ago
      endOffsetDays = 0;    // Friday 5:00 PM is today
    } else {
      deliveryDay = "SUNDAY";
      daysToDelivery = 2;   // Sunday is in 2 days
      startOffsetDays = 0;  // Friday 5:00 PM is today
      endOffsetDays = 2;    // Sunday 5:00 PM is in 2 days
    }
  } else {
    // SATURDAY (day === 6)
    deliveryDay = "SUNDAY";
    daysToDelivery = 1;
    startOffsetDays = -1;   // Friday 5:00 PM was 1 day ago
    endOffsetDays = 1;     // Sunday 5:00 PM is tomorrow
  }

  // Calculate exact windowStart (at 17:00:00.000 BD time)
  const startBdDay = new Date(Date.UTC(year, month, date + startOffsetDays, 17, 0, 0, 0));
  const windowStartUtc = new Date(startBdDay.getTime() - BD_TIMEZONE_OFFSET_MS);

  // Calculate exact windowEnd (at 17:00:00.000 BD time)
  const endBdDay = new Date(Date.UTC(year, month, date + endOffsetDays, 17, 0, 0, 0));
  const windowEndUtc = new Date(endBdDay.getTime() - BD_TIMEZONE_OFFSET_MS);

  // Target Delivery calendar date in BD (YYYY-MM-DD)
  const delivBdDay = new Date(Date.UTC(year, month, date + daysToDelivery, 0, 0, 0, 0));
  const delivYear = delivBdDay.getUTCFullYear();
  const delivMonth = String(delivBdDay.getUTCMonth() + 1).padStart(2, "0");
  const delivDate = String(delivBdDay.getUTCDate()).padStart(2, "0");
  const deliveryDateStr = `${delivYear}-${delivMonth}-${delivDate}`;

  const windowKey = `${deliveryDay}_${deliveryDateStr}`;

  // Month names for clean readable labels
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullDays = { SUNDAY: "Sunday", TUESDAY: "Tuesday", FRIDAY: "Friday" };
  const formattedDeliveryDate = `${fullDays[deliveryDay]}, ${monthNames[delivBdDay.getUTCMonth()]} ${delivBdDay.getUTCDate()}, ${delivYear}`;
  const deliveryScheduleLabel = `${fullDays[deliveryDay]} Delivery (${monthNames[delivBdDay.getUTCMonth()]} ${delivBdDay.getUTCDate()}, ${delivYear})`;

  return {
    deliveryDay,
    deliveryDate: deliveryDateStr,
    windowKey,
    windowStart: windowStartUtc.toISOString(),
    windowEnd: windowEndUtc.toISOString(),
    deliveryScheduleLabel,
    cutoffTimeLabel: "5:00 PM BST",
    isBeforeCutoff: isBefore5PM,
    formattedDeliveryDate
  };
}

/**
 * Checks if an order is eligible to be consolidated into a combined delivery invoice.
 * Eligible: Pre-packing statuses (Pending, Confirmed, Processing).
 * Ineligible: Cancelled, Failed, or already Locked for Packing (Packed, Out for Delivery, Delivered, Completed).
 */
export function isOrderEligibleForConsolidation(order: Order | any): boolean {
  if (!order) return false;
  const status = (order.status || "").toLowerCase();
  if (status === "cancelled" || status === "failed") {
    return false;
  }
  // If order has already progressed to Packed, Out for Delivery, Delivered, or Completed, it is locked.
  if (["packed", "out for delivery", "delivered", "completed"].includes(status)) {
    return false;
  }
  return true;
}

/**
 * Checks if an order group/invoice is locked due to packing/delivery progression.
 */
export function isOrderLocked(order: Order | any): boolean {
  if (!order) return false;
  const status = (order.status || "").toLowerCase();
  return ["packed", "out for delivery", "delivered", "completed"].includes(status);
}

/**
 * Consolidates a list of orders into grouped invoices based on:
 * Pharmacy ID + Delivery Window Key (Delivery Schedule + Delivery Date).
 */
export function groupOrdersByDeliverySchedule(
  orders: Order[],
  pharmaciesMap?: Record<string, Pharmacy>
): ConsolidatedInvoiceGroup[] {
  const groups: Record<string, ConsolidatedInvoiceGroup> = {};

  for (const order of orders) {
    // Skip cancelled orders from consolidated invoices
    if ((order.status || "").toLowerCase() === "cancelled") {
      continue;
    }

    const createdAt = order.createdAt || new Date().toISOString();
    const windowInfo = getDeliveryWindow(createdAt);

    const pharmacyId = order.pharmacyId || "unknown";
    const groupKey = `${pharmacyId}__${windowInfo.windowKey}`;

    const pharm = pharmaciesMap ? pharmaciesMap[pharmacyId] : undefined;
    const phName = pharm?.pharmacyName || order.pharmacyName || "Wholesale Partner";
    const phOwner = pharm?.ownerName || order.pharmacyOwner || "";
    const phPhone = pharm?.phone || order.pharmacyPhone || "";
    const phAddr = pharm?.address || order.deliveryAddress || "";
    const phLicense = pharm?.licenseNo || (pharm as any)?.licenseNumber || order.pharmacyLicense || "";

    const isLockedStatus = isOrderLocked(order);

    if (!groups[groupKey]) {
      // Deterministic invoice number for the combined group
      const cleanDate = windowInfo.deliveryDate.replace(/-/g, "");
      const readableIdPart = (order.readableId || order.id || "").replace("MCH-", "").slice(0, 5).toUpperCase();
      const invoiceNumber = `INV-${cleanDate}-${readableIdPart}`;

      groups[groupKey] = {
        groupKey,
        pharmacyId,
        pharmacyName: phName,
        pharmacyOwner: phOwner,
        pharmacyPhone: phPhone,
        pharmacyAddress: phAddr,
        pharmacyLicense: phLicense,
        deliverySchedule: windowInfo.deliveryDay,
        deliveryDate: windowInfo.deliveryDate,
        windowKey: windowInfo.windowKey,
        windowStart: windowInfo.windowStart,
        windowEnd: windowInfo.windowEnd,
        deliveryScheduleLabel: windowInfo.deliveryScheduleLabel,
        invoiceNumber,
        orders: [],
        orderIds: [],
        readableOrderIds: [],
        itemCount: 0,
        totalQuantity: 0,
        subtotal: 0,
        totalMrp: 0,
        totalSavings: 0,
        deliveryCharge: DEFAULT_DELIVERY_CHARGE,
        grandTotal: DEFAULT_DELIVERY_CHARGE,
        isLocked: isLockedStatus,
        lockReason: isLockedStatus ? `Order ${order.readableId || order.id} is already ${order.status}` : undefined,
        statuses: [],
        primaryStatus: order.status,
        createdAt: order.createdAt || new Date().toISOString()
      };
    }

    const group = groups[groupKey];
    group.orders.push(order);
    group.orderIds.push(order.id);
    group.readableOrderIds.push(order.readableId || order.id);

    if (!group.statuses.includes(order.status)) {
      group.statuses.push(order.status);
    }

    if (isLockedStatus) {
      group.isLocked = true;
      group.lockReason = `Locked: order ${order.readableId || order.id} reached ${order.status}`;
    }

    // Accumulate items and pricing
    const orderItems = order.items || [];
    group.itemCount += orderItems.length;
    for (const it of orderItems) {
      const qty = it.quantity || 0;
      const price = it.sellingPrice || 0;
      const mrp = it.mrp || (price * 1.25);
      group.totalQuantity += qty;
      group.subtotal += price * qty;
      group.totalMrp += mrp * qty;
      group.totalSavings += Math.max(0, (mrp - price) * qty);
    }
  }

  // Finalize totals for each group with ONE delivery charge (৳40)
  return Object.values(groups).map(group => {
    group.subtotal = Math.round(group.subtotal * 100) / 100;
    group.totalMrp = Math.round(group.totalMrp * 100) / 100;
    group.totalSavings = Math.round(group.totalSavings * 100) / 100;
    group.grandTotal = Math.round((group.subtotal + group.deliveryCharge) * 100) / 100;

    // Pick dominant representative status
    if (group.statuses.includes("Delivered")) group.primaryStatus = "Delivered";
    else if (group.statuses.includes("Out for Delivery")) group.primaryStatus = "Out for Delivery";
    else if (group.statuses.includes("Packed")) group.primaryStatus = "Packed";
    else if (group.statuses.includes("Processing")) group.primaryStatus = "Processing";
    else if (group.statuses.includes("Confirmed")) group.primaryStatus = "Confirmed";
    else group.primaryStatus = group.statuses[0] || "Pending";

    // Format readable combined invoice number
    if (group.readableOrderIds.length > 1) {
      const cleanDate = group.deliveryDate.replace(/-/g, "").slice(2); // YYMMDD
      const shortCodes = group.readableOrderIds.map(id => id.replace("MCH-", "").slice(0, 4)).join("-");
      group.invoiceNumber = `INV-COMB-${cleanDate}-${shortCodes}`.slice(0, 30);
    }

    return group;
  });
}

/**
 * Merges all order items from multiple orders into a consolidated item list.
 * Identical products are aggregated together with their quantities combined.
 */
export function getConsolidatedLineItems(orders: Order[]): {
  items: (OrderItem & { orderReferences: string[] })[];
  subtotal: number;
  totalMrp: number;
  totalSavings: number;
} {
  const itemMap: Record<string, OrderItem & { orderReferences: string[] }> = {};
  let subtotal = 0;
  let totalMrp = 0;
  let totalSavings = 0;

  for (const order of orders) {
    const orderRef = order.readableId || order.id;
    for (const itm of order.items || []) {
      const key = `${itm.productId}_${itm.sellingPrice}`;
      const qty = itm.quantity || 0;
      const price = itm.sellingPrice || 0;
      const mrp = itm.mrp || (price * 1.25);
      const lineSubtotal = price * qty;
      const lineMrp = mrp * qty;

      subtotal += lineSubtotal;
      totalMrp += lineMrp;
      totalSavings += Math.max(0, lineMrp - lineSubtotal);

      if (!itemMap[key]) {
        itemMap[key] = {
          ...itm,
          quantity: qty,
          subtotal: lineSubtotal,
          orderReferences: [orderRef]
        };
      } else {
        itemMap[key].quantity += qty;
        itemMap[key].subtotal += lineSubtotal;
        if (!itemMap[key].orderReferences.includes(orderRef)) {
          itemMap[key].orderReferences.push(orderRef);
        }
      }
    }
  }

  return {
    items: Object.values(itemMap),
    subtotal: Math.round(subtotal * 100) / 100,
    totalMrp: Math.round(totalMrp * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100
  };
}
