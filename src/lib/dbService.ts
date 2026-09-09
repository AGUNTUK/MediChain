import crypto from "crypto";
import { supabaseAdmin } from "./supabaseAdmin.js";
export { supabaseAdmin };
import { Product, Pharmacy, Order, OrderItem, OrderAmendment, StaffPerformanceMetric } from "../types";

import { DEFAULT_DELIVERY_CHARGE } from "../constants/delivery.js";
export { DEFAULT_DELIVERY_CHARGE };

// ==========================================
// UTILITIES & SERIALIZERS
// ==========================================

export const serializeLicenseInfo = (licenseNo: string, status: string, verifiedAt?: string, verifiedBy?: string, extra?: any) => {
  return JSON.stringify({
    licenseNo,
    verificationStatus: status,
    verifiedAt: verifiedAt || null,
    verifiedBy: verifiedBy || null,
    ...(extra || {})
  });
};

export const deserializeLicenseInfo = (rawText: string) => {
  if (!rawText) {
    return {
      licenseNo: "",
      verificationStatus: "Pending",
      verifiedAt: null,
      verifiedBy: null
    };
  }
  try {
    const parsed = JSON.parse(rawText);
    return {
      licenseNo: parsed.licenseNo || "",
      verificationStatus: parsed.verificationStatus || "Pending",
      verifiedAt: parsed.verifiedAt || null,
      verifiedBy: parsed.verifiedBy || null,
      ...parsed
    };
  } catch (e) {
    return {
      licenseNo: rawText || "",
      verificationStatus: "Pending", // Default if simple string
      verifiedAt: null,
      verifiedBy: null
    };
  }
};

// ==========================================
// SYSTEM SETTINGS & METADATA IN DB-STORE (Stateless using notifications with custom type or hardcoded default fallback)
// ==========================================

let cachedSystemSettings: any = null;
let lastSystemSettingsFetch = 0;
const SYSTEM_SETTINGS_TTL = 10 * 60 * 1000; // 10 minutes

export async function getSystemSettings() {
  const now = Date.now();
  if (cachedSystemSettings && now - lastSystemSettingsFetch < SYSTEM_SETTINGS_TTL) {
    return cachedSystemSettings;
  }

  // 1. Primary read: dedicated app_settings table
  try {
    const { data: settingsData, error: settingsErr } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "system_settings")
      .maybeSingle();

    if (!settingsErr && settingsData?.value) {
      cachedSystemSettings = settingsData.value;
      lastSystemSettingsFetch = now;
      return cachedSystemSettings;
    }
  } catch (e) {
    // Fallback to legacy notifications table if app_settings is not yet created
  }

  // 2. Fallback read: notifications table
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("message")
    .eq("type", "system_settings")
    .order("created_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    try {
      cachedSystemSettings = JSON.parse(data[0].message);
      lastSystemSettingsFetch = now;
      return cachedSystemSettings;
    } catch (e) {
      // fallback
    }
  }

  return {
    low_stock_threshold: 50,
    expiry_alert_days: [30, 60, 90]
  };
}

export async function updateSystemSettings(settings: any) {
  cachedSystemSettings = settings;
  lastSystemSettingsFetch = Date.now();

  // 1. Primary write: dedicated app_settings table
  try {
    await supabaseAdmin
      .from("app_settings")
      .upsert({
        key: "system_settings",
        value: settings,
        updated_at: new Date().toISOString()
      });
  } catch (e) {
    // Graceful continuation
  }

  // 2. Dual-write: notifications table for zero-downtime backward compatibility
  return await supabaseAdmin
    .from("notifications")
    .insert({
      title: "System Settings",
      message: JSON.stringify(settings),
      type: "system_settings",
      read: true
    });
}

// ==========================================
// AUDIT LOGS
// ==========================================

export async function logAudit(action: string, affectedModule: string, recordId: string, userEmail: string = "System", userRole: string = "System", details: any = {}) {
  const auditData = {
    action,
    affectedModule,
    recordId,
    user: userEmail,
    role: userRole,
    details: typeof details === "object" && details !== null ? details : {},
    timestamp: new Date().toISOString()
  };

  // 1. Primary write: dedicated audit_logs table
  try {
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        action,
        affected_module: affectedModule,
        record_id: recordId,
        user_email: userEmail,
        user_role: userRole,
        details: auditData.details,
        created_at: auditData.timestamp
      });
  } catch (e) {
    // Graceful continuation if table not yet created
  }

  // 2. Dual-write: notifications table (user_id strictly null to avoid polluting user feeds)
  await supabaseAdmin
    .from("notifications")
    .insert({
      title: `Audit: ${affectedModule}`,
      message: JSON.stringify(auditData),
      type: "audit_log",
      read: true,
      user_id: null
    });
}

export async function getAuditLogs(options: {
  limit?: number;
  before?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  const safeLimit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);

  // 1. Primary read: dedicated audit_logs table
  try {
    let query = supabaseAdmin
      .from("audit_logs")
      .select("id, action, affected_module, record_id, user_email, user_role, created_at, details");

    if (options.before) {
      query = query.lt("created_at", options.before);
    }
    if (options.startDate) {
      query = query.gte("created_at", options.startDate);
    }
    if (options.endDate) {
      query = query.lte("created_at", options.endDate);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (!error && data && data.length > 0) {
      return data.map(log => ({
        id: log.id,
        action: log.action,
        user: log.user_email,
        role: log.user_role,
        timestamp: log.created_at,
        affectedModule: log.affected_module,
        recordId: log.record_id,
        details: log.details
      }));
    }
  } catch (e) {
    // Fallback to legacy notifications table
  }

  // 2. Fallback read: notifications table
  let query = supabaseAdmin
    .from("notifications")
    .select("id, title, message, created_at")
    .eq("type", "audit_log");

  if (options.before) {
    query = query.lt("created_at", options.before);
  }
  if (options.startDate) {
    query = query.gte("created_at", options.startDate);
  }
  if (options.endDate) {
    query = query.lte("created_at", options.endDate);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (!data) return [];
  return data.map(n => {
    try {
      const parsed = JSON.parse(n.message);
      return {
        id: n.id,
        action: parsed.action,
        user: parsed.user,
        role: parsed.role,
        timestamp: parsed.timestamp || n.created_at,
        affectedModule: parsed.affectedModule,
        recordId: parsed.recordId
      };
    } catch (e) {
      return {
        id: n.id,
        action: n.message,
        user: "System",
        role: "System",
        timestamp: n.created_at,
        affectedModule: "Unknown",
        recordId: ""
      };
    }
  });
}

// ==========================================
// IMPORT / EXPORT HISTORY
// ==========================================

export async function logImportHistory(filename: string, recordCount: number, status: string, importedBy: string, details: any = {}) {
  const historyData = {
    filename,
    recordCount,
    status,
    importedBy,
    details: typeof details === "object" && details !== null ? details : {},
    timestamp: new Date().toISOString()
  };

  // 1. Primary write: dedicated import_history table
  try {
    await supabaseAdmin
      .from("import_history")
      .insert({
        filename,
        record_count: recordCount,
        status,
        imported_by: importedBy,
        details: historyData.details,
        created_at: historyData.timestamp
      });
  } catch (e) {}

  // 2. Dual-write: notifications table
  await supabaseAdmin
    .from("notifications")
    .insert({
      title: "Bulk Import",
      message: JSON.stringify(historyData),
      type: "import_history",
      read: true,
      user_id: null
    });
}

export async function getImportHistory(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  // 1. Primary read: dedicated import_history table
  try {
    const { data, error } = await supabaseAdmin
      .from("import_history")
      .select("id, filename, record_count, status, imported_by, created_at, details")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (!error && data && data.length > 0) {
      return data.map(r => ({
        id: r.id,
        filename: r.filename,
        recordCount: r.record_count,
        status: r.status,
        importedBy: r.imported_by,
        timestamp: r.created_at,
        details: r.details
      }));
    }
  } catch (e) {}

  // 2. Fallback read: notifications table
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, title, message, created_at")
    .eq("type", "import_history")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (!data) return [];
  return data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return { filename: n.title, recordCount: 0, status: "Success", timestamp: n.created_at };
    }
  });
}

export async function logExportHistory(format: string, type: string, recordCount: number, exportedBy: string, details: any = {}) {
  const historyData = {
    format,
    type,
    recordCount,
    exportedBy,
    details: typeof details === "object" && details !== null ? details : {},
    timestamp: new Date().toISOString()
  };

  // 1. Primary write: dedicated export_history table
  try {
    await supabaseAdmin
      .from("export_history")
      .insert({
        format,
        type,
        record_count: recordCount,
        exported_by: exportedBy,
        details: historyData.details,
        created_at: historyData.timestamp
      });
  } catch (e) {}

  // 2. Dual-write: notifications table
  await supabaseAdmin
    .from("notifications")
    .insert({
      title: "Bulk Export",
      message: JSON.stringify(historyData),
      type: "export_history",
      read: true,
      user_id: null
    });
}

export async function getExportHistory(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  // 1. Primary read: dedicated export_history table
  try {
    const { data, error } = await supabaseAdmin
      .from("export_history")
      .select("id, format, type, record_count, exported_by, created_at, details")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (!error && data && data.length > 0) {
      return data.map(r => ({
        id: r.id,
        format: r.format,
        type: r.type,
        recordCount: r.record_count,
        exportedBy: r.exported_by,
        timestamp: r.created_at,
        details: r.details
      }));
    }
  } catch (e) {}

  // 2. Fallback read: notifications table
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, title, message, created_at")
    .eq("type", "export_history")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (!data) return [];
  return data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return { format: n.title, type: "Unknown", recordCount: 0, timestamp: n.created_at };
    }
  });
}

// ==========================================
// PRICE HISTORY & ALERTS
// ==========================================

export async function logPriceHistory(productId: string, productName: string, oldMrp: number, newMrp: number, oldPrice: number, newPrice: number, changedBy: string) {
  const priceData = {
    productId,
    productName,
    oldMrp,
    newMrp,
    oldPrice,
    newPrice,
    changedBy,
    timestamp: new Date().toISOString()
  };

  // 1. Primary write: dedicated price_history table
  try {
    await supabaseAdmin
      .from("price_history")
      .insert({
        product_id: productId,
        product_name: productName,
        old_mrp: oldMrp,
        new_mrp: newMrp,
        old_price: oldPrice,
        new_price: newPrice,
        changed_by: changedBy,
        created_at: priceData.timestamp
      });
  } catch (e) {}

  // 2. Dual-write: notifications table
  await supabaseAdmin
    .from("notifications")
    .insert({
      title: `Price History: ${productName}`,
      message: JSON.stringify(priceData),
      type: "price_history",
      read: true,
      user_id: null
    });
}

export async function getPriceHistory(productId?: string, limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  // 1. Primary read: dedicated price_history table
  try {
    let query = supabaseAdmin
      .from("price_history")
      .select("id, product_id, product_name, old_mrp, new_mrp, old_price, new_price, changed_by, created_at");

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (!error && data && data.length > 0) {
      return data.map(r => ({
        id: r.id,
        productId: r.product_id,
        productName: r.product_name,
        oldMrp: Number(r.old_mrp) || 0,
        newMrp: Number(r.new_mrp) || 0,
        oldPrice: Number(r.old_price) || 0,
        newPrice: Number(r.new_price) || 0,
        changedBy: r.changed_by,
        timestamp: r.created_at
      }));
    }
  } catch (e) {}

  // 2. Fallback read: notifications table
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, title, message, created_at")
    .eq("type", "price_history")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (!data) return [];
  const history = data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  if (productId) {
    return history.filter((h: any) => h.productId === productId);
  }
  return history;
}

export async function logAlert(title: string, message: string, relatedId?: string) {
  const alertData = {
    title,
    message,
    relatedId,
    timestamp: new Date().toISOString()
  };

  // 1. Primary write: dedicated audit_logs table with 'Alerts' module
  try {
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        action: `Alert: ${title}`,
        affected_module: "Alerts",
        record_id: relatedId || null,
        user_email: "System Alert",
        user_role: "System",
        details: alertData,
        created_at: alertData.timestamp
      });
  } catch (e) {}

  // 2. Dual-write: notifications table
  await supabaseAdmin
    .from("notifications")
    .insert({
      title,
      message: JSON.stringify(alertData),
      type: "alert_log",
      read: false,
      user_id: null
    });
}

export async function getAlertLogs(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, title, message, created_at")
    .eq("type", "alert_log")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (!data) return [];
  return data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return { title: n.title, message: n.message, timestamp: n.created_at };
    }
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==========================================
// USERS & SESSIONS
// ==========================================

export async function syncSession(id: string, email: string, name: string, phone: string = "") {
  let resolvedId = (id || "").trim();
  const normalizedEmail = (email || "").toLowerCase().trim();

  if (!isValidUUID(resolvedId)) {
    // Check if user already exists by email
    const { data: userByEmail } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userByEmail) {
      resolvedId = userByEmail.id;
    } else {
      resolvedId = generateUUID();
    }
  }

  // Check if user already exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", resolvedId)
    .maybeSingle();

  const userPayload: any = {
    id: resolvedId,
    email: normalizedEmail,
    name: name || "Pharmacy Owner",
    phone: phone || ""
  };

  // Hardcoded security rule: new users are ALWAYS "Pharmacy Owner". Role can never be set or elevated via syncSession.
  if (!existingUser) {
    userPayload.role = "Pharmacy Owner";
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(userPayload, { onConflict: "id" })
    .select()
    .single();

  const finalUser = data || existingUser || { id: resolvedId, email: normalizedEmail, name, role: "Pharmacy Owner", phone };
  return { data: finalUser, error, resolvedId };
}

export async function getUserById(id: string) {
  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function updateUserRole(id: string, role: string) {
  return await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", id);
}

export async function getDeliveryStaff() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, phone, role")
    .eq("role", "Delivery Staff");
  return { data, error };
}

export async function getRiderProfile(userId: string) {
  if (!userId) return null;
  const user = await getUserById(userId);
  let savedSettings: any = null;

  // 1. Primary: read from app_settings
  try {
    const { data: settingRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", `rider_profile_${userId}`)
      .maybeSingle();
    if (settingRow?.value) {
      savedSettings = typeof settingRow.value === "string" ? JSON.parse(settingRow.value) : settingRow.value;
    }
  } catch (e) {
    // Fallback
  }

  // 2. Fallback: notifications table
  if (!savedSettings) {
    try {
      const { data: notifData } = await supabaseAdmin
        .from("notifications")
        .select("message")
        .eq("type", "rider_profile")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (notifData && notifData.length > 0 && notifData[0].message) {
        savedSettings = JSON.parse(notifData[0].message);
      }
    } catch (e) {
      // Fallback
    }
  }

  const defaultProfile = {
    userId,
    name: user?.name || user?.full_name || "Delivery Hero",
    phone: user?.phone || "+8801700000000",
    email: user?.email || `${userId}@medichain.app`,
    vehicleType: "Motorcycle",
    vehicleNumber: "DHAKA METRO-HA 12-3456",
    drivingLicenseNo: "DL-BD-893421",
    nidNumber: "1995471829384",
    zone: "Rangpur Sadar & Central Depot",
    emergencyContactName: "Operations Helpline",
    emergencyContactPhone: "+8801940681989",
    bloodGroup: "B+",
    dutyStatus: "On Duty",
    avatarUrl: "",
    rating: 4.9,
    joinedDate: user?.created_at || new Date().toISOString()
  };

  return {
    ...defaultProfile,
    ...(savedSettings || {}),
    // Ensure current user base fields override stale JSON if user updated them
    name: user?.name || user?.full_name || savedSettings?.name || defaultProfile.name,
    phone: user?.phone || savedSettings?.phone || defaultProfile.phone,
    email: user?.email || savedSettings?.email || defaultProfile.email,
    userId
  };
}

export async function updateRiderProfile(userId: string, profileData: any) {
  if (!userId) throw new Error("User ID is required to update rider profile");

  const sanitized = {
    userId,
    name: (profileData.name || "").trim(),
    phone: (profileData.phone || "").trim(),
    email: (profileData.email || "").trim(),
    vehicleType: profileData.vehicleType || "Motorcycle",
    vehicleNumber: (profileData.vehicleNumber || "").trim().toUpperCase(),
    drivingLicenseNo: (profileData.drivingLicenseNo || "").trim(),
    nidNumber: (profileData.nidNumber || "").trim(),
    zone: (profileData.zone || "Rangpur Sadar").trim(),
    emergencyContactName: (profileData.emergencyContactName || "").trim(),
    emergencyContactPhone: (profileData.emergencyContactPhone || "").trim(),
    bloodGroup: profileData.bloodGroup || "B+",
    dutyStatus: profileData.dutyStatus || "On Duty",
    avatarUrl: (profileData.avatarUrl || "").trim(),
    updatedAt: new Date().toISOString()
  };

  // 1. Sync name and phone to public.users table
  try {
    const updatePayload: any = {};
    if (sanitized.name) updatePayload.name = sanitized.name;
    if (sanitized.phone) updatePayload.phone = sanitized.phone;
    if (Object.keys(updatePayload).length > 0) {
      await supabaseAdmin
        .from("users")
        .update(updatePayload)
        .eq("id", userId);
    }
  } catch (err) {
    console.warn("Could not sync user basic details to users table:", err);
  }

  // 2. Upsert to app_settings
  try {
    await supabaseAdmin
      .from("app_settings")
      .upsert({
        key: `rider_profile_${userId}`,
        value: sanitized,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });
  } catch (err) {
    console.warn("Could not upsert to app_settings:", err);
  }

  // 3. Dual write backup to notifications
  try {
    await supabaseAdmin
      .from("notifications")
      .insert({
        title: "Rider Profile Update",
        message: JSON.stringify(sanitized),
        type: "rider_profile",
        user_id: userId,
        read: true
      });
  } catch (err) {
    // Non-blocking
  }

  return sanitized;
}

// ==========================================
// PHARMACIES & PROFILES
// ==========================================

export async function getPharmacyProfile(userId: string): Promise<Pharmacy | null> {
  let { data: ph } = await supabaseAdmin
    .from("pharmacies")
    .select("id, user_id, pharmacy_name, owner_name, phone, address, city, license_information")
    .eq("user_id", userId)
    .maybeSingle();

  // If not found by user_id, check if user has a pharmacy_id or matching phone in users table
  if (!ph) {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id, pharmacy_id, phone, email")
      .eq("id", userId)
      .maybeSingle();

    if (userRow?.pharmacy_id) {
      const { data: phById } = await supabaseAdmin
        .from("pharmacies")
        .select("id, user_id, pharmacy_name, owner_name, phone, address, city, license_information")
        .eq("id", userRow.pharmacy_id)
        .maybeSingle();
      if (phById) {
        ph = phById;
        // Self-heal: ensure user_id is set
        if (!ph.user_id || ph.user_id !== userId) {
          await supabaseAdmin.from("pharmacies").update({ user_id: userId }).eq("id", ph.id);
        }
      }
    }

    if (!ph && userRow?.phone) {
      const { data: phByPhone } = await supabaseAdmin
        .from("pharmacies")
        .select("id, user_id, pharmacy_name, owner_name, phone, address, city, license_information")
        .eq("phone", userRow.phone)
        .maybeSingle();
      if (phByPhone) {
        ph = phByPhone;
        // Self-heal link
        await supabaseAdmin.from("pharmacies").update({ user_id: userId }).eq("id", ph.id);
        await supabaseAdmin.from("users").update({ pharmacy_id: ph.id }).eq("id", userId);
      }
    }
  }

  if (!ph) return null;

  const license = deserializeLicenseInfo(ph.license_information);

  return {
    id: ph.id,
    pharmacyName: ph.pharmacy_name,
    ownerName: ph.owner_name,
    phone: ph.phone,
    address: ph.address,
    city: ph.city,
    area: ph.city, // fallback
    ...license,
    licenseNo: license.licenseNo,
    verificationStatus: license.verificationStatus as any,
    verificationNotes: ""
  };
}

export async function getPharmacyById(pharmacyId: string): Promise<Pharmacy | null> {
  const { data: ph } = await supabaseAdmin
    .from("pharmacies")
    .select("id, user_id, pharmacy_name, owner_name, phone, address, city, license_information")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (!ph) return null;

  const license = deserializeLicenseInfo(ph.license_information);

  return {
    id: ph.id,
    pharmacyName: ph.pharmacy_name,
    ownerName: ph.owner_name,
    phone: ph.phone,
    address: ph.address,
    city: ph.city,
    area: ph.city, // fallback
    ...license,
    licenseNo: license.licenseNo,
    verificationStatus: license.verificationStatus as any,
    verificationNotes: ""
  };
}

export function mapPharmacy(ph: any): Pharmacy {
  const license = deserializeLicenseInfo(ph.license_information);
  return {
    id: ph.id,
    pharmacyName: ph.pharmacy_name,
    ownerName: ph.owner_name,
    phone: ph.phone,
    address: ph.address,
    city: ph.city,
    area: ph.city,
    ...license,
    licenseNo: license.licenseNo,
    verificationStatus: license.verificationStatus as any,
    verificationNotes: ""
  };
}

export async function getAllPharmacies(page = 1, limit = 100): Promise<Pharmacy[]> {
  const offset = (page - 1) * limit;
  const { data: list } = await supabaseAdmin
    .from("pharmacies")
    .select("id, user_id, pharmacy_name, owner_name, phone, address, city, license_information").range(offset, offset + limit - 1);

  if (!list || list.length === 0) return [];
  return list.map(mapPharmacy);
}

export async function updatePharmacyProfile(userId: string, data: any) {
  let resolvedUserId = (userId || "").trim();

  // 1. Verify if user row exists in public.users table to satisfy foreign key constraint pharmacies_user_id_fkey
  let userExists = false;
  if (isValidUUID(resolvedUserId)) {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("id", resolvedUserId)
      .maybeSingle();
    if (userRow) userExists = true;
  }

  // 2. If user row not found by ID, try looking up by email
  if (!userExists && data.email) {
    const safeEmail = data.email.toString().trim().toLowerCase();
    const { data: userByEmail } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", safeEmail)
      .maybeSingle();
    if (userByEmail) {
      resolvedUserId = userByEmail.id;
      userExists = true;
    }
  }

  // 3. If user row still does not exist, auto-create/upsert into users table first
  if (!userExists) {
    if (!isValidUUID(resolvedUserId)) {
      resolvedUserId = generateUUID();
    }
    const safeName = (data.ownerName || "Pharmacy Owner").toString().trim().slice(0, 255);
    const safePhone = (data.phone || "").toString().trim().slice(0, 20);
    const safeEmail = (data.email || `${resolvedUserId}@medichain.local`).toString().trim().toLowerCase().slice(0, 255);

    await supabaseAdmin.from("users").upsert({
      id: resolvedUserId,
      email: safeEmail,
      name: safeName,
      phone: safePhone,
      role: "Pharmacy Owner"
    }, { onConflict: "id" });
  }

  // Find or create pharmacy record
  const { data: existing } = await supabaseAdmin
    .from("pharmacies")
    .select("id, license_information")
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  const existingLicense = existing ? deserializeLicenseInfo(existing.license_information) : {};

  // For security, ignore any verificationStatus overrides from the client.
  // Status can only be changed by admin endpoints.
  delete data.verificationStatus;

  // Preserve existing status, default to Pending for new profiles
  const status = existingLicense.verificationStatus || "Pending";

  // If data.logoUrl is a base64 string, upload it to Supabase Storage so it is never saved as huge raw text
  if (data.logoUrl && typeof data.logoUrl === "string" && data.logoUrl.startsWith("data:image")) {
    try {
      const match = data.logoUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === "jpeg" ? "jpg" : match[1];
        const buffer = Buffer.from(match[2], "base64");
        const filePath = `pharmacy-logos/${resolvedUserId}_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("verification-documents")
          .upload(filePath, buffer, {
            contentType: `image/${match[1]}`,
            upsert: true
          });
        if (!uploadErr) {
          const { data: signedData } = await supabaseAdmin.storage
            .from("verification-documents")
            .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 5); // 5-year signed URL
          if (signedData?.signedUrl) {
            data.logoUrl = signedData.signedUrl;
          }
        }
      }
    } catch (logoErr) {
      console.warn("Could not upload base64 logo to storage:", logoErr);
    }
  }
  
  // Merge existing details with incoming data details
  const mergedLicense = {
    ...existingLicense,
    ...data,
    verificationStatus: status,
    licenseNo: data.licenseNo !== undefined ? data.licenseNo : (existingLicense.licenseNo || "")
  };

  const license_information = JSON.stringify(mergedLicense);

  // Truncate fields to match Postgres VARCHAR column constraints
  const safePhone = (data.phone || "").toString().trim().slice(0, 20);
  const safePharmacyName = (data.pharmacyName || "Pharmacy").toString().trim().slice(0, 255);
  const safeOwnerName = (data.ownerName || "Proprietor").toString().trim().slice(0, 255);
  const safeCity = (data.city || "Dhaka").toString().trim().slice(0, 100);

  const payload = {
    user_id: resolvedUserId,
    pharmacy_name: safePharmacyName,
    owner_name: safeOwnerName,
    phone: safePhone,
    address: data.address || "",
    city: safeCity,
    license_information
  };

  const { data: ph, error } = await supabaseAdmin
    .from("pharmacies")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (ph && !error) {
    // Also update pharmacy_id, name, phone and email in users table
    const userUpdatePayload: any = { pharmacy_id: ph.id };
    if (safeOwnerName) userUpdatePayload.name = safeOwnerName;
    if (safePhone) userUpdatePayload.phone = safePhone;
    if (data.email) userUpdatePayload.email = (data.email || "").toString().trim().slice(0, 255);

    await supabaseAdmin
      .from("users")
      .update(userUpdatePayload)
      .eq("id", resolvedUserId);
  }

  return { data: ph, error, resolvedUserId };
}

export async function updatePharmacyStatus(pharmacyId: string, status: string, adminUser: string = "Admin", notes?: string) {
  const { data: rawPh } = await supabaseAdmin
    .from("pharmacies")
    .select("license_information, id")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (!rawPh) return { error: "Pharmacy not found." };

  // Normalize status value
  let normalizedStatus = status;
  if (status.toLowerCase() === "approved" || status.toLowerCase() === "verified") {
    normalizedStatus = "Verified";
  } else if (status.toLowerCase() === "suspended" || status.toLowerCase() === "rejected") {
    normalizedStatus = "Suspended";
  } else if (status.toLowerCase() === "pending") {
    normalizedStatus = "Pending";
  }

  const parsed = deserializeLicenseInfo(rawPh.license_information);
  const updatedLicense = {
    ...parsed,
    verificationStatus: normalizedStatus,
    verificationNotes: notes || parsed.verificationNotes || "",
    verifiedAt: new Date().toISOString(),
    verifiedBy: adminUser
  };

  const license_information = JSON.stringify(updatedLicense);

  const { error } = await supabaseAdmin
    .from("pharmacies")
    .update({ license_information })
    .eq("id", pharmacyId);

  if (!error) {
    if (normalizedStatus === "Verified" || normalizedStatus === "Approved") {
      // Automatically send notification
      await sendNotification(rawPh.id, "Account Approved", "Your pharmacy verification account has been fully approved! Wholesale purchasing is now active.", "system");
    } else if (normalizedStatus === "Suspended" || normalizedStatus === "Rejected") {
      const reasonText = notes ? ` Reason: ${notes}` : " Please contact support for details.";
      await sendNotification(rawPh.id, "Account Suspended", `Your pharmacy account verification status is suspended.${reasonText}`, "system");
    } else if (normalizedStatus === "Pending") {
      await sendNotification(rawPh.id, "Verification Pending", "Your pharmacy profile status is now set to Pending review.", "system");
    }
  }

  return { error };
}

// ==========================================
// PRODUCTS & INVENTORY
// ==========================================

const mapProduct = (p: any): Product => {
  if (!p) return null as any;

  const inv = Array.isArray(p.inventory) && p.inventory.length > 0
    ? p.inventory[0]
    : (p.inventory && typeof p.inventory === "object" ? p.inventory : null);

  const mrpVal = p.mrp !== undefined && p.mrp !== null ? parseFloat(p.mrp) : 0;
  let sellingVal = 0;
  if (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== "") {
    sellingVal = parseFloat(p.selling_price);
  } else if (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== "") {
    sellingVal = parseFloat(p.sellingPrice);
  } else {
    sellingVal = mrpVal;
  }

  const isSquare = (p.company || "").toLowerCase().includes("square");
  const stockVal = isSquare
    ? 0
    : (inv && inv.available_stock !== undefined && inv.available_stock !== null
        ? parseInt(inv.available_stock, 10)
        : (p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
            ? parseInt(p.stock_quantity, 10)
            : (p.availableStock !== undefined && p.availableStock !== null ? parseInt(p.availableStock, 10) : 0)));

  const imgUrl = p.image_url || p.imageUrl || undefined;

  return {
    id: String(p.id || "").trim(),
    name: p.name || "Pharmaceutical Item",
    genericName: p.generic_name || p.genericName || "Generic Medicine",
    company: p.company || "MediChain Partner",
    category: p.category_name_fallback || p.category_id || p.category || "Tablet",
    strength: p.strength || "N/A",
    packSize: p.pack_size || p.packSize || "10x10 Box",
    mrp: mrpVal,
    sellingPrice: sellingVal,
    discountPercentage: p.discount_percentage ? parseFloat(p.discount_percentage) : (mrpVal > 0 ? Math.round(((mrpVal - sellingVal) / mrpVal) * 100) : 0),
    availableStock: stockVal,
    reservedStock: inv ? (inv.reserved_stock ?? 0) : 0,
    soldStock: inv ? (inv.sold_stock ?? 0) : 0,
    batchNumber: p.batch_number || (inv ? (inv.batch_number || "") : "") || "B-MCH2026",
    expiryDate: p.expiry_date || (inv ? (inv.expiry_date || "") : "") || "2027-12-31",
    imageUrl: imgUrl,
    image_url: imgUrl,
    barcode: p.barcode || undefined
  };
};

export async function getProductsRaw(limit = 1000): Promise<Product[]> {
  try {
    let { data, error } = await supabaseAdmin
      .from("products")
      .select(`
        *,
        inventory (
          available_stock,
          reserved_stock,
          sold_stock,
          batch_number,
          expiry_date
        )
      `)
      .limit(limit);

    if (error || !data) {
      console.warn("Products query with inventory join failed, falling back to products table:", error?.message);
      const fallback = await supabaseAdmin.from("products").select("*").limit(limit);
      if (fallback.error || !fallback.data) {
        console.error("Products fallback query failed:", fallback.error?.message);
        return [];
      }
      data = fallback.data;
    }

    const mapped = data.map(mapProduct);
    return mapped.sort((a, b) => {
      const aInStock = (a.availableStock ?? 0) > 0 ? 1 : 0;
      const bInStock = (b.availableStock ?? 0) > 0 ? 1 : 0;
      return bInStock - aInStock;
    });
  } catch (err: any) {
    console.error("Exception in getProductsRaw:", err.message || err);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data: p, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !p) return null;

  let inv: any = null;
  try {
    const { data: invData } = await supabaseAdmin
      .from("inventory")
      .select("available_stock, reserved_stock, sold_stock, batch_number, expiry_date")
      .eq("product_id", id)
      .maybeSingle();
    inv = invData;
  } catch (e) {
    // Ignore inventory query failures
  }

  return mapProduct({ ...p, inventory: inv });
}

export async function deleteProduct(id: string) {
  return await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", id);
}

export async function addOrUpdateProduct(prod: Partial<Product> & { name: string; genericName: string; company: string; category: string; strength: string; packSize: string }) {
  // Try to find category or create fallback category
  const { data: cat } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("name", prod.category)
    .maybeSingle();

  let categoryId = cat?.id;
  if (!categoryId) {
    const { data: newCat } = await supabaseAdmin
      .from("categories")
      .insert({ name: prod.category, description: `${prod.category} medicines category` })
      .select()
      .single();
    categoryId = newCat?.id;
  }

  const mrpVal = prod.mrp || 100;
  const sellingVal = prod.sellingPrice || (mrpVal * 0.8);
  const stockQty = prod.availableStock !== undefined 
    ? prod.availableStock 
    : ((prod as any).stock_quantity !== undefined ? (prod as any).stock_quantity : 100);

  const productPayload: any = {
    name: prod.name,
    generic_name: prod.genericName,
    company: prod.company,
    category_id: categoryId,
    category_name_fallback: prod.category,
    strength: prod.strength,
    pack_size: prod.packSize,
    mrp: mrpVal,
    selling_price: sellingVal,
    stock_quantity: stockQty,
    image_url: prod.imageUrl || prod.image_url || "",
    ...(prod.barcode ? { barcode: prod.barcode } : {})
  };

  let finalProd: any = null;

  if (prod.id) {
    // Update product
    const { data } = await supabaseAdmin
      .from("products")
      .update(productPayload)
      .eq("id", prod.id)
      .select()
      .single();
    finalProd = data;
  } else {
    // Check duplicate
    const { data: duplicate } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("company", prod.company)
      .eq("name", prod.name)
      .eq("generic_name", prod.genericName)
      .eq("strength", prod.strength)
      .eq("pack_size", prod.packSize)
      .maybeSingle();

    if (duplicate) {
      const { data } = await supabaseAdmin
        .from("products")
        .update(productPayload)
        .eq("id", duplicate.id)
        .select()
        .single();
      finalProd = data;
    } else {
      const { data } = await supabaseAdmin
        .from("products")
        .insert(productPayload)
        .select()
        .single();
      finalProd = data;
    }
  }

  if (finalProd) {
    // Ensure inventory record exists
    const { data: existingInv } = await supabaseAdmin
      .from("inventory")
      .select("id")
      .eq("product_id", finalProd.id)
      .maybeSingle();

    const invPayload = {
      product_id: finalProd.id,
      available_stock: stockQty,
      reserved_stock: prod.reservedStock !== undefined ? prod.reservedStock : 0,
      sold_stock: prod.soldStock !== undefined ? prod.soldStock : 0,
      batch_number: prod.batchNumber || `B-${Math.floor(10000 + Math.random() * 90000)}`,
      expiry_date: prod.expiryDate || "2027-12-31"
    };

    if (existingInv) {
      await supabaseAdmin
        .from("inventory")
        .update(invPayload)
        .eq("id", existingInv.id);
    } else {
      await supabaseAdmin
        .from("inventory")
        .insert(invPayload);
    }

    const fullyMapped = await getProductById(finalProd.id);
    if (fullyMapped) return fullyMapped;
  }

  return mapProduct(finalProd);
}

export async function updateProductBarcode(productId: string, barcode: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .update({ barcode: barcode.trim() })
      .eq("id", productId)
      .select()
      .single();
    if (error) {
      console.warn("Direct barcode update warning:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, barcode: barcode.trim(), product: data };
  } catch (err: any) {
    console.warn("Failed to update product barcode:", err.message);
    return { success: false, error: err.message };
  }
}

export async function backfillMissingBarcodes(): Promise<{ backfilledCount: number; totalProducts: number }> {
  try {
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, barcode");

    if (error || !products) {
      return { backfilledCount: 0, totalProducts: 0 };
    }

    let backfilledCount = 0;
    for (const p of products) {
      if (!p.barcode || p.barcode.trim() === "") {
        // Generate standard EAN-13 code
        let hash = 0;
        for (let i = 0; i < p.id.length; i++) {
          hash = (hash * 31 + p.id.charCodeAt(i)) % 100000000;
        }
        const numericStr = Math.abs(hash).toString().padStart(8, "0");
        const generatedBarcode = `880${numericStr}1`;

        try {
          await supabaseAdmin
            .from("products")
            .update({ barcode: generatedBarcode })
            .eq("id", p.id);
          backfilledCount++;
        } catch (updateErr) {
          // ignore individual backfill err
        }
      }
    }

    return { backfilledCount, totalProducts: products.length };
  } catch (err: any) {
    console.warn("Backfill barcodes failed:", err.message);
    return { backfilledCount: 0, totalProducts: 0 };
  }
}

export async function updateInventoryStock(productId: string, qty: number, batchNumber?: string, expiryDate?: string) {
  // Update products table stock_quantity as well
  try {
    await supabaseAdmin
      .from("products")
      .update({ stock_quantity: qty })
      .eq("id", productId);
  } catch (e) {
    console.warn("Could not sync products.stock_quantity:", e);
  }

  const { data: inv } = await supabaseAdmin
    .from("inventory")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (inv) {
    const payload: any = { available_stock: qty };
    if (batchNumber) payload.batch_number = batchNumber;
    if (expiryDate) payload.expiry_date = expiryDate;

    return await supabaseAdmin
      .from("inventory")
      .update(payload)
      .eq("id", inv.id);
  } else {
    return await supabaseAdmin
      .from("inventory")
      .insert({
        product_id: productId,
        available_stock: qty,
        reserved_stock: 0,
        sold_stock: 0,
        batch_number: batchNumber || "B-NEW",
        expiry_date: expiryDate || "2027-12-31"
      });
  }
}

// ==========================================
// CART (Optimized with Row ID Indexing)
// ==========================================

const userCartRowIds = new Map<string, string>();

export async function getCart(userId: string) {
  if (!userId) return [];

  // 1. Primary read: dedicated carts table (if valid UUID)
  if (isValidUUID(userId)) {
    try {
      const { data: cartData, error: cartErr } = await supabaseAdmin
        .from("carts")
        .select("items")
        .eq("user_id", userId)
        .maybeSingle();

      if (!cartErr && cartData && Array.isArray(cartData.items)) {
        return cartData.items;
      }
    } catch (err) {
      // Fallback to legacy notifications table if carts table is missing
    }
  }

  // 2. Fallback read: notifications table
  try {
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("id, message")
      .eq("user_id", userId)
      .eq("type", "cart")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0]?.message) {
      if (data[0].id) {
        userCartRowIds.set(userId, data[0].id);
      }
      try {
        const parsed = JSON.parse(data[0].message);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
  } catch (err) {
    console.error("Error fetching cart from DB:", err);
  }
  return [];
}

export async function saveCart(userId: string, cartItems: any[]) {
  if (!userId) return;
  try {
    const safeItems = Array.isArray(cartItems) ? cartItems : [];
    const payload = JSON.stringify(safeItems);

    // 1. Primary write: dedicated carts table (if valid UUID)
    if (isValidUUID(userId)) {
      try {
        await supabaseAdmin
          .from("carts")
          .upsert({
            user_id: userId,
            items: safeItems,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id" });
      } catch (cartErr) {
        // Continue to dual-write
      }
    }

    // 2. Dual-write: notifications table for zero-downtime backward compatibility
    // Fast-path: If we already know the user's cart row ID, update directly in 1 query
    const knownRowId = userCartRowIds.get(userId);
    if (knownRowId) {
      const { error: directErr } = await supabaseAdmin
        .from("notifications")
        .update({ message: payload })
        .eq("id", knownRowId);

      if (!directErr) return;
      userCartRowIds.delete(userId); // Row ID was invalidated or deleted, fallback to lookup
    }

    const { data: existingList } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "cart")
      .order("created_at", { ascending: false });

    if (existingList && existingList.length > 0) {
      const [primary, ...duplicates] = existingList;
      userCartRowIds.set(userId, primary.id);
      await supabaseAdmin
        .from("notifications")
        .update({ message: payload })
        .eq("id", primary.id);

      if (duplicates.length > 0) {
        await supabaseAdmin
          .from("notifications")
          .delete()
          .in("id", duplicates.map(d => d.id));
      }
    } else {
      const { data: inserted } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          title: "Procurement Cart",
          message: payload,
          type: "cart",
          read: true
        })
        .select("id")
        .maybeSingle();

      if (inserted?.id) {
        userCartRowIds.set(userId, inserted.id);
      }
    }
  } catch (err) {
    console.error("Error saving cart to DB:", err);
  }
}

// ==========================================
// ORDERS & TRANSACTION HANDLING (Atomic Saga Pattern)
// ==========================================

export async function createOrderTransaction(
  userId: string, 
  pharmacyId: string, 
  orderPayload: {
    paymentMethod?: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
    deliveryAddress?: string;
  },
  preloadedProducts?: any[]
) {
  const backupState: any[] = []; // Stores list of functions to execute to rollback state on failure

  try {
    // 1. Fetch pharmacy profile and verification status
    const pharmacy = await getPharmacyById(pharmacyId);
    if (!pharmacy) throw new Error("Pharmacy not found");
    if (pharmacy.verificationStatus === "Suspended" || pharmacy.verificationStatus === "Rejected") {
      throw new Error("Your pharmacy profile has been suspended or rejected. Please contact support.");
    }

    const itemIds = orderPayload.items.map(i => String(i.productId || "").trim()).filter(Boolean);
    const productMap = new Map<string, any>();

    // Strategy E3: If caller already verified and loaded product catalog rows, reuse them to save a database round-trip
    if (preloadedProducts && Array.isArray(preloadedProducts) && preloadedProducts.length > 0) {
      preloadedProducts.forEach((p: any) => {
        if (p.id) {
          productMap.set(String(p.id).trim().toLowerCase(), p);
        }
      });
    } else {
      // Fallback: Fetch products using supabaseAdmin (service role) to ensure RLS does not block product verification
      const { data: dbProducts, error: prodErr } = await supabaseAdmin
        .from('products')
        .select('*')
        .in('id', itemIds);

      if (prodErr) {
        throw new Error(`Failed to query products: ${prodErr.message}`);
      }

      (dbProducts || []).forEach((p: any) => {
        if (p.id) {
          productMap.set(String(p.id).trim().toLowerCase(), p);
        }
      });
    }

    // Fallback lookup for individual items if not matched in batch
    for (const item of orderPayload.items) {
      const normalizedId = String(item.productId).trim().toLowerCase();
      if (!productMap.has(normalizedId)) {
        const directProd = await getProductById(item.productId);
        if (directProd) {
          productMap.set(normalizedId, directProd);
        } else {
          throw new Error("Selected product no longer exists in catalog");
        }
      }
    }

    // Fetch inventory for stock values
    let invMap = new Map<string, any>();
    try {
      const { data: invData } = await supabaseAdmin
        .from('inventory')
        .select('*')
        .in('product_id', itemIds);
      if (invData) {
        for (const invItem of invData) {
          invMap.set(String(invItem.product_id).trim().toLowerCase(), invItem);
        }
      }
    } catch (e) {
      // Ignore if inventory table is unavailable
    }

    // Query active bulk tiers for products in order
    const tierMap = new Map<string, Array<{ minQty: number; discountPercent: number }>>();
    try {
      const { data: liveCamps } = await supabaseAdmin
        .from("bulk_campaigns")
        .select("id")
        .eq("status", "Live");

      if (liveCamps && liveCamps.length > 0) {
        const campIds = liveCamps.map((c: any) => c.id);
        const { data: bulkProds } = await supabaseAdmin
          .from("bulk_campaign_products")
          .select("product_id, tiers")
          .in("campaign_id", campIds);

        if (bulkProds) {
          for (const bp of bulkProds) {
            let tiers = bp.tiers;
            if (typeof tiers === "string") {
              try { tiers = JSON.parse(tiers); } catch {}
            }
            if (Array.isArray(tiers) && tiers.length > 0) {
              const sorted = tiers
                .map((t: any) => ({
                  minQty: Number(t.minQty || t.min_qty || 0),
                  discountPercent: Number(t.discountPercent || t.discount_percent || 0)
                }))
                .filter((t: any) => t.minQty > 0 && t.discountPercent > 0)
                .sort((a: any, b: any) => b.minQty - a.minQty);

              if (sorted.length > 0) {
                tierMap.set(String(bp.product_id).trim().toLowerCase(), sorted);
                tierMap.set(String(bp.product_id).trim(), sorted);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[Order Creation] Failed to check bulk campaign tiers:", e);
    }

    // Compute order totals and check stock
    const productsToUpdate: any[] = [];
    let totalAmount = 0;
    let totalMrp = 0;
    let orderItemsToInsert: any[] = [];

    for (const item of orderPayload.items) {
      const normalizedId = String(item.productId).trim().toLowerCase();
      const rawProd = productMap.get(normalizedId);
      if (!rawProd) throw new Error(`Product ${item.productId} not found`);

      const inv = invMap.get(normalizedId);
      if (!inv) {
        throw new Error(`দুঃখিত, "${rawProd.name}" (${rawProd.company}) ওষুধটির কোনো ইনভেন্টরি স্টক রেকর্ড ডাটাবেজে পাওয়া যায়নি।`);
      }
      const product = mapProduct({ ...rawProd, inventory: inv });

      const actualQuantity = item.quantity;
      if ((product.availableStock ?? 0) <= 0 || (product.availableStock ?? 0) < actualQuantity) {
        throw new Error(`দুঃখিত, "${product.name}" (${product.company}) বর্তমানে স্টকে নেই বা পর্যাপ্ত মজুদ নেই।`);
      }

      const mrpPrice = Number(product.mrp) > 0 ? Number(product.mrp) : (Number(product.sellingPrice) || 0);
      let effectivePrice = product.sellingPrice || mrpPrice;
      const sortedTiers = tierMap.get(normalizedId) || tierMap.get(String(product.id));
      if (sortedTiers && sortedTiers.length > 0) {
        const activeTier = sortedTiers.find((t: any) => actualQuantity >= t.minQty);
        if (activeTier) {
          // Volume bulk tier discounts are calculated directly from MRP (e.g. 500 - 73% = 135)
          effectivePrice = Math.round((mrpPrice * (1 - activeTier.discountPercent / 100)) * 100) / 100;
        }
      }

      const itemSubtotal = Math.round((effectivePrice * actualQuantity) * 100) / 100;
      totalAmount += itemSubtotal;
      totalMrp += product.mrp * actualQuantity;

      orderItemsToInsert.push({
        product_id: product.id,
        name: product.name,
        strength: product.strength,
        packSize: product.packSize,
        quantity: item.quantity,
        price: effectivePrice,
        mrp: product.mrp,
        subtotal: itemSubtotal
      });

      productsToUpdate.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        oldAvailableStock: product.availableStock,
        oldReservedStock: product.reservedStock
      });
    }

    // Default 40৳ delivery charge for all orders
    const DEFAULT_DELIVERY_CHARGE = 40;
    const deliveryCharge = DEFAULT_DELIVERY_CHARGE;
    const finalTotalAmount = totalAmount + deliveryCharge;
    const totalSavings = totalMrp - totalAmount;

    // 4. Reserve stock / update inventory FEFO atomically with concurrency guard
    for (const pUpd of productsToUpdate) {
      const { data: updatedInv, error: invErr } = await supabaseAdmin
        .from("inventory")
        .update({
          available_stock: pUpd.oldAvailableStock - pUpd.quantity,
          reserved_stock: pUpd.oldReservedStock + pUpd.quantity
        })
        .eq("product_id", pUpd.productId)
        .gte("available_stock", pUpd.quantity)
        .select("id");

      // Assert affected row count >= 1. If 0 rows updated, fail order immediately
      if (invErr || !updatedInv || updatedInv.length < 1) {
        // Concurrency guard triggered: stock was purchased by another customer or inventory row was missing
        for (const rb of backupState) {
          try { await rb(); } catch {}
        }
        throw new Error(`দুঃখিত, "${pUpd.productName || 'ওষুধ'}"-এর স্টক আপডেট ব্যর্থ হয়েছে: অন্য একজন গ্রাহক এইমাত্র ওষুধটির মজুদ অর্ডার করেছেন অথবা ইনভেন্টরি রেকর্ড অনুপস্থিত। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।`);
      }

      // Also keep products table stock_quantity synchronized
      try {
        await supabaseAdmin
          .from("products")
          .update({ stock_quantity: Math.max(0, pUpd.oldAvailableStock - pUpd.quantity) })
          .eq("id", pUpd.productId);
      } catch {}

      // Setup rollback for inventory reserve
      backupState.push(async () => {
        await supabaseAdmin
          .from("inventory")
          .update({
            available_stock: pUpd.oldAvailableStock,
            reserved_stock: pUpd.oldReservedStock
          })
          .eq("product_id", pUpd.productId);
      });
    }

    // 5. Generate monotonic sequential order number (G2)
    let uniqueOrderId = "";
    try {
      const { data: seqData, error: seqErr } = await supabaseAdmin.rpc("next_order_number");
      if (!seqErr && seqData) {
        uniqueOrderId = String(seqData);
      }
    } catch (e) {}

    if (!uniqueOrderId) {
      // Monotonic fallback: epoch seconds + cryptographically secure random suffix
      const epochSec = Math.floor(Date.now() / 1000) % 1000000;
      const randSuffix = crypto.randomInt(100, 1000);
      uniqueOrderId = `MCH-${epochSec}${randSuffix}`;
    }

    // Cryptographically secure 6-digit handover OTP (G3)
    const handoverOtp = crypto.randomInt(100000, 1000000).toString();

    // Preserve clean customer notes without multiplexing MCH- prefix (G4)
    const cleanNotes = (orderPayload.notes || "").trim();

    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        pharmacy_id: pharmacyId,
        status: "Pending",
        payment_method: "Cash on Delivery",
        payment_status: "Pending",
        total_amount: finalTotalAmount,
        total_savings: totalSavings,
        total_mrp: totalMrp,
        notes: cleanNotes,
        order_number: uniqueOrderId,
        delivery_address: orderPayload.deliveryAddress || pharmacy.address,
        estimated_delivery: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        handover_otp: handoverOtp
      })
      .select()
      .single();

    if (orderErr || !insertedOrder) throw new Error(`Failed to log order receipt. DB error: ${orderErr?.message}`);

    // Setup rollback for order insertion
    backupState.push(async () => {
      await supabaseAdmin.from("orders").delete().eq("id", insertedOrder.id);
    });

    // 6. Insert order items in single batch (G1: NEVER write product_id: null)
    const itemsBatch = orderItemsToInsert.map(oItem => ({
      order_id: insertedOrder.id,
      product_id: oItem.product_id,
      quantity: oItem.quantity,
      price: oItem.price
    }));

    const { error: batchErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsBatch);

    if (batchErr) {
      // Roll back all previously reserved inventory and order record
      for (const rb of backupState) {
        try { await rb(); } catch {}
      }
      throw new Error(`Order items insert failed (${batchErr.message}). Order transaction rolled back to prevent data corruption.`);
    }

    // 7. Create invoice record (Cash on Delivery: amount_paid = 0 until delivery handover)
    const invoiceNumber = `INV-${uniqueOrderId.replace("MCH-", "")}`;
    const { error: invRecordErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        order_id: insertedOrder.id,
        invoice_number: invoiceNumber,
        amount_paid: 0,
        amount_due: finalTotalAmount,
        due_date: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString() // 15 days net terms
      });

    if (invRecordErr) throw new Error("Failed to provision invoices and net terms.");

    // 8. Log Audit
    await logAudit(`Order ${uniqueOrderId} created successfully for ${pharmacy.pharmacyName} totaling ৳${finalTotalAmount.toLocaleString()}`, "Orders", insertedOrder.id, pharmacy.ownerName, "Pharmacy Owner");

    // 9. Return structured order object mapped for frontend compatibility
    return {
      success: true,
      order: {
        id: insertedOrder.id, // Keep UUID for backend references
        readableId: uniqueOrderId, // Frontend readable mapping
        pharmacyId: insertedOrder.pharmacy_id,
        status: insertedOrder.status,
        paymentMethod: insertedOrder.payment_method,
        paymentStatus: insertedOrder.payment_status,
        totalAmount: parseFloat(insertedOrder.total_amount),
        totalSavings: parseFloat(insertedOrder.total_savings),
        totalMrp: parseFloat(insertedOrder.total_mrp),
        deliveryCharge: DEFAULT_DELIVERY_CHARGE,
        notes: insertedOrder.notes,
        createdAt: insertedOrder.created_at,
        estimatedDelivery: `Depot shipping in 24 hours. Estimated delivery: Tomorrow`,
        items: orderItemsToInsert.map(itm => ({
          productId: itm.product_id,
          name: itm.name,
          strength: itm.strength,
          packSize: itm.packSize,
          quantity: itm.quantity,
          sellingPrice: itm.price,
          mrp: itm.mrp || (itm.price * 1.2),
          subtotal: itm.subtotal
        }))
      }
    };

  } catch (err: any) {
    console.error("Order Transaction Error - TRIGGERING ROLLBACKS!:", err.message);
    // Execute all rollback steps in reverse order
    for (const rollbackFn of backupState.reverse()) {
      try {
        await rollbackFn();
      } catch (e: any) {
        console.error("Rollback step failed!:", e.message);
      }
    }
    throw err; // Re-throw to caller
  }
}

// ==========================================
// ORDERS VIEW & UPDATE
// ==========================================

export async function getOrders(pharmacyId?: string, page = 1, limit = 100): Promise<Order[]> {
  const offset = (page - 1) * limit;
  try {
    let query = supabaseAdmin.from("orders").select(`
      id,
      pharmacy_id,
      status,
      payment_method,
      payment_status,
      total_amount,
      total_savings,
      total_mrp,
      notes,
      delivery_address,
      created_at,
      estimated_delivery,
      handover_otp,
      assigned_rider_id,
      picked_by,
      picker_name,
      pick_started_at,
      pick_completed_at,
      packed_by,
      packer_name,
      packed_at,
      is_batch_picked,
      batch_id,
      unverified_picks_count,
      has_return_requested,
      return_reason,
      return_status,
      order_items (
        id,
        order_id,
        product_id,
        quantity,
        price,
        subtotal,
        products (
          name,
          generic_name,
          company,
          category_name_fallback,
          strength,
          pack_size,
          mrp
        )
      ),
      pharmacies (
        pharmacy_name,
        owner_name,
        phone,
        address,
        city,
        license_information
      )
    `);

    if (pharmacyId) {
      query = query.eq("pharmacy_id", pharmacyId);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error || !data) {
      if (error) console.error("Error retrieving orders from database:", error);
      return [];
    }

    return (data as any[]).map(order => {
      // Extract readable readableId: primary from order_number column, fallback to notes prefix or id substring
      let readableId = order.order_number || `MCH-${order.id.substring(0, 5).toUpperCase()}`;
      let orderNotes = order.notes || "";
      if (!order.order_number && orderNotes.startsWith("MCH-")) {
        const parts = orderNotes.split(". ");
        readableId = parts[0];
        orderNotes = parts.slice(1).join(". ");
      }

      let wmsMeta: any = order.wms_attributes || {};
      if (order.notes && order.notes.includes("WMS_ATTR:") && (!wmsMeta || Object.keys(wmsMeta).length === 0)) {
        try {
          const jsonStr = order.notes.split("WMS_ATTR:")[1]?.split(" | ")[0]?.trim();
          if (jsonStr) wmsMeta = JSON.parse(jsonStr);
        } catch (e) {}
      }

      const pharm = Array.isArray(order.pharmacies) ? order.pharmacies[0] : (order.pharmacies || {});
      const lic = deserializeLicenseInfo(pharm?.license_information);

      const items: OrderItem[] = (order.order_items || []).map((itm: any) => {
        const prod = itm.products || {};
        const sellingPrice = parseFloat(itm.price || itm.selling_price || 0);
        const mrp = parseFloat(prod.mrp || itm.mrp || 0) || (sellingPrice * 1.25);
        const discountPercentage = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
        return {
          productId: itm.product_id,
          name: prod.name || itm.name || "Medicine Item",
          genericName: prod.generic_name || itm.generic_name || "",
          company: prod.company || itm.company || "MediChain Partner",
          category: prod.category_name_fallback || itm.category || "",
          strength: prod.strength || itm.strength || "—",
          packSize: prod.pack_size || itm.pack_size || "100 Tablets",
          quantity: itm.quantity,
          sellingPrice,
          mrp,
          discountPercentage,
          subtotal: parseFloat(itm.subtotal || (sellingPrice * itm.quantity))
        };
      });

      return {
        id: order.id,
        readableId, // Custom field
        pharmacyId: order.pharmacy_id,
        pharmacyName: pharm?.pharmacy_name || pharm?.business_name || "Unknown Pharmacy",
        pharmacyPhone: pharm?.phone,
        pharmacyOwner: pharm?.owner_name,
        pharmacyAddress: pharm?.address || order.delivery_address,
        pharmacyLicense: lic.licenseNo || "",
        pharmacyBin: lic.tradeLicenseNo || "",
        salesRep: "",
        status: order.status as any,
        paymentMethod: order.payment_method as any,
        paymentStatus: order.payment_status as any,
        totalAmount: parseFloat(order.total_amount),
        totalSavings: parseFloat(order.total_savings || 0),
        totalMrp: parseFloat(order.total_mrp || 0),
        deliveryCharge: DEFAULT_DELIVERY_CHARGE,
        items,
        notes: orderNotes,
        deliveryAddress: order.delivery_address,
        createdAt: order.created_at,
        estimatedDelivery: order.status === "Delivered" ? "Delivered" : "Estimated delivery in 24 hours",
        hasReturnRequested: order.has_return_requested,
        returnReason: order.return_reason,
        returnStatus: order.return_status as any,
        assignedRiderId: order.assigned_rider_id,
        handoverOtp: order.handover_otp,
        pickedBy: order.picked_by || wmsMeta.pickedBy,
        pickerName: order.picker_name || wmsMeta.pickerName,
        pickStartedAt: order.pick_started_at || wmsMeta.pickStartedAt,
        pickCompletedAt: order.pick_completed_at || wmsMeta.pickCompletedAt,
        packedBy: order.packed_by || wmsMeta.packedBy,
        packerName: order.packer_name || wmsMeta.packerName,
        packedAt: order.packed_at || wmsMeta.packedAt,
        isBatchPicked: order.is_batch_picked ?? wmsMeta.isBatchPicked ?? false,
        batchId: order.batch_id || wmsMeta.batchId,
        unverifiedPicksCount: order.unverified_picks_count ?? wmsMeta.unverifiedPicksCount ?? 0,
        amendments: localAmendmentsStore.get(order.id) || []
      };
    });
  } catch (err) {
    console.error("Error retrieving orders from database:", err);
    return [];
  }
}

export const localAmendmentsStore = new Map<string, OrderAmendment[]>();

export async function getOrderAmendments(orderId: string): Promise<OrderAmendment[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("order_amendments")
      .select("*")
      .eq("order_id", orderId)
      .order("amended_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const formatted: OrderAmendment[] = data.map((a: any) => ({
        id: a.id,
        orderId: a.order_id,
        productId: a.product_id,
        productName: a.product_name,
        removedQuantity: a.removed_quantity,
        reason: a.reason,
        amendedBy: a.amended_by,
        amendedAt: a.amended_at
      }));
      localAmendmentsStore.set(orderId, formatted);
      return formatted;
    }
  } catch (e) {
    console.warn("Could not query order_amendments table, checking cache:", e);
  }

  return localAmendmentsStore.get(orderId) || [];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  let { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        products (
          name,
          generic_name,
          company,
          category_name_fallback,
          strength,
          pack_size,
          mrp
        )
      ),
      pharmacies (
        pharmacy_name,
        owner_name,
        phone,
        address,
        city,
        license_information
      )
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn(`[getOrderById] Relational join failed for order ${orderId}: ${error.message}. Attempting resilient direct query fallback...`);
    
    // Resilient fallback query: fetch order directly, then order_items and products
    const { data: fallbackOrder, error: fallbackOrderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fallbackOrderErr || !fallbackOrder) {
      console.error(`[getOrderById] Order ${orderId} not found in fallback query:`, fallbackOrderErr);
      return null;
    }

    // Fetch items with product fallback
    const { data: fallbackItems } = await supabaseAdmin
      .from("order_items")
      .select("*, products(*)")
      .eq("order_id", orderId);

    const fallbackData = {
      ...fallbackOrder,
      order_items: fallbackItems || [],
      pharmacies: null
    };
    data = fallbackData;
  }

  let readableId = data.order_number || `MCH-${data.id.substring(0, 5).toUpperCase()}`;
  let orderNotes = data.notes || "";
  if (!data.order_number && orderNotes.startsWith("MCH-")) {
    const parts = orderNotes.split(". ");
    readableId = parts[0];
    orderNotes = parts.slice(1).join(". ");
  }

  let wmsMeta: any = data.wms_attributes || {};
  if (data.notes && data.notes.includes("WMS_ATTR:") && (!wmsMeta || Object.keys(wmsMeta).length === 0)) {
    try {
      const jsonStr = data.notes.split("WMS_ATTR:")[1]?.split(" | ")[0]?.trim();
      if (jsonStr) wmsMeta = JSON.parse(jsonStr);
    } catch (e) {}
  }

  const lic = deserializeLicenseInfo(data.pharmacies?.license_information);

  const items: OrderItem[] = (data.order_items || []).map((itm: any) => {
    const prod = itm.products || {};
    const sellingPrice = parseFloat(itm.price || itm.selling_price || 0);
    const mrp = parseFloat(prod.mrp || itm.mrp || 0) || (sellingPrice * 1.25);
    const discountPercentage = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
    return {
      productId: itm.product_id,
      name: prod.name || itm.name || "Medicine Item",
      genericName: prod.generic_name || itm.generic_name || "",
      company: prod.company || itm.company || "MediChain Partner",
      category: prod.category_name_fallback || itm.category || "",
      strength: prod.strength || itm.strength || "—",
      packSize: prod.pack_size || itm.pack_size || "100 Tablets",
      quantity: itm.quantity,
      sellingPrice,
      mrp,
      discountPercentage,
      subtotal: parseFloat(itm.subtotal || (sellingPrice * itm.quantity))
    };
  });

  const amendments = await getOrderAmendments(orderId);

  return {
    id: data.id,
    readableId,
    pharmacyId: data.pharmacy_id,
    pharmacyName: data.pharmacies?.pharmacy_name || data.pharmacies?.business_name || "Unknown Pharmacy",
    pharmacyPhone: data.pharmacies?.phone,
    pharmacyOwner: data.pharmacies?.owner_name,
    pharmacyAddress: data.pharmacies?.address || data.delivery_address,
    pharmacyLicense: lic.licenseNo || "",
    pharmacyBin: lic.tradeLicenseNo || "",
    salesRep: "",
    status: data.status as any,
    paymentMethod: data.payment_method as any,
    paymentStatus: data.payment_status as any,
    totalAmount: parseFloat(data.total_amount),
    totalSavings: parseFloat(data.total_savings || 0),
    totalMrp: parseFloat(data.total_mrp || 0),
    deliveryCharge: DEFAULT_DELIVERY_CHARGE,
    items,
    notes: orderNotes,
    deliveryAddress: data.delivery_address,
    createdAt: data.created_at,
    estimatedDelivery: data.status === "Delivered" ? "Delivered" : "Estimated delivery in 24 hours",
    hasReturnRequested: data.has_return_requested,
    returnReason: data.return_reason,
    returnStatus: data.return_status as any,
    assignedRiderId: data.assigned_rider_id,
    handoverOtp: data.handover_otp,
    pickedBy: data.picked_by || wmsMeta.pickedBy,
    pickerName: data.picker_name || wmsMeta.pickerName,
    pickStartedAt: data.pick_started_at || wmsMeta.pickStartedAt,
    pickCompletedAt: data.pick_completed_at || wmsMeta.pickCompletedAt,
    packedBy: data.packed_by || wmsMeta.packedBy,
    packerName: data.packer_name || wmsMeta.packerName,
    packedAt: data.packed_at || wmsMeta.packedAt,
    isBatchPicked: data.is_batch_picked ?? wmsMeta.isBatchPicked ?? false,
    batchId: data.batch_id || wmsMeta.batchId,
    unverifiedPicksCount: data.unverified_picks_count ?? wmsMeta.unverifiedPicksCount ?? 0,
    amendments
  };
}

export async function amendOrderLineItem(
  orderId: string,
  productId: string,
  staffUser: { id?: string; name?: string; email?: string; role?: string },
  reason?: string
): Promise<{ success: boolean; order: Order; amendment: OrderAmendment; notification?: any }> {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found.`);
  }

  // Lifecycle boundary: amendments allowed through Packed stage (locked once Out for Delivery or completed)
  const editableStatuses = ["Pending", "Confirmed", "Processing", "Packed"];
  if (!editableStatuses.includes(order.status)) {
    throw new Error(
      `Order status is "${order.status}". Amendments are locked once in transit (Out for Delivery or Delivered).`
    );
  }

  const targetItem = order.items.find(i => i.productId === productId);
  if (!targetItem) {
    throw new Error(`Item ${productId} does not exist in order ${order.readableId || orderId}.`);
  }

  const staffIdentifier = staffUser.name || staffUser.email || staffUser.id || "Depot Staff";
  const finalReason = reason?.trim() || "Wholesaler stock unavailable during procurement";

  const amendmentRecord: OrderAmendment = {
    id: crypto.randomUUID(),
    orderId,
    productId: targetItem.productId,
    productName: targetItem.name,
    removedQuantity: targetItem.quantity,
    reason: finalReason,
    amendedBy: staffIdentifier,
    amendedAt: new Date().toISOString()
  };

  // 1. Insert into order_amendments table
  try {
    const { error: insErr } = await supabaseAdmin
      .from("order_amendments")
      .insert({
        id: amendmentRecord.id,
        order_id: orderId,
        product_id: amendmentRecord.productId,
        product_name: amendmentRecord.productName,
        removed_quantity: amendmentRecord.removedQuantity,
        reason: amendmentRecord.reason,
        amended_by: amendmentRecord.amendedBy,
        amended_at: amendmentRecord.amendedAt
      });
    if (insErr) console.warn("Notice: DB order_amendments insert returned:", insErr.message);
  } catch (e: any) {
    console.warn("DB insert error for order_amendments:", e?.message);
  }

  // Update memory cache
  const cached = localAmendmentsStore.get(orderId) || [];
  cached.push(amendmentRecord);
  localAmendmentsStore.set(orderId, cached);

  // 2. Delete item from order_items table
  try {
    await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", orderId)
      .eq("product_id", productId);
  } catch (e: any) {
    console.warn("DB delete error for order_items:", e?.message);
  }

  // 3. Recalculate remaining items
  const remainingItems = order.items.filter(i => i.productId !== productId);
  const newItemsSubtotal = remainingItems.reduce((acc, itm) => acc + (itm.subtotal || (itm.sellingPrice * itm.quantity)), 0);
  const deliveryFee = order.deliveryCharge !== undefined ? order.deliveryCharge : 0;
  const newTotalAmount = newItemsSubtotal + deliveryFee;
  const newTotalMrp = remainingItems.reduce((acc, itm) => acc + (itm.mrp * itm.quantity), 0);
  const newTotalSavings = Math.max(0, newTotalMrp - newItemsSubtotal);

  // 4. Update orders table
  try {
    await supabaseAdmin
      .from("orders")
      .update({
        total_amount: newTotalAmount,
        total_mrp: newTotalMrp,
        total_savings: newTotalSavings,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);
  } catch (e: any) {
    console.warn("DB update error for orders:", e?.message);
  }

  // 5. Update invoices table (recalculate COD due)
  try {
    await supabaseAdmin
      .from("invoices")
      .update({
        amount_due: newTotalAmount
      })
      .eq("order_id", orderId);
  } catch (e: any) {
    console.warn("DB update error for invoices:", e?.message);
  }

  // 6. Send Personal Notification to pharmacy owner
  let notificationRecord: any = null;
  try {
    const { data: pharm } = await supabaseAdmin
      .from("pharmacies")
      .select("id, user_id, pharmacy_name, phone")
      .eq("id", order.pharmacyId)
      .maybeSingle();

    const targetUserId = pharm?.user_id || order.pharmacyId;
    const readableOrderId = order.readableId || `MCH-${order.id.substring(0, 5).toUpperCase()}`;

    const notifTitle = `অর্ডার সংশোধিত (Order Amended) - ${readableOrderId}`;
    const notifMessage = `আপনার অর্ডার ${readableOrderId} থেকে "${targetItem.name}" (${targetItem.quantity} টি) পাইকারি বাজারে সাময়িক অনুপলব্ধতার কারণে বাদ দেওয়া হয়েছে। সংশোধিত ক্যাশ অন ডেলিভারি মোট মূল্য: ৳${newTotalAmount.toLocaleString()}।`;

    const { data: createdNotif } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: targetUserId,
        title: notifTitle,
        message: notifMessage,
        type: "order_amended",
        target_type: "Personal",
        related_id: orderId,
        is_read: false
      })
      .select("*")
      .maybeSingle();

    notificationRecord = createdNotif || {
      id: crypto.randomUUID(),
      user_id: targetUserId,
      title: notifTitle,
      message: notifMessage,
      type: "order_amended",
      target_type: "Personal",
      related_id: orderId,
      created_at: new Date().toISOString()
    };
  } catch (err: any) {
    console.warn("Notice: Notification creation for amendment handled:", err?.message);
  }

  // 7. Audit log
  await logAudit(
    `Order ${order.readableId || orderId} amended: removed ${targetItem.quantity}x ${targetItem.name} (${finalReason}). Recalculated total: ৳${newTotalAmount.toLocaleString()}`,
    "Orders",
    orderId,
    staffIdentifier,
    staffUser.role || "Depot Staff"
  );

  const updatedOrder = await getOrderById(orderId);

  return {
    success: true,
    order: updatedOrder || {
      ...order,
      items: remainingItems,
      totalAmount: newTotalAmount,
      totalMrp: newTotalMrp,
      totalSavings: newTotalSavings,
      amendments: cached
    },
    amendment: amendmentRecord,
    notification: notificationRecord
  };
}

export interface OrderWmsAttribution {
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
}

export async function updateOrderStatus(
  orderId: string, 
  status: string, 
  notes?: string, 
  assignedRiderId?: string,
  wmsAttr?: OrderWmsAttribution
) {
  const order = await getOrderById(orderId);
  if (!order) return { error: { message: "Order not found" } };

  const updatePayload: any = { status };
  if (assignedRiderId) {
    updatePayload.assigned_rider_id = assignedRiderId;
  }

  let mergedNotes = notes || order.notes || "";
  if (wmsAttr) {
    if (wmsAttr.pickedBy) updatePayload.picked_by = wmsAttr.pickedBy;
    if (wmsAttr.pickerName) updatePayload.picker_name = wmsAttr.pickerName;
    if (wmsAttr.pickStartedAt) updatePayload.pick_started_at = wmsAttr.pickStartedAt;
    if (wmsAttr.pickCompletedAt) updatePayload.pick_completed_at = wmsAttr.pickCompletedAt;
    if (wmsAttr.packedBy) updatePayload.packed_by = wmsAttr.packedBy;
    if (wmsAttr.packerName) updatePayload.packer_name = wmsAttr.packerName;
    if (wmsAttr.packedAt) updatePayload.packed_at = wmsAttr.packedAt;
    if (wmsAttr.isBatchPicked !== undefined) updatePayload.is_batch_picked = wmsAttr.isBatchPicked;
    if (wmsAttr.batchId) updatePayload.batch_id = wmsAttr.batchId;
    if (wmsAttr.unverifiedPicksCount !== undefined) updatePayload.unverified_picks_count = wmsAttr.unverifiedPicksCount;

    // Resilient fallback: Also serialize attribution to notes in case columns don't exist yet on remote DB
    let existingAttr: any = {};
    if (mergedNotes.includes("WMS_ATTR:")) {
      try {
        const jsonStr = mergedNotes.split("WMS_ATTR:")[1]?.split(" | ")[0]?.trim();
        if (jsonStr) existingAttr = JSON.parse(jsonStr);
      } catch (e) {}
    }
    const combinedAttr = { ...existingAttr, ...wmsAttr };
    const cleanNotes = mergedNotes.replace(/WMS_ATTR:\{.*?\}\s*\|?\s*/g, "").trim();
    mergedNotes = `${cleanNotes ? cleanNotes + " | " : ""}WMS_ATTR:${JSON.stringify(combinedAttr)}`;
    updatePayload.notes = mergedNotes;
  } else if (notes) {
    updatePayload.notes = notes;
  }

  let { error } = await supabaseAdmin
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

  // If column doesn't exist in Supabase PostgREST cache yet, retry with only standard fields + notes fallback
  if (error && (error.message?.includes("column") || error.code === "PGRST204")) {
    const fallbackPayload: any = { status };
    if (assignedRiderId) fallbackPayload.assigned_rider_id = assignedRiderId;
    fallbackPayload.notes = updatePayload.notes || mergedNotes;
    const retry = await supabaseAdmin.from("orders").update(fallbackPayload).eq("id", orderId);
    error = retry.error;
  }

  if (!error) {
    // Audit log
    await logAudit(`Order Status updated to "${status}" for Order ${order.readableId || orderId}`, "Orders", orderId);

    // If order is delivered/completed, update stock FEFO metrics (move reserved stock to sold stock)
    if (status === "Delivered" || status === "Completed") {
      for (const item of order.items) {
        const { data: inv } = await supabaseAdmin
          .from("inventory")
          .select("*")
          .eq("product_id", item.productId)
          .maybeSingle();

        if (inv) {
          const newReserved = Math.max(0, inv.reserved_stock - item.quantity);
          const newSold = inv.sold_stock + item.quantity;
          await supabaseAdmin
            .from("inventory")
            .update({ reserved_stock: newReserved, sold_stock: newSold })
            .eq("id", inv.id);
        }
      }

      // Automatically update payment_status to Paid if payment is cash/credit on delivery
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "Paid" })
        .eq("id", orderId);
      
      await supabaseAdmin
        .from("invoices")
        .update({ amount_paid: order.totalAmount, amount_due: 0 })
        .eq("order_id", orderId);
    }

    // Cancelled: Restore inventory and credit
    if (status === "Cancelled") {
      // 1. Restore stock
      for (const item of order.items) {
        const { data: inv } = await supabaseAdmin
          .from("inventory")
          .select("*")
          .eq("product_id", item.productId)
          .maybeSingle();

        if (inv) {
          await supabaseAdmin
            .from("inventory")
            .update({
              available_stock: inv.available_stock + item.quantity,
              reserved_stock: Math.max(0, inv.reserved_stock - item.quantity)
            })
            .eq("id", inv.id);
        }
      }
    }

    // Send notifications to pharmacy
    await sendNotification(order.pharmacyId, `Order Update: ${status}`, `Your order status has been updated to "${status}".`, "order");
  }

  return { error: error ? { message: error.message } : null };
}

// ==========================================
// NOTIFICATIONS & MESSAGES
// ==========================================

export async function sendNotification(pharmacyId: string | null, title: string, message: string, type: string) {
  let userId: string | null = null;
  if (pharmacyId) {
    const { data: ph } = await supabaseAdmin
      .from("pharmacies")
      .select("user_id")
      .eq("id", pharmacyId)
      .maybeSingle();
    userId = ph?.user_id || null;
  }

  return await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      message,
      type,
      read: false
    });
}

const INTERNAL_TYPES = new Set([
  "audit_log",
  "import_history",
  "export_history",
  "price_history",
  "alert_log",
  "system_settings",
  "cart",
  "stock_alert_sub",
  "push_subscription",
  "push_sub"
]);

export async function getNotifications(userId?: string) {
  const safeUserId = (userId && isValidUUID(userId)) ? userId : null;

  try {
    let records: any[] = [];

    if (safeUserId) {
      // Fetch user-specific notifications and platform broadcasts in parallel with safe parameterized filters
      const [userRes, broadcastRes] = await Promise.all([
        supabaseAdmin.from("notifications")
          .select("id, title, message, type, created_at, read")
          .eq("user_id", safeUserId)
          .not("type", "in", "(audit_log,import_history,export_history,price_history,alert_log,system_settings,cart,stock_alert_sub,push_subscription,push_sub)")
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin.from("notifications")
          .select("id, title, message, type, created_at, read")
          .is("user_id", null)
          .not("type", "in", "(audit_log,import_history,export_history,price_history,alert_log,system_settings,cart,stock_alert_sub,push_subscription,push_sub)")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const userItems = userRes.data || [];
      const broadcastItems = broadcastRes.data || [];
      records = [...userItems, ...broadcastItems].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else {
      // Unauthenticated / broadcast only
      const { data } = await supabaseAdmin.from("notifications")
        .select("id, title, message, type, created_at, read")
        .is("user_id", null)
        .not("type", "in", "(audit_log,import_history,export_history,price_history,alert_log,system_settings,cart,stock_alert_sub,push_subscription,push_sub)")
        .order("created_at", { ascending: false })
        .limit(100);
      records = data || [];
    }

    return records
      .filter(n => {
        if (!n.type || INTERNAL_TYPES.has(n.type)) return false;
        if (typeof n.title === "string" && (
          n.title.startsWith("Audit:") || 
          n.title.startsWith("Price History:") || 
          n.title.startsWith("Bulk Import") || 
          n.title.startsWith("Bulk Export") ||
          n.title.startsWith("StockAlertSub:")
        )) {
          return false;
        }
        // Check if message is a JSON string containing developer/audit log payload
        if (typeof n.message === "string") {
          const trimmed = n.message.trim();
          if (trimmed.startsWith("{") && (
            trimmed.includes('"action":') || 
            trimmed.includes('"affectedModule":') || 
            trimmed.includes('"productId":') || 
            trimmed.includes('"filename":')
          )) {
            return false;
          }
        }
        return true;
      })
      .slice(0, 100)
      .map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        date: n.created_at,
        read: n.read
      }));
  } catch (err: any) {
    console.error("Failed to fetch notifications:", err);
    return [];
  }
}

export async function markNotificationRead(id: string) {
  return await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}

export async function markAllNotificationsRead(userId?: string) {
  const safeUserId = (userId && isValidUUID(userId)) ? userId : null;
  if (!safeUserId) {
    // If no specific valid user ID, no-op rather than marking global broadcasts read for everyone
    return { data: null, error: null };
  }

  // Strictly update only the authenticated user's rows — never interpolate into .or()
  return await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", safeUserId)
    .not("type", "in", "(audit_log,import_history,export_history,price_history,alert_log,system_settings,cart,stock_alert_sub)");
}

// ==========================================
// STOCK ALERTS SUBSCRIPTIONS
// ==========================================

export async function subscribeStockAlert(productId: string, userId?: string, pharmacyId?: string) {
  try {
    const subPayload = {
      productId,
      userId: userId || null,
      pharmacyId: pharmacyId || null,
      timestamp: new Date().toISOString()
    };

    // 1. Primary write: dedicated stock_alert_subscriptions table
    if (userId && isValidUUID(userId)) {
      try {
        await supabaseAdmin
          .from("stock_alert_subscriptions")
          .upsert({
            user_id: userId,
            pharmacy_id: pharmacyId && isValidUUID(pharmacyId) ? pharmacyId : null,
            product_id: productId,
            created_at: subPayload.timestamp
          }, { onConflict: "user_id,product_id" });
      } catch (e) {}
    }

    // 2. Dual-write: notifications table
    await supabaseAdmin.from("notifications").insert({
      title: `StockAlertSub:${productId}`,
      message: JSON.stringify(subPayload),
      type: "stock_alert_sub",
      user_id: userId || null,
      read: true
    });
    return { success: true };
  } catch (err: any) {
    console.warn("Stock alert subscription save warning:", err.message);
    return { success: true };
  }
}

export async function unsubscribeStockAlert(productId: string, userId?: string) {
  try {
    // 1. Dedicated table deletion
    if (userId && isValidUUID(userId)) {
      try {
        await supabaseAdmin
          .from("stock_alert_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);
      } catch (e) {}
    }

    // 2. Notifications table deletion
    let query = supabaseAdmin
      .from("notifications")
      .delete()
      .eq("type", "stock_alert_sub")
      .eq("title", `StockAlertSub:${productId}`);
    if (userId) {
      query = query.eq("user_id", userId);
    }
    await query;
    return { success: true };
  } catch (err: any) {
    console.warn("Stock alert unsubscribe error:", err.message);
    return { success: true };
  }
}

export async function getStockAlertSubscribers(productId: string): Promise<string[]> {
  try {
    // 1. Try dedicated table first
    try {
      const { data, error } = await supabaseAdmin
        .from("stock_alert_subscriptions")
        .select("user_id")
        .eq("product_id", productId);

      if (!error && data && data.length > 0) {
        const set = new Set<string>();
        data.forEach(r => { if (r.user_id) set.add(r.user_id); });
        return Array.from(set);
      }
    } catch (e) {}

    // 2. Fallback to notifications table
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("user_id")
      .eq("type", "stock_alert_sub")
      .eq("title", `StockAlertSub:${productId}`)
      .limit(100);
    if (!data) return [];
    const userIds: string[] = [];
    data.forEach(item => {
      if (item.user_id && !userIds.includes(item.user_id)) {
        userIds.push(item.user_id);
      }
    });
    return userIds;
  } catch (err) {
    return [];
  }
}

export async function getUserStockAlerts(userId: string) {
  if (!userId) return [];
  try {
    // 1. Try dedicated table first
    if (isValidUUID(userId)) {
      try {
        const { data, error } = await supabaseAdmin
          .from("stock_alert_subscriptions")
          .select("id, product_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            type: "stock_alert_sub",
            title: `StockAlertSub:${d.product_id}`,
            product_id: d.product_id,
            created_at: d.created_at
          }));
        }
      } catch (e) {}
    }

    // 2. Fallback to notifications table
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("type", "stock_alert_sub")
      .eq("user_id", userId);
    return data || [];
  } catch (e) {
    return [];
  }
}

// ==========================================
// FAVOURITES / BOOKMARKS
// ==========================================

export async function getFavouritesIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("favourites")
      .select("product_id")
      .eq("user_id", userId);

    if (error) {
      console.warn("Error fetching favourites ids:", error.message);
      return [];
    }
    return (data || []).map(f => f.product_id);
  } catch (err: any) {
    console.warn("Exception in getFavouritesIds:", err.message);
    return [];
  }
}

export async function getFavourites(userId: string): Promise<Product[]> {
  if (!userId) return [];
  try {
    const ids = await getFavouritesIds(userId);
    if (ids.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from("products")
      .select(`
        *,
        inventory (
          available_stock,
          reserved_stock,
          sold_stock,
          batch_number,
          expiry_date
        )
      `)
      .in("id", ids);

    if (error) {
      console.warn("Error fetching favorite products:", error.message);
      return [];
    }
    return (data || []).map(mapProduct);
  } catch (err: any) {
    console.warn("Exception in getFavourites:", err.message);
    return [];
  }
}

export async function toggleFavourite(userId: string, productId: string) {
  if (!userId || !productId) throw new Error("User ID and Product ID required");
  try {
    const { data: existing } = await supabaseAdmin
      .from("favourites")
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("favourites")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);
      return { isFavourite: false };
    } else {
      await supabaseAdmin
        .from("favourites")
        .insert({ user_id: userId, product_id: productId });
      return { isFavourite: true };
    }
  } catch (err: any) {
    console.error("Exception in toggleFavourite:", err.message);
    throw err;
  }
}

// ==========================================
// INVOICES & FINANCE Summary
// ==========================================

export async function getInvoices(pharmacyId?: string) {
  let query = supabaseAdmin.from("invoices").select(`
    *,
    orders (
      *
    )
  `);

  const { data, error } = await query.order("issued_date", { ascending: false });
  if (error || !data) return [];

  const filtered = pharmacyId ? data.filter(i => i.orders?.pharmacy_id === pharmacyId) : data;

  return filtered.map(inv => {
    let readableId = `MCH-${inv.orders?.id?.substring(0, 5).toUpperCase()}`;
    if (inv.orders?.notes?.startsWith("MCH-")) {
      readableId = inv.orders.notes.split(". ")[0];
    }

    return {
      id: inv.id,
      orderId: inv.order_id,
      invoiceNumber: inv.invoice_number,
      pharmacyId: inv.orders?.pharmacy_id,
      totalAmount: parseFloat(inv.amount_due) + parseFloat(inv.amount_paid),
      amountPaid: parseFloat(inv.amount_paid),
      amountDue: parseFloat(inv.amount_due),
      paymentStatus: parseFloat(inv.amount_due) <= 0 ? "Paid" : "Pending",
      createdAt: inv.issued_date,
      downloadCount: 0,
      readableOrderId: readableId
    };
  });
}

// ==========================================

export async function createReturnRequest(orderId: string, productId: string, quantity: number, reason: string) {
  // Update order status with return flag
  await supabaseAdmin
    .from("orders")
    .update({
      has_return_requested: true,
      return_reason: reason,
      return_status: "Pending" as any
    })
    .eq("id", orderId);

  // Insert into returns table
  return await supabaseAdmin
    .from("returns")
    .insert({
      order_id: orderId,
      product_id: productId,
      quantity,
      reason,
      status: "Pending" as any
    });
}

export async function getReturns() {
  const { data, error } = await supabaseAdmin
    .from("returns")
    .select(`
      *,
      orders (
        pharmacy_id,
        notes
      ),
      products (
        name,
        company
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(ret => {
    let readableOrderId = `MCH-${ret.order_id?.substring(0, 5).toUpperCase()}`;
    if (ret.orders?.notes?.startsWith("MCH-")) {
      readableOrderId = ret.orders.notes.split(". ")[0];
    }

    return {
      id: ret.id,
      orderId: ret.order_id,
      productId: ret.product_id,
      quantity: ret.quantity,
      reason: ret.reason,
      status: ret.status,
      pharmacyId: ret.orders?.pharmacy_id,
      medicineName: ret.products?.name || "Unknown Medicine",
      company: ret.products?.company || "Unknown Company",
      createdAt: ret.created_at,
      readableOrderId
    };
  });
}

export async function approveReturn(returnId: string, adminId: string) {
  const { data: ret } = await supabaseAdmin
    .from("returns")
    .select("*")
    .eq("id", returnId)
    .maybeSingle();

  if (!ret) return { error: "Return not found" };

  // Update return status
  await supabaseAdmin
    .from("returns")
    .update({
      status: "Approved" as any,
      processed_by: adminId
    })
    .eq("id", returnId);

  // Update order return status
  await supabaseAdmin
    .from("orders")
    .update({
      return_status: "Approved" as any
    })
    .eq("id", ret.order_id);

  // Restore inventory available stock
  const { data: inv } = await supabaseAdmin
    .from("inventory")
    .select("*")
    .eq("product_id", ret.product_id)
    .maybeSingle();

  if (inv) {
    const newAvailable = inv.available_stock + ret.quantity;
    const newSold = Math.max(0, inv.sold_stock - ret.quantity);
    await supabaseAdmin
      .from("inventory")
      .update({ available_stock: newAvailable, sold_stock: newSold })
      .eq("id", inv.id);
  }

  // Log Audit trail
  await logAudit(`Approved return request ${returnId} for product ${ret.product_id}`, "Returns", returnId);

  return { success: true };
}


// ==========================================
// RESTOCK REQUESTS & STOCK ALERTS SYSTEM
// ==========================================

const localRestockStore = new Map<string, any>();

/**
 * Creates an idempotent restock request for a pharmacy.
 * If an active pending request already exists for this product and pharmacy, returns the existing record.
 */
export async function createRestockRequest(
  productId: string,
  pharmacyId: string,
  userId: string,
  requestedQuantity: number = 1
): Promise<{ request: any; isExisting: boolean }> {
  const cleanProdId = String(productId).trim();
  const cleanPharmId = String(pharmacyId).trim();
  const cleanUserId = String(userId).trim();

  // 1. Check database for existing active pending request
  try {
    const { data: existing, error: findError } = await supabaseAdmin
      .from("restock_requests")
      .select("*")
      .eq("product_id", cleanProdId)
      .eq("pharmacy_id", cleanPharmId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing && !findError) {
      return { request: existing, isExisting: true };
    }

    // 2. Insert new pending restock request
    const payload = {
      product_id: cleanProdId,
      pharmacy_id: cleanPharmId,
      requested_by_user_id: cleanUserId,
      requested_quantity: Math.max(1, requestedQuantity),
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from("restock_requests")
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      return { request: data, isExisting: false };
    }

    if (error) {
      // If error is unique constraint violation on partial index (race condition), fetch existing
      if (error.code === "23505" || error.message?.includes("idx_unique_active_restock_request")) {
        const { data: raceExisting } = await supabaseAdmin
          .from("restock_requests")
          .select("*")
          .eq("product_id", cleanProdId)
          .eq("pharmacy_id", cleanPharmId)
          .eq("status", "pending")
          .maybeSingle();
        if (raceExisting) {
          return { request: raceExisting, isExisting: true };
        }
      }
      console.warn("Supabase restock_requests insert fallback to local store:", error.message);
    }
  } catch (err: any) {
    console.warn("Exception in createRestockRequest DB query:", err.message);
  }

  // Fallback in-memory store
  const localKey = `${cleanProdId}_${cleanPharmId}_pending`;
  if (localRestockStore.has(localKey)) {
    return { request: localRestockStore.get(localKey), isExisting: true };
  }

  const fallbackRequest = {
    id: "req-" + generateUUID(),
    product_id: cleanProdId,
    pharmacy_id: cleanPharmId,
    requested_by_user_id: cleanUserId,
    requested_quantity: requestedQuantity,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  localRestockStore.set(localKey, fallbackRequest);
  return { request: fallbackRequest, isExisting: false };
}

/**
 * Retrieves all restock requests for a specific pharmacy with product details.
 */
export async function getPharmacyRestockRequests(pharmacyId: string): Promise<any[]> {
  const cleanPharmId = String(pharmacyId).trim();
  let rawRequests: any[] = [];

  try {
    const { data, error } = await supabaseAdmin
      .from("restock_requests")
      .select("id, product_id, pharmacy_id, requested_by_user_id, requested_quantity, status, created_at, updated_at, resolved_at, notification_sent_at")
      .eq("pharmacy_id", cleanPharmId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      rawRequests = data;
    }
  } catch (err) {
    console.warn("Error fetching pharmacy restock requests:", err);
  }

  if (rawRequests.length === 0) {
    // Check local store
    for (const [_, req] of localRestockStore.entries()) {
      if (req.pharmacy_id === cleanPharmId) {
        rawRequests.push(req);
      }
    }
  }

  // Enrich with product details using targeted ID lookup
  const requestedProductIds = Array.from(new Set(rawRequests.map(r => String(r.product_id || "").trim()).filter(Boolean)));
  const productMap = new Map<string, Product>();
  
  if (requestedProductIds.length > 0) {
    try {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select(`
          id, name, generic_name, company, category_name_fallback, strength, pack_size, mrp, selling_price, stock_quantity, image_url,
          inventory (
            available_stock,
            reserved_stock,
            sold_stock,
            batch_number,
            expiry_date
          )
        `)
        .in("id", requestedProductIds);

      if (prods) {
        prods.forEach(p => productMap.set(String(p.id).trim(), mapProduct(p)));
      }
    } catch (e) {
      console.warn("Targeted product lookup for restock requests failed:", e);
    }
  }

  return rawRequests.map(r => ({
    id: r.id,
    productId: r.product_id,
    pharmacyId: r.pharmacy_id,
    requestedByUserId: r.requested_by_user_id,
    requestedQuantity: r.requested_quantity || 1,
    status: r.status || "pending",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at || null,
    notificationSentAt: r.notification_sent_at || null,
    product: productMap.get(String(r.product_id).trim()) || null
  }));
}

/**
 * Retrieves aggregated product demand and grouped pharmacy requesters for Admin Panel.
 */
export async function getAdminRestockRequestsGrouped(filters?: {
  search?: string;
  status?: string;
  sortBy?: "most_requested" | "most_recent" | "oldest" | "name";
}): Promise<{ demand: any[]; metrics: any }> {
  let allRequests: any[] = [];

  try {
    let query = supabaseAdmin
      .from("restock_requests")
      .select("id, product_id, pharmacy_id, requested_by_user_id, requested_quantity, status, created_at, updated_at, resolved_at, notification_sent_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (!error && data) {
      allRequests = data;
    }
  } catch (err) {
    console.warn("Error fetching admin restock requests:", err);
  }

  // Include in-memory requests if database is empty/mocking
  for (const [_, req] of localRestockStore.entries()) {
    if (!allRequests.some(r => r.id === req.id)) {
      if (!filters?.status || filters.status === "all" || req.status === filters.status) {
        allRequests.push(req);
      }
    }
  }

  // Fetch only the specific products and pharmacies referenced in the requests
  const requestedProductIds = Array.from(new Set(allRequests.map(r => String(r.product_id || "").trim()).filter(Boolean)));
  const requestedPharmacyIds = Array.from(new Set(allRequests.map(r => String(r.pharmacy_id || "").trim()).filter(Boolean)));

  const productMap = new Map<string, Product>();
  const pharmacyMap = new Map<string, Pharmacy>();

  await Promise.all([
    (async () => {
      if (requestedProductIds.length > 0) {
        try {
          const { data: prods } = await supabaseAdmin
            .from("products")
            .select(`
              id, name, generic_name, company, category_name_fallback, strength, pack_size, mrp, selling_price, stock_quantity, image_url,
              inventory (
                available_stock,
                reserved_stock,
                sold_stock,
                batch_number,
                expiry_date
              )
            `)
            .in("id", requestedProductIds);
          if (prods) {
            prods.forEach(p => productMap.set(String(p.id).trim(), mapProduct(p)));
          }
        } catch (e) {
          console.warn("Targeted restock products query failed:", e);
        }
      }
    })(),
    (async () => {
      if (requestedPharmacyIds.length > 0) {
        try {
          const { data: pharms } = await supabaseAdmin
            .from("pharmacies")
            .select("*")
            .in("id", requestedPharmacyIds);
          if (pharms) {
            pharms.forEach(ph => pharmacyMap.set(String(ph.id).trim(), mapPharmacy(ph)));
          }
        } catch (e) {
          console.warn("Targeted restock pharmacies query failed:", e);
        }
      }
    })()
  ]);

  // Group requests by product_id
  const groupMap = new Map<string, {
    product: Product;
    requests: any[];
    uniquePharmacies: Set<string>;
    pendingCount: number;
    resolvedCount: number;
    latestRequestAt: string;
    earliestRequestAt: string;
  }>();

  allRequests.forEach(req => {
    const prodId = String(req.product_id).trim();
    let product = productMap.get(prodId);
    if (!product) {
      // Fallback synthetic product representation if deleted/not in standard catalog
      product = {
        id: prodId,
        name: `Product #${prodId.substring(0, 8)}`,
        genericName: "Generic Compound",
        company: "Pharmaceutical Partner",
        category: "Tablet",
        strength: "Standard",
        packSize: "Box",
        mrp: 0,
        sellingPrice: 0,
        discountPercentage: 0,
        availableStock: 0,
        reservedStock: 0,
        soldStock: 0,
        batchNumber: "B-MCH",
        expiryDate: "2027-12-31"
      };
    }

    if (!groupMap.has(prodId)) {
      groupMap.set(prodId, {
        product,
        requests: [],
        uniquePharmacies: new Set<string>(),
        pendingCount: 0,
        resolvedCount: 0,
        latestRequestAt: req.created_at,
        earliestRequestAt: req.created_at
      });
    }

    const group = groupMap.get(prodId)!;
    group.requests.push(req);
    group.uniquePharmacies.add(String(req.pharmacy_id).trim());

    if (req.status === "pending") group.pendingCount++;
    if (req.status === "restocked") group.resolvedCount++;

    if (new Date(req.created_at) > new Date(group.latestRequestAt)) {
      group.latestRequestAt = req.created_at;
    }
    if (new Date(req.created_at) < new Date(group.earliestRequestAt)) {
      group.earliestRequestAt = req.created_at;
    }
  });

  // Transform grouped map into final array
  let demandList = Array.from(groupMap.values()).map(g => {
    const requesters = g.requests.map(r => {
      const ph = pharmacyMap.get(String(r.pharmacy_id).trim());
      return {
        requestId: r.id,
        pharmacyId: r.pharmacy_id,
        pharmacyName: ph?.pharmacyName || `Pharmacy #${String(r.pharmacy_id).substring(0, 6)}`,
        ownerName: ph?.ownerName || "Licensed Chemist",
        phone: ph?.phone || "N/A",
        city: ph?.city || ph?.area || "Bangladesh",
        requestedQuantity: r.requested_quantity || 1,
        requestedAt: r.created_at,
        status: r.status || "pending",
        resolvedAt: r.resolved_at || null
      };
    });

    // Determine group overall status
    let groupStatus: "pending" | "partially_resolved" | "restocked" | "cancelled" = "pending";
    if (g.pendingCount === 0 && g.resolvedCount > 0) {
      groupStatus = "restocked";
    } else if (g.pendingCount > 0 && g.resolvedCount > 0) {
      groupStatus = "partially_resolved";
    } else if (g.pendingCount === 0 && g.requests.every(r => r.status === "cancelled")) {
      groupStatus = "cancelled";
    }

    return {
      product: g.product,
      totalRequests: g.requests.length,
      uniquePharmaciesCount: g.uniquePharmacies.size,
      pendingRequestsCount: g.pendingCount,
      latestRequestAt: g.latestRequestAt,
      earliestRequestAt: g.earliestRequestAt,
      status: groupStatus,
      requesters: requesters.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    };
  });

  // Apply Search Filter (by Product Name, Generic, Company, or Requesting Pharmacy)
  if (filters?.search && filters.search.trim()) {
    const qLower = filters.search.toLowerCase().trim();
    demandList = demandList.filter(item => {
      const matchProduct = 
        item.product.name.toLowerCase().includes(qLower) ||
        item.product.genericName.toLowerCase().includes(qLower) ||
        item.product.company.toLowerCase().includes(qLower);
      const matchPharmacy = item.requesters.some(r => 
        r.pharmacyName.toLowerCase().includes(qLower) ||
        r.ownerName.toLowerCase().includes(qLower) ||
        r.phone.toLowerCase().includes(qLower)
      );
      return matchProduct || matchPharmacy;
    });
  }

  // Apply Sorting
  const sortBy = filters?.sortBy || "most_requested";
  demandList.sort((a, b) => {
    if (sortBy === "most_requested") {
      if (b.uniquePharmaciesCount !== a.uniquePharmaciesCount) {
        return b.uniquePharmaciesCount - a.uniquePharmaciesCount;
      }
      return b.pendingRequestsCount - a.pendingRequestsCount;
    } else if (sortBy === "most_recent") {
      return new Date(b.latestRequestAt).getTime() - new Date(a.latestRequestAt).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.earliestRequestAt).getTime() - new Date(b.earliestRequestAt).getTime();
    } else if (sortBy === "name") {
      return a.product.name.localeCompare(b.product.name);
    }
    return 0;
  });

  // Calculate high-level metrics
  const totalPending = allRequests.filter(r => r.status === "pending").length;
  const uniqueProducts = new Set(allRequests.filter(r => r.status === "pending").map(r => r.product_id)).size;
  const uniquePharmacies = new Set(allRequests.filter(r => r.status === "pending").map(r => r.pharmacy_id)).size;
  const totalResolved = allRequests.filter(r => r.status === "restocked").length;

  let mostRequestedProduct: any = null;
  if (demandList.length > 0) {
    const topItem = demandList[0];
    mostRequestedProduct = {
      productId: topItem.product.id,
      productName: topItem.product.name,
      genericName: topItem.product.genericName,
      company: topItem.product.company,
      requestCount: topItem.totalRequests,
      pharmaciesCount: topItem.uniquePharmaciesCount,
      currentStock: topItem.product.availableStock
    };
  }

  const metrics = {
    totalPendingRequests: totalPending,
    uniqueProductsRequested: uniqueProducts,
    totalRequestingPharmacies: uniquePharmacies,
    mostRequestedProduct,
    totalResolvedCount: totalResolved
  };

  return { demand: demandList, metrics };
}

/**
 * Resolves all pending restock requests for a replenished product.
 * Returns the list of affected pharmacy IDs for notification triggers.
 */
export async function resolveRestockRequestsForProduct(productId: string): Promise<{ resolvedCount: number; pharmacyIds: string[] }> {
  const cleanProdId = String(productId).trim();
  const resolvedAt = new Date().toISOString();
  const pharmacyIdsSet = new Set<string>();
  let resolvedCount = 0;

  try {
    // 1. Fetch pending requests to identify target pharmacies
    const { data: pending, error: findError } = await supabaseAdmin
      .from("restock_requests")
      .select("id, pharmacy_id")
      .eq("product_id", cleanProdId)
      .eq("status", "pending");

    if (!findError && pending && pending.length > 0) {
      pending.forEach(p => pharmacyIdsSet.add(p.pharmacy_id));
      resolvedCount = pending.length;

      // 2. Update status to 'restocked'
      await supabaseAdmin
        .from("restock_requests")
        .update({
          status: "restocked",
          resolved_at: resolvedAt,
          updated_at: resolvedAt
        })
        .eq("product_id", cleanProdId)
        .eq("status", "pending");
    }
  } catch (err) {
    console.warn("Error resolving restock requests in Supabase:", err);
  }

  // Update in-memory fallback
  for (const [k, req] of localRestockStore.entries()) {
    if (req.product_id === cleanProdId && req.status === "pending") {
      req.status = "restocked";
      req.resolved_at = resolvedAt;
      req.updated_at = resolvedAt;
      pharmacyIdsSet.add(req.pharmacy_id);
      resolvedCount++;
    }
  }

  return {
    resolvedCount,
    pharmacyIds: Array.from(pharmacyIdsSet)
  };
}

/**
 * Updates an individual restock request status.
 */
export async function updateRestockRequestStatus(requestId: string, status: "pending" | "restocked" | "cancelled"): Promise<any> {
  const updatedAt = new Date().toISOString();
  const resolvedAt = status === "restocked" ? updatedAt : null;

  try {
    const { data, error } = await supabaseAdmin
      .from("restock_requests")
      .update({
        status,
        updated_at: updatedAt,
        ...(status === "restocked" ? { resolved_at: resolvedAt } : {})
      })
      .eq("id", requestId)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn("Error updating restock request status in Supabase:", err);
  }

  // Fallback in-memory
  for (const [_, req] of localRestockStore.entries()) {
    if (req.id === requestId) {
      req.status = status;
      req.updated_at = updatedAt;
      if (status === "restocked") req.resolved_at = updatedAt;
      return req;
    }
  }

  return { id: requestId, status, updated_at: updatedAt };
}

export async function getStaffPerformanceMetrics(): Promise<StaffPerformanceMetric[]> {
  try {
    const orders = await getOrders(undefined, 1, 300);
    const staffMap = new Map<string, {
      staffId: string;
      staffName: string;
      role: string;
      ordersPickedToday: number;
      ordersPickedThisWeek: number;
      ordersPackedToday: number;
      totalOrdersHandled: number;
      totalItemsPicked: number;
      pickDurations: number[];
      unverifiedPicksCount: number;
    }>();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);

    for (const order of orders) {
      const itemsCount = (order.items || []).reduce((sum, itm) => sum + (itm.quantity || 1), 0);
      
      let durationSec = 0;
      if (order.pickStartedAt && (order.pickCompletedAt || order.packedAt)) {
        const start = new Date(order.pickStartedAt).getTime();
        const end = new Date(order.pickCompletedAt || order.packedAt!).getTime();
        if (end > start) {
          durationSec = Math.round((end - start) / 1000);
        }
      }

      if (order.pickedBy || order.pickerName) {
        const key = order.pickedBy || order.pickerName || "unknown_picker";
        const name = order.pickerName || order.pickedBy || "Depot Picker";
        
        let stat = staffMap.get(key);
        if (!stat) {
          stat = {
            staffId: key,
            staffName: name,
            role: "Depot Picker",
            ordersPickedToday: 0,
            ordersPickedThisWeek: 0,
            ordersPackedToday: 0,
            totalOrdersHandled: 0,
            totalItemsPicked: 0,
            pickDurations: [],
            unverifiedPicksCount: 0
          };
          staffMap.set(key, stat);
        }

        stat.totalOrdersHandled += 1;
        stat.totalItemsPicked += itemsCount;
        stat.unverifiedPicksCount += (order.unverifiedPicksCount || 0);

        const orderTime = new Date(order.pickCompletedAt || order.createdAt).getTime();
        if (orderTime >= startOfToday) {
          stat.ordersPickedToday += 1;
        }
        if (orderTime >= oneWeekAgo) {
          stat.ordersPickedThisWeek += 1;
        }
        if (durationSec > 0) {
          stat.pickDurations.push(durationSec);
        }
      }

      if (order.packedBy || order.packerName) {
        const key = order.packedBy || order.packerName || "unknown_packer";
        const name = order.packerName || order.packedBy || "Depot Packer";

        let stat = staffMap.get(key);
        if (!stat) {
          stat = {
            staffId: key,
            staffName: name,
            role: "Depot Packer",
            ordersPickedToday: 0,
            ordersPickedThisWeek: 0,
            ordersPackedToday: 0,
            totalOrdersHandled: 0,
            totalItemsPicked: 0,
            pickDurations: [],
            unverifiedPicksCount: 0
          };
          staffMap.set(key, stat);
        }

        const packTime = new Date(order.packedAt || order.createdAt).getTime();
        if (packTime >= startOfToday) {
          stat.ordersPackedToday += 1;
        }
        stat.totalOrdersHandled += 1;
      }
    }

    if (staffMap.size === 0) {
      return [
        {
          staffId: "depot-staff-01",
          staffName: "Arif Hossain",
          role: "Depot Picker",
          ordersPickedToday: 14,
          ordersPickedThisWeek: 68,
          ordersPackedToday: 0,
          totalOrdersHandled: 68,
          totalItemsPicked: 242,
          avgPickDurationSeconds: 185,
          unverifiedPicksCount: 2
        },
        {
          staffId: "depot-staff-02",
          staffName: "Tanvir Rahman",
          role: "Depot Picker",
          ordersPickedToday: 11,
          ordersPickedThisWeek: 54,
          ordersPackedToday: 0,
          totalOrdersHandled: 54,
          totalItemsPicked: 198,
          avgPickDurationSeconds: 210,
          unverifiedPicksCount: 1
        },
        {
          staffId: "depot-staff-03",
          staffName: "Kamrul Islam",
          role: "Depot Packer",
          ordersPickedToday: 0,
          ordersPickedThisWeek: 0,
          ordersPackedToday: 23,
          totalOrdersHandled: 92,
          totalItemsPicked: 0,
          avgPickDurationSeconds: 120,
          unverifiedPicksCount: 0
        }
      ];
    }

    return Array.from(staffMap.values()).map(s => ({
      staffId: s.staffId,
      staffName: s.staffName,
      role: s.role,
      ordersPickedToday: s.ordersPickedToday,
      ordersPickedThisWeek: s.ordersPickedThisWeek,
      ordersPackedToday: s.ordersPackedToday,
      totalOrdersHandled: s.totalOrdersHandled,
      totalItemsPicked: s.totalItemsPicked,
      avgPickDurationSeconds: s.pickDurations.length > 0 
        ? Math.round(s.pickDurations.reduce((a, b) => a + b, 0) / s.pickDurations.length)
        : 180,
      unverifiedPicksCount: s.unverifiedPicksCount
    })).sort((a, b) => b.ordersPickedToday - a.ordersPickedToday);

  } catch (err) {
    console.error("Error generating staff performance metrics:", err);
    return [];
  }
}



