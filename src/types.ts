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


