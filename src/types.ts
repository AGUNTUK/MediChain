/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  genericName: string;
  company: string;
  category: string;
  strength: string;
  packSize: string;
  mrp: number; // Maximum Retail Price
  sellingPrice: number; // Wholesale/MediChain price
  discountPercentage: number;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  imageUrl?: string;
  image_url?: string;
  barcode?: string;
  tiers?: BulkTier[];
  buyingPrice?: number | null; // Confidential internal cost (Admin only, null = unknown)
  unitGrossProfit?: number | null; // Admin only: sellingPrice - buyingPrice
  grossMarginPercent?: number | null; // Admin only: unit gross margin %
}

export interface CartItem {
  product: Product;
  quantity: number;
  basePrice?: number;
  effectiveUnitPrice?: number;
  itemSubtotal?: number;
  tiers?: BulkTier[];
  activeTier?: BulkTier | null;
  nextTier?: BulkTier | null;
  discountPercent?: number;
  isTierApplied?: boolean;
  tierSavings?: number;
}

export interface CartSummary {
  items: CartItem[];
  totalMrp: number;
  totalAmount: number;
  totalSavings: number;
}

export type VerificationStatus = "Pending" | "Under Review" | "Approved" | "Verified" | "Rejected" | "Suspended" | "pending" | "verified" | "suspended";

export interface Pharmacy {
  id: string;
  pharmacyName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  area: string;
  licenseNo: string;
  licenseDocumentUrl?: string;
  tradeLicenseNo?: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  
  // Custom Profile & KYC Verification Fields
  nidNumber?: string;
  nidOwnerName?: string;
  dob?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  nidUrl?: string;
  drugLicenseExpiry?: string;
  drugLicenseUrl?: string;
  tradeLicenseUrl?: string;
  drugLicensePath?: string;
  tradeLicensePath?: string;
  nidDocumentPath?: string;
  tinNumber?: string;
  division?: string;
  district?: string;
  thana?: string;
  upazila?: string;
  streetAddress?: string;
  logoUrl?: string;
  email?: string;
  status?: string;
  submittedAt?: string;

  // Regulatory & Legal Consent Audit Trail
  legalConsent?: {
    termsAcceptedAt: string;
    privacyPolicyVersion: string;
    ipAddress?: string;
    verifiedAuthenticityDeclaration: boolean;
  };
  legal_consent?: {
    terms_accepted_at: string;
    privacy_policy_version: string;
    ip_address?: string;
    verified_authenticity_declaration: boolean;
  };

  // WhatsApp Marketing Consent
  whatsappMarketingOptIn?: boolean;
  whatsappMarketingOptInAt?: string;
  whatsappMarketingOptInSource?: string;
  whatsappMarketingOptOutAt?: string;
}

export interface LegalConsent {
  termsAcceptedAt: string;
  privacyPolicyVersion: string;
  ipAddress?: string;
  verifiedAuthenticityDeclaration: boolean;
}

export type OrderStatus = "Pending" | "Confirmed" | "Processing" | "Packed" | "Out for Delivery" | "Delivered" | "Completed" | "Cancelled" | "Failed";

export interface OrderItem {
  productId: string;
  name: string;
  strength: string;
  packSize: string;
  quantity: number;
  sellingPrice: number;
  mrp: number;
  subtotal: number;
  genericName?: string;
  company?: string;
  category?: string;
  discountPercentage?: number;
  buyingPrice?: number | null; // Confidential historical snapshot (Admin only, null = unknown)
  lineSalesAmount?: number | null; // Historical snapshot: sellingPrice * quantity
  lineCostAmount?: number | null; // Historical snapshot: buyingPrice * quantity
  lineProfitAmount?: number | null; // Historical snapshot: lineSalesAmount - lineCostAmount
  unitGrossProfit?: number | null; // Admin only: sellingPrice - buyingPrice
  grossMarginPercent?: number | null; // Admin only: unit margin %
}

export interface Order {
  id: string;
  readableId?: string;
  pharmacyId: string;
  pharmacyName?: string;
  pharmacyPhone?: string;
  pharmacyOwner?: string;
  pharmacyAddress?: string;
  pharmacyLicense?: string;
  pharmacyBin?: string;
  salesRep?: string;
  status: OrderStatus;
  paymentMethod: "Cash on Delivery";
  paymentStatus: "Pending" | "Paid" | "Failed" | "Refunded";
  totalAmount: number;
  totalSavings: number;
  totalMrp: number;
  deliveryCharge?: number;
  items: OrderItem[];
  notes?: string;
  deliveryAddress?: string;
  createdAt: string;
  estimatedDelivery: string;
  hasReturnRequested?: boolean;
  returnReason?: string;
  returnStatus?: "None" | "Pending" | "Approved" | "Rejected";
  assignedRiderId?: string;
  handoverOtp?: string;
  pickedBy?: string;
  pickerName?: string;
  pickStartedAt?: string;
  pickCompletedAt?: string;
  packedBy?: string;
  packerName?: string;
  packedAt?: string;
  isBatchPicked?: boolean;
  batchId?: string;
  unverifiedPicksCount?: number;
  amendments?: OrderAmendment[];
  // Internal Financial Analytics (Admin only)
  totalCogs?: number | null; // Sum of line COGS for items with known buying price
  grossProfit?: number | null; // Sales revenue minus totalCogs
  grossMarginPercent?: number | null; // Overall gross margin %
  deliveryCost?: number; // Internal delivery expense (BDT 40 per order)
  deliveryExpense?: number; // Internal delivery expense alias
  netProfit?: number | null; // grossProfit - deliveryCost (null if COGS incomplete)
  hasUnknownCostItems?: boolean; // Flag indicating if any item has unknown buying price
  // Delivery Schedule & Consolidated Invoice Attributes
  deliverySchedule?: "MONDAY" | "WEDNESDAY" | "SATURDAY" | "SUNDAY" | "TUESDAY" | "FRIDAY";
  deliveryDate?: string; // YYYY-MM-DD
  deliveryWindowKey?: string; // e.g. "WEDNESDAY_2026-10-07"
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  deliveryScheduleLabel?: string;
  combinedInvoiceId?: string;
  isInvoiceLocked?: boolean;
  consolidatedOrderIds?: string[];
}

export interface OrderAmendment {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  removedQuantity: number;
  reason?: string;
  amendedBy: string;
  amendedAt: string;
}

export interface StaffPerformanceMetric {
  staffId: string;
  staffName: string;
  role?: string;
  ordersPickedToday: number;
  ordersPickedThisWeek: number;
  ordersPackedToday: number;
  totalOrdersHandled: number;
  totalItemsPicked: number;
  avgPickDurationSeconds: number;
  unverifiedPicksCount: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_role: string;
  action: string;
  module: string;
  description: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  role_target?: string;
  title: string;
  message: string;
  type: string;
  targetType?: string;
  related_id?: string;
  is_read: boolean;
  read?: boolean;
  created_at: string;
}


export interface NotificationPreference {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
}

export interface Favourite {
  productId: string;
}

export type UserRole = "Pharmacy Owner" | "Admin" | "Depot Staff" | "Delivery Staff";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  email?: string;
}

export type RiderDutyStatus = "On Duty" | "Off Duty" | "On Break";
export type VehicleType = "Motorcycle" | "Bicycle" | "Scooter" | "Delivery Van" | "Pickup";

export interface RiderProfile {
  id?: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  drivingLicenseNo?: string;
  nidNumber?: string;
  zone: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  dutyStatus: RiderDutyStatus;
  avatarUrl?: string;
  joinedDate?: string;
  rating?: number;
  totalDelivered?: number;
  totalFailed?: number;
  totalCollected?: number;
  successRate?: number;
  todayDelivered?: number;
  todayCollected?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  affectedModule: string;
  recordId: string;
}

export interface ImportHistoryEvent {
  id: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  failureCount: number;
  importedBy: string;
  date: string;
  status: "Completed" | "With Errors";
}


export interface TrustBadgeItem {
  icon: "shield" | "lightning" | "truck" | "check" | "star";
  label: string;
}

export interface BulkCampaign {
  id: string;
  title: string;
  subtext?: string;
  description?: string;
  banner_color?: string;
  banner_image_url?: string;
  cta_text?: string;
  cta_link?: string;
  status: "Draft" | "Live" | "Expired";
  featured_product_id?: string;
  featured_product?: Product;
  discount_display_percent?: number;
  trust_badges?: TrustBadgeItem[];
  start_at?: string;
  end_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface BulkTier {
  minQty: number;
  discountPercent: number;
}

export interface BulkCampaignProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  tiers: BulkTier[];
  created_at: string;
  product?: Product;
}

export type RestockRequestStatus = "pending" | "restocked" | "cancelled" | "Pending" | "Restocked" | "Cancelled";

export interface RestockRequest {
  id: string;
  productId: string;
  productName?: string;
  pharmacyId?: string;
  requestedByUserId?: string;
  requestedQuantity?: number;
  status: RestockRequestStatus;
  createdAt: string;
  updatedAt?: string;
  notifiedAt?: string;
  resolvedAt?: string | null;
  notificationSentAt?: string | null;
  product?: Product;
  pharmacy?: Pharmacy;
}

export interface RestockRequester {
  requestId: string;
  pharmacyId: string;
  pharmacyName: string;
  ownerName: string;
  phone: string;
  city: string;
  requestedQuantity: number;
  requestedAt: string;
  status: RestockRequestStatus;
  resolvedAt?: string | null;
}

export interface GroupedProductDemand {
  product: Product;
  totalRequests: number;
  uniquePharmaciesCount: number;
  pendingRequestsCount: number;
  latestRequestAt: string;
  earliestRequestAt: string;
  status: "pending" | "partially_resolved" | "restocked" | "cancelled";
  requesters: RestockRequester[];
}

export interface RestockMetrics {
  totalPendingRequests: number;
  uniqueProductsRequested: number;
  totalRequestingPharmacies: number;
  mostRequestedProduct: {
    productId: string;
    productName: string;
    genericName?: string;
    company?: string;
    requestCount: number;
    pharmaciesCount: number;
    currentStock: number;
  } | null;
  totalResolvedCount: number;
}

export interface CustomInvoiceItem {
  id: string;
  productId?: string;
  name: string;
  category?: string;
  strength?: string;
  packSize?: string;
  mrp: number;
  rate: number;
  quantity: number;
  discountPercentage?: number;
  netDiscount: number;
  total: number;
}

export interface CustomInvoiceData {
  id: string;
  invoiceNumber: string;
  orderRef?: string;
  createdAt: string;
  dueDate?: string;
  recipientType?: "institute" | "hospital" | "clinic" | "pharmacy" | "ngo" | "other";
  recipientName: string;
  contactPerson?: string;
  phone: string;
  address: string;
  licenseOrRegNo?: string;
  paymentMethod: string;
  paymentStatus: "Paid" | "Pending";
  items: CustomInvoiceItem[];
  subtotal: number;
  totalMrp: number;
  totalSavings: number;
  deliveryCharge: number;
  specialAdjustment: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  notes?: string;
  updatedAt?: string;
  totalCogs?: number | null;
  grossProfit?: number | null;
  hasUnknownCosts?: boolean;
  status?: "Saved" | "Voided" | "Paid";
  voidReason?: string;
}

// ==========================================
// UNIFIED ACCOUNTS & BUSINESS LEDGER TYPES
// ==========================================

export type ExpenseCategory =
  | "Transport" // Wholesaler Procurement / Market Transit
  | "Procurement"
  | "Delivery"
  | "Packaging"
  | "Office"
  | "Communication"
  | "Software"
  | "Marketing"
  | "Salary/Wages"
  | "Rent"
  | "Bank/Payment Fees"
  | "Miscellaneous";

export interface PurchaseItem {
  productId?: string;
  name: string;
  strength?: string;
  packSize?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  buyingPrice: number;
  totalCost: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  invoiceReference?: string;
  purchaseDate: string; // YYYY-MM-DD
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: "Paid" | "Partially Paid" | "Unpaid";
  paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Credit/Payable" | "Other";
  notes?: string;
  items?: PurchaseItem[];
  status: "Active" | "Voided";
  voidReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCollection {
  id: string;
  collectionNumber: string;
  pharmacyId?: string;
  customerName: string;
  collectionDate: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Card" | "Other";
  referenceInvoiceId?: string;
  notes?: string;
  status: "Active" | "Voided";
  voidReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessExpense {
  id: string;
  expenseNumber: string;
  expenseDate: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Card" | "Other";
  description: string;
  reference?: string;
  attachmentUrl?: string;
  status: "Active" | "Voided";
  voidReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapitalTransaction {
  id: string;
  transactionNumber: string;
  transactionDate: string; // YYYY-MM-DD
  type: "Contribution" | "Withdrawal";
  partnerName: string;
  amount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Other";
  reference?: string;
  notes?: string;
  status: "Active" | "Voided";
  voidReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyLedgerSummary {
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "06 Oct 2026"
  purchases: number;
  deliveredSales: number;
  deliveryChargeCollected: number; // Delivery charge revenue (+) earned per customer invoice
  customerCollections: number;
  customerOutstanding: number;
  cogs: number;
  grossProfit: number; // (deliveredSales - cogs) + deliveryChargeCollected
  transportExpenses: number; // Wholesaler procurement & market transit cost (-)
  deliveryExpenses: number; // Last-mile delivery / execution cost (-)
  otherExpenses: number; // Overheads, packaging, salary, misc (-)
  netProfit: number; // grossProfit - transportExpenses - deliveryExpenses - otherExpenses
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  capitalContributions: number;
  capitalWithdrawals: number;
  ordersCount: number;
  invoicesCount: number;
  hasIncompleteCost: boolean;
  isClosed?: boolean;
  isOverridden?: boolean;
  overrideNotes?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  rawCalculated?: {
    purchases: number;
    deliveredSales: number;
    deliveryChargeCollected: number;
    customerCollections: number;
    cogs: number;
    grossProfit: number;
    transportExpenses: number;
    deliveryExpenses: number;
    otherExpenses: number;
    netProfit: number;
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
  };
}

export interface DailyLedgerOverride {
  date: string;
  purchases?: number;
  deliveredSales?: number;
  deliveryChargeCollected?: number;
  customerCollections?: number;
  cogs?: number;
  transportExpenses?: number;
  deliveryExpenses?: number;
  otherExpenses?: number;
  cashIn?: number;
  cashOut?: number;
  notes?: string;
  editedBy?: string;
  editedAt?: string;
}

export interface AccountsOverviewData {
  todaySummary: DailyLedgerSummary;
  dateRangeSummary: DailyLedgerSummary;
  totalReceivables: number;
  totalPayables: number;
  totalCapital: number;
  currentInventoryValue: number;
  missingCostCount: number;
  totalDeliveredOrders: number;
  totalActiveInvoices: number;
}

export interface CustomerReceivableItem {
  id: string;
  sourceType: "Order" | "Combined Invoice" | "Custom Invoice";
  customerName: string;
  pharmacyId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  collectedAmount: number;
  dueAmount: number;
  lastCollectionDate?: string;
  status: "Paid" | "Partially Paid" | "Outstanding";
  deliverySchedule?: string;
}

export interface SupplierPayableItem {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "Paid" | "Partially Paid" | "Unpaid";
  notes?: string;
}

export interface ReconciliationReport {
  timestamp: string;
  checks: {
    name: string;
    description: string;
    sourceA: { name: string; value: number };
    sourceB: { name: string; value: number };
    difference: number;
    status: "PASS" | "WARNING" | "ERROR";
  }[];
  overallStatus: "PASS" | "WARNING" | "ERROR";
}

// ==========================================
// WHATSAPP BUSINESS MARKETING TYPES
// ==========================================

export type WhatsAppCampaignStatus = "draft" | "ready" | "in_progress" | "completed" | "archived";
export type WhatsAppRecipientStatus = "pending" | "opened" | "sent" | "skipped" | "failed" | "invalid";

export interface WhatsAppAudienceFilter {
  segment: "all" | "all_opted_in" | "active_buyers" | "frequent_buyers" | "first_order" | "high_value" | "inactive" | "all_verified";
  city?: string;
  minOrderCount?: number;
  minPurchaseAmount?: number;
  search?: string;
  selectedPharmacyIds?: string[];
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  messageTemplate: string;
  imageUrl?: string;
  audienceFilter: WhatsAppAudienceFilter;
  totalAudience: number;
  eligibleCount: number;
  sentCount: number;
  openedCount: number;
  skippedCount: number;
  invalidCount: number;
  status: WhatsAppCampaignStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  recipients?: WhatsAppCampaignRecipient[];
}

export interface WhatsAppCampaignRecipient {
  id: string;
  campaignId: string;
  pharmacyId: string;
  pharmacyName: string;
  ownerName: string;
  rawPhone: string;
  formattedWhatsappNumber?: string;
  personalizedMessage: string;
  waMeUrl?: string;
  status: WhatsAppRecipientStatus;
  openedAt?: string;
  sentAt?: string;
  skippedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type WhatsAppTemplateCategory =
  | "Promotion"
  | "Product Discount"
  | "New Product"
  | "Announcement"
  | "Festival Offer"
  | "Reminder"
  | "Custom";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: WhatsAppTemplateCategory;
  message: string;
  imageUrl?: string;
  isArchived: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppAudienceStats {
  totalPharmacies: number;
  optedInCount: number;
  optedOutCount: number;
  missingPhoneCount: number;
  validBangladeshNumbersCount: number;
  invalidNumbersCount: number;
}




