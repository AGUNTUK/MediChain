import { supabaseAdmin } from "./supabaseAdmin.js";
export { supabaseAdmin };
import { Product, Pharmacy, Order, OrderItem } from "../types";

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

export async function getSystemSettings() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("message")
    .eq("type", "system_settings")
    .order("created_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    try {
      return JSON.parse(data[0].message);
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

export async function logAudit(action: string, affectedModule: string, recordId: string, userEmail: string = "System", userRole: string = "System") {
  const auditData = {
    action,
    affectedModule,
    recordId,
    user: userEmail,
    role: userRole,
    timestamp: new Date().toISOString()
  };

  await supabaseAdmin
    .from("notifications")
    .insert({
      title: `Audit: ${affectedModule}`,
      message: JSON.stringify(auditData),
      type: "audit_log",
      read: true
    });
}

export async function getAuditLogs() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "audit_log")
    .order("created_at", { ascending: false });

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

export async function logImportHistory(filename: string, recordCount: number, status: string, importedBy: string) {
  const historyData = {
    filename,
    recordCount,
    status,
    importedBy,
    timestamp: new Date().toISOString()
  };

  await supabaseAdmin
    .from("notifications")
    .insert({
      title: "Bulk Import",
      message: JSON.stringify(historyData),
      type: "import_history",
      read: true
    });
}

export async function getImportHistory() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "import_history")
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return { filename: n.title, recordCount: 0, status: "Success", timestamp: n.created_at };
    }
  });
}

export async function logExportHistory(format: string, type: string, recordCount: number, exportedBy: string) {
  const historyData = {
    format,
    type,
    recordCount,
    exportedBy,
    timestamp: new Date().toISOString()
  };

  await supabaseAdmin
    .from("notifications")
    .insert({
      title: "Bulk Export",
      message: JSON.stringify(historyData),
      type: "export_history",
      read: true
    });
}

export async function getExportHistory() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "export_history")
    .order("created_at", { ascending: false });

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

  await supabaseAdmin
    .from("notifications")
    .insert({
      title: `Price History: ${productName}`,
      message: JSON.stringify(priceData),
      type: "price_history",
      read: true
    });
}

export async function getPriceHistory(productId?: string) {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "price_history")
    .order("created_at", { ascending: false });

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

  await supabaseAdmin
    .from("notifications")
    .insert({
      title,
      message: JSON.stringify(alertData),
      type: "alert_log",
      read: false
    });
}

export async function getAlertLogs() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "alert_log")
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return { title: n.title, message: n.message, timestamp: n.created_at };
    }
  });
}

// ==========================================
// USERS & SESSIONS
// ==========================================

export async function syncSession(id: string, email: string, name: string, role: string, phone: string = "") {
  // Check if user already exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const userPayload: any = {
    id,
    email,
    name,
    phone
  };

  // Only set role if user does not exist yet to prevent role updates from frontend sync
  if (!existingUser) {
    userPayload.role = role || "Pharmacy Owner";
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(userPayload, { onConflict: "id" })
    .select()
    .single();

  return { data, error };
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

// ==========================================
// PHARMACIES & PROFILES
// ==========================================

export async function getPharmacyProfile(userId: string): Promise<Pharmacy | null> {
  const { data: ph } = await supabaseAdmin
    .from("pharmacies")
    .select("id, user_id, pharmacy_name, owner_name, phone, address, city, license_information")
    .eq("user_id", userId)
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
  // Find or create pharmacy record
  const { data: existing } = await supabaseAdmin
    .from("pharmacies")
    .select("id, license_information")
    .eq("user_id", userId)
    .maybeSingle();

  const existingLicense = existing ? deserializeLicenseInfo(existing.license_information) : {};

  // For security, ignore any verificationStatus overrides from the client.
  // Status can only be changed by admin endpoints.
  delete data.verificationStatus;

  // Preserve existing status, default to Pending for new profiles
  const status = existingLicense.verificationStatus || "Pending";
  
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
    user_id: userId,
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
      .eq("id", userId);

  }

  return { data: ph, error };
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

  const stockVal = inv && inv.available_stock !== undefined && inv.available_stock !== null
    ? parseInt(inv.available_stock, 10)
    : (p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
        ? parseInt(p.stock_quantity, 10)
        : (p.availableStock !== undefined && p.availableStock !== null ? parseInt(p.availableStock, 10) : 0));

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
    image_url: imgUrl
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
    image_url: prod.imageUrl || prod.image_url || ""
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
// CART
// ==========================================

export async function getCart(userId: string) {
  if (!userId) return [];
  try {
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("id, message")
      .eq("user_id", userId)
      .eq("type", "cart")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0]?.message) {
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
    const { data: existingList } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "cart")
      .order("created_at", { ascending: false });

    const safeItems = Array.isArray(cartItems) ? cartItems : [];
    const payload = JSON.stringify(safeItems);

    if (existingList && existingList.length > 0) {
      const [primary, ...duplicates] = existingList;
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
      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          title: "Procurement Cart",
          message: payload,
          type: "cart",
          read: true
        });
    }
  } catch (err) {
    console.error("Error saving cart to DB:", err);
  }
}

// ==========================================
// ORDERS & TRANSACTION HANDLING (Atomic Saga Pattern)
// ==========================================

export async function createOrderTransaction(userId: string, pharmacyId: string, orderPayload: {
  paymentMethod: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number }>;
  deliveryAddress?: string;
  paymentStatus?: string;
  transactionId?: string;
}) {
  const backupState: any[] = []; // Stores list of functions to execute to rollback state on failure

  try {
    // 1. Fetch pharmacy profile and verification status
    const pharmacy = await getPharmacyById(pharmacyId);
    if (!pharmacy) throw new Error("Pharmacy not found");
    if (pharmacy.verificationStatus !== "Approved") {
      throw new Error("Your pharmacy profile is pending DGDA drug license verification");
    }

    // 2. Fetch products using supabaseAdmin (service role) to ensure RLS does not block product verification
    const itemIds = orderPayload.items.map(i => String(i.productId || "").trim()).filter(Boolean);
    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', itemIds);

    if (prodErr) {
      throw new Error(`Failed to query products: ${prodErr.message}`);
    }

    const productMap = new Map<string, any>();
    (dbProducts || []).forEach((p: any) => {
      if (p.id) {
        productMap.set(String(p.id).trim().toLowerCase(), p);
      }
    });

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
      const product = mapProduct({ ...rawProd, inventory: inv });

      const actualQuantity = item.quantity;
      const itemSubtotal = product.sellingPrice * actualQuantity;
      totalAmount += itemSubtotal;
      totalMrp += product.mrp * actualQuantity;

      orderItemsToInsert.push({
        product_id: product.id,
        name: product.name,
        strength: product.strength,
        packSize: product.packSize,
        quantity: item.quantity,
        price: product.sellingPrice,
        mrp: product.mrp,
        subtotal: itemSubtotal
      });

      productsToUpdate.push({
        productId: product.id,
        quantity: item.quantity,
        oldAvailableStock: product.availableStock,
        oldReservedStock: product.reservedStock
      });
    }

    const deliveryCharge = totalAmount < 10000 ? 30 : 0;
    const finalTotalAmount = totalAmount + deliveryCharge;
    const totalSavings = totalMrp - totalAmount;

    // 4. Reserve stock / update inventory FEFO atomically
    for (const pUpd of productsToUpdate) {
      const { error: invErr } = await supabaseAdmin
        .from("inventory")
        .update({
          available_stock: pUpd.oldAvailableStock - pUpd.quantity,
          reserved_stock: pUpd.oldReservedStock + pUpd.quantity
        })
        .eq("product_id", pUpd.productId);

      if (invErr) throw new Error("Failed to reserve warehouse inventories FEFO.");

      // Check if stock dropped below 11 boxes
      const newAvailStock = pUpd.oldAvailableStock - pUpd.quantity;
      if (newAvailStock < 11 && pUpd.oldAvailableStock >= 11) {
        const itemInfo = orderItemsToInsert.find(i => i.product_id === pUpd.productId);
        const prodName = itemInfo?.name || "ওষুধ";
        try {
          await sendNotification(
            null,
            `স্টক সতর্কতা: ${prodName}`,
            `দুঃখিত, ডিপোতে ${prodName} এই মুহূর্তে পাওয়া যাচ্ছে না। খুব শীঘ্রই রিস্টক করা হবে।`,
            "stock_alert"
          );
        } catch (alertErr) {
          console.warn("Low stock alert error:", alertErr);
        }
      }

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

    // 5. Insert order record
    const uniqueOrderId = `MCH-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderRecord = {
      id: uniqueOrderId as any, // If UUID type, we will let it auto generate or upsert if accepted
      pharmacy_id: pharmacyId,
      status: "Pending",
      payment_method: orderPayload.paymentMethod,
      payment_status: "Pending",
      total_amount: totalAmount,
      total_savings: totalSavings,
      total_mrp: totalMrp,
      notes: orderPayload.notes || "",
      delivery_address: orderPayload.deliveryAddress || pharmacy.address,
      estimated_delivery: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    };

    // Wait, is orders.id a UUID or a custom string?
    // In our OpenAPI fetch: `id: string (uuid)`.
    // Oh! The database requires order.id to be a UUID!
    // But the frontend expects standard "MCH-xxxxx" order IDs.
    // Can we store the custom "MCH-xxxxx" string inside the notes or somewhere, or is the ID column a text in postgres or does it auto generate a UUID?
    // Let's look at `orders` table in swagger: `id: string (uuid)`. Yes, it's a UUID!
    // So the primary key must be a valid UUID.
    // Let's let Postgres generate the UUID, and store the "MCH-xxxxx" identifier inside a separate tracking column if any, OR we can generate a valid UUID and map it, or use the UUID directly!
    // Wait, let's map the returned order UUID as `id`, and we can keep `id` as UUID but display it nicely, or can we check if orders have a specific text field?
    // Ah, does the frontend expect the order ID to look like MCH-xxxxx?
    // Yes! But we can keep the primary key as UUID and map the custom readable ID, or we can use the UUID itself.
    // Let's insert the order with Postgres auto-generating the UUID, and save its ID.
    const handoverOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

    const isPaidUpfront = orderPayload.paymentStatus === "Paid";
    const trxNote = orderPayload.transactionId ? `[TrxID: ${orderPayload.transactionId}]` : "";
    const notesContent = `${uniqueOrderId}.${trxNote ? " " + trxNote + "." : ""} ${orderPayload.notes || ""}`.trim();

    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        pharmacy_id: pharmacyId,
        status: "Pending",
        payment_method: orderPayload.paymentMethod,
        payment_status: isPaidUpfront ? "Paid" : "Pending",
        total_amount: finalTotalAmount,
        total_savings: totalSavings,
        total_mrp: totalMrp,
        notes: notesContent,
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

    // 6. Insert order items
    for (const oItem of orderItemsToInsert) {
      const { error: itemErr } = await supabaseAdmin
        .from("order_items")
        .insert({
          order_id: insertedOrder.id,
          product_id: oItem.product_id,
          quantity: oItem.quantity,
          price: oItem.price
        });

      if (itemErr) {
        console.warn(`[Order Item Insert] FK warning for product ${oItem.product_id}: ${itemErr.message}. Fallback insert without strict FK constraint.`);
        try {
          await supabaseAdmin
            .from("order_items")
            .insert({
              order_id: insertedOrder.id,
              product_id: null,
              quantity: oItem.quantity,
              price: oItem.price
            });
        } catch (e) {
          console.warn("Fallback order item insert error:", e);
        }
      }
    }

    // 7. Create invoice record
    const invoiceNumber = `INV-${uniqueOrderId.replace("MCH-", "")}`;
    const { error: invRecordErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        order_id: insertedOrder.id,
        invoice_number: invoiceNumber,
        amount_paid: isPaidUpfront ? totalAmount : 0,
        amount_due: isPaidUpfront ? 0 : totalAmount,
        due_date: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString() // 15 days net terms
      });

    if (invRecordErr) throw new Error("Failed to provision invoices and net terms.");

    // 8. Log Audit
    await logAudit(`Order ${uniqueOrderId} created successfully for ${pharmacy.pharmacyName} totaling ৳${totalAmount.toLocaleString()}`, "Orders", insertedOrder.id, pharmacy.ownerName, "Pharmacy Owner");

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
      *,
      order_items (
        *,
        products (
          name,
          strength,
          pack_size,
          mrp
        )
      ),
      pharmacies (
        pharmacy_name,
        owner_name,
        phone
      )
    `);

    if (pharmacyId) {
      query = query.eq("pharmacy_id", pharmacyId);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error || !data) return [];

    return data.map(order => {
      // Extract readable readableId from notes prefix if present (e.g. "MCH-88392. Deliver during store hours...")
      let readableId = `MCH-${order.id.substring(0, 5).toUpperCase()}`;
      let orderNotes = order.notes || "";
      if (orderNotes.startsWith("MCH-")) {
        const parts = orderNotes.split(". ");
        readableId = parts[0];
        orderNotes = parts.slice(1).join(". ");
      }

      const items: OrderItem[] = (order.order_items || []).map((itm: any) => {
        const prod = itm.products || {};
        const sellingPrice = parseFloat(itm.price);
        return {
          productId: itm.product_id,
          name: prod.name || "Medicine Item",
          strength: prod.strength || "N/A",
          packSize: prod.pack_size || "N/A",
          quantity: itm.quantity,
          sellingPrice,
          mrp: parseFloat(prod.mrp) || (sellingPrice * 1.2),
          subtotal: parseFloat(itm.subtotal)
        };
      });

      return {
        id: order.id,
        readableId, // Custom field
        pharmacyId: order.pharmacy_id,
        pharmacyName: order.pharmacies?.pharmacy_name || order.pharmacies?.business_name || "Unknown Pharmacy",
        pharmacyPhone: order.pharmacies?.phone,
        status: order.status as any,
        paymentMethod: order.payment_method as any,
        paymentStatus: order.payment_status as any,
        totalAmount: parseFloat(order.total_amount),
        totalSavings: parseFloat(order.total_savings || 0),
        totalMrp: parseFloat(order.total_mrp || 0),
        items,
        notes: orderNotes,
        deliveryAddress: order.delivery_address,
        createdAt: order.created_at,
        estimatedDelivery: order.status === "Delivered" ? "Delivered" : "Estimated delivery in 24 hours",
        hasReturnRequested: order.has_return_requested,
        returnReason: order.return_reason,
        returnStatus: order.return_status as any,
        assignedRiderId: order.assigned_rider_id,
        handoverOtp: order.handover_otp
      };
    });
  } catch (err) {
    console.error("Error retrieving orders from database:", err);
    return [];
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        products (
          name,
          strength,
          pack_size,
          mrp
        )
      ),
      pharmacies (
        pharmacy_name,
        owner_name,
        phone
      )
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return null;

  let readableId = `MCH-${data.id.substring(0, 5).toUpperCase()}`;
  let orderNotes = data.notes || "";
  if (orderNotes.startsWith("MCH-")) {
    const parts = orderNotes.split(". ");
    readableId = parts[0];
    orderNotes = parts.slice(1).join(". ");
  }

  const items: OrderItem[] = (data.order_items || []).map((itm: any) => {
    const prod = itm.products || {};
    const sellingPrice = parseFloat(itm.price);
    return {
      productId: itm.product_id,
      name: prod.name || "Medicine Item",
      strength: prod.strength || "N/A",
      packSize: prod.pack_size || "N/A",
      quantity: itm.quantity,
      sellingPrice,
      mrp: parseFloat(prod.mrp) || (sellingPrice * 1.2),
      subtotal: parseFloat(itm.subtotal)
    };
  });

  return {
    id: data.id,
    readableId,
    pharmacyId: data.pharmacy_id,
    pharmacyName: data.pharmacies?.pharmacy_name || data.pharmacies?.business_name || "Unknown Pharmacy",
    pharmacyPhone: data.pharmacies?.phone,
    status: data.status as any,
    paymentMethod: data.payment_method as any,
    paymentStatus: data.payment_status as any,
    totalAmount: parseFloat(data.total_amount),
    totalSavings: parseFloat(data.total_savings || 0),
    totalMrp: parseFloat(data.total_mrp || 0),
    items,
    notes: orderNotes,
    deliveryAddress: data.delivery_address,
    createdAt: data.created_at,
    estimatedDelivery: data.status === "Delivered" ? "Delivered" : "Estimated delivery in 24 hours",
    hasReturnRequested: data.has_return_requested,
    returnReason: data.return_reason,
    returnStatus: data.return_status as any,
    assignedRiderId: data.assigned_rider_id,
    handoverOtp: data.handover_otp
  };
}

export async function updateOrderStatus(orderId: string, status: string, notes?: string, assignedRiderId?: string) {
  const order = await getOrderById(orderId);
  if (!order) return { error: { message: "Order not found" } };

  const updatePayload: any = { status };
  if (assignedRiderId) {
    updatePayload.assigned_rider_id = assignedRiderId;
  }
  if (notes) {
    updatePayload.notes = notes;
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

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
  "stock_alert_sub"
]);

export async function getNotifications(userId?: string) {
  let query = supabaseAdmin.from("notifications").select("id, title, message, type, created_at, read");
  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    query = query.is("user_id", null);
  }

  // Filter out system configurations / metadata in PostgREST
  query = query.not("type", "in", "(audit_log,import_history,export_history,price_history,alert_log,system_settings,cart,stock_alert_sub)");

  const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
  if (error || !data) return [];

  return data
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
    .map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      date: n.created_at,
      read: n.read
    }));
}

export async function markNotificationRead(id: string) {
  return await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}

export async function markAllNotificationsRead(userId?: string) {
  let query = supabaseAdmin.from("notifications").update({ read: true });
  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    query = query.is("user_id", null);
  }

  return await query.not("type", "in", "(audit_log,import_history,export_history,price_history,alert_log,system_settings,cart,stock_alert_sub)");
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
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("type", "stock_alert_sub")
      .eq("title", `StockAlertSub:${productId}`);
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
  try {
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

export async function processPaymentGatewayTransaction(orderId: string, paymentMethod: string, transactionId: string, amount?: number) {
  // Update order payment status
  const { data: order, error: orderErr } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (orderErr || !order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const payAmount = amount || parseFloat(order.total_amount) || 0;

  // 1. Update order payment status
  await supabaseAdmin
    .from("orders")
    .update({ payment_status: "Paid", payment_method: paymentMethod })
    .eq("id", orderId);

  // 2. Update invoice records
  await supabaseAdmin
    .from("invoices")
    .update({ amount_paid: payAmount, amount_due: 0 })
    .eq("order_id", orderId);

  // 4. Log Audit
  await logAudit(`Payment of ৳${payAmount.toLocaleString()} verified via ${paymentMethod} Gateway (TrxID: ${transactionId}) for Order ${orderId}`, "Finance", orderId, "Pharmacy User", "PaymentGateway");

  return {
    success: true,
    orderId,
    transactionId,
    amount: payAmount,
    paymentMethod,
    status: "Paid"
  };
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
    id: "req-" + Math.random().toString(36).substring(2, 10),
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
      .select("*")
      .eq("pharmacy_id", cleanPharmId)
      .order("created_at", { ascending: false });

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
      .select("*")
      .order("created_at", { ascending: false });

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



