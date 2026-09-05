import express from "express";
import compression from "compression";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import cookieSession from "cookie-session";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Import libraries and helpers
import { importBulkCatalog } from "./src/lib/importService.js";
import { performSearch } from "./src/lib/searchService.js";
import { validateProduct, checkDuplicate } from "./src/lib/productValidator.js";
import { supabaseAdmin } from "./src/lib/supabaseAdmin.js";
import * as dbService from "./src/lib/dbService.js";
import { aiEnrichmentService } from "./src/lib/aiEnrichmentService.js";
import { initDailyBannerScheduler, getDailyBannerData, analyzeDailyWholesaleDiscounts } from "./src/lib/geminiBannerService.js";
import { pushNotificationService } from "./src/lib/pushNotificationService.js";
import { LRUCache } from "./src/lib/lruCache.js";
import { DEFAULT_CATEGORY_OPTIONS } from "./src/constants/categories.js";
import { scanSmartOrderImage, formatFriendlyErrorMessage } from "./src/lib/smartOrderOCR.js";
import { matchSmartOrderItems } from "./src/lib/productMatcher.js";
import { sendOrderAlert, logTelegramConfigStatus } from "./src/lib/telegramService.js";
import cron from "node-cron";
import multer from "multer";

dotenv.config();

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});


async function runWithRetry(fn, maxAttempts = 3, timeoutMs = 15000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request Timeout')), timeoutMs))
      ]);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const backoff = Math.pow(2, attempt) * 1000;
      await new Promise(res => setTimeout(res, backoff));
    }
  }
}

const app = express();
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "data:", "https:"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));
app.set("trust proxy", 1); // Trust first proxy (necessary for secure cookie-sessions on reverse proxies like Vercel/Cloud Run)
const PORT = 3000;
const DEBUG = process.env.DEBUG === "true" || process.env.NODE_ENV !== "production";

const log = {
  info: (...args: any[]) => DEBUG && console.log(...args),
  warn: (...args: any[]) => DEBUG && console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};

// Request logging
app.use((req: any, res: any, next: any) => {
  const start = Date.now();
  res.on("finish", () => {
    if (DEBUG) {
      const duration = Date.now() - start;
      log.info(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// CORS for API routes
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()).filter(Boolean) || [];
if (allowedOrigins.length > 0) {
  app.use(cors({ origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }, credentials: true }));
}

// Body parsers
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Stateless concurrent cookie session with strict security guidelines
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET || "medichain_secure_session_secret_fallback_key_2026";
if (!process.env.SESSION_SECRET && isProduction) {
  console.error("SESSION_SECRET environment variable is missing. Server will not start in production without it.");
  process.exit(1);
} else if (!process.env.SESSION_SECRET) {
  log.warn("SESSION_SECRET environment variable is missing; utilizing default fallback secret.");
}

app.use(cookieSession({
  name: "session",
  keys: [sessionSecret],
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax"
}));

// Resilient header-based session fallback for cross-origin iframes, webviews, and mobile browsers
app.use((req: any, res: any, next: any) => {
  const headerUserId = req.headers["x-session-user-id"];
  if (headerUserId && (!req.session || !req.session.userId)) {
    req.session = req.session || {};
    req.session.userId = headerUserId;
    req.session.email = req.headers["x-session-user-email"] || req.session.email;
    req.session.role = req.headers["x-session-user-role"] || req.session.role || "Pharmacy Owner";
    req.session.name = req.headers["x-session-user-name"] || req.session.name || "Pharmacy Owner";
    req.session.pharmacy_id = req.headers["x-session-pharmacy-id"] || req.session.pharmacy_id || null;
  }
  next();
});

import { authLimiter, orderLimiter, publicLimiter, smartOrderLimiter, schemas, validateBody, sanitizeInput } from "./src/lib/security.js";

// Global input sanitization
app.use(sanitizeInput);

const loginLimiter = authLimiter;
const importLimiter = authLimiter; // Reuse auth limiter for import for now

// --- LOCAL USER FALLBACK DATA STORE (SECURELY HASHED) ---

const localUsersStore = new Map<string, any>();

// Seed default accounts in-memory for secure local preview operations with bcrypt hashes
if (!isProduction) {
  (async () => {
    const salt = await bcrypt.genSalt(10);
    
    localUsersStore.set("admin@medichain.com", {
      id: "local-admin-111",
      email: "admin@medichain.com",
      name: "System Admin",
      role: "Admin",
      passwordHash: await bcrypt.hash("admin123", salt),
      createdAt: new Date().toISOString()
    });

    localUsersStore.set("depot@medichain.com", {
      id: "local-depot-222",
      email: "depot@medichain.com",
      name: "Depot Manager",
      role: "Depot Staff",
      passwordHash: await bcrypt.hash("depot123", salt),
      createdAt: new Date().toISOString()
    });

    localUsersStore.set("delivery@medichain.com", {
      id: "local-delivery-333",
      email: "delivery@medichain.com",
      name: "Delivery Rider",
      role: "Delivery Staff",
      passwordHash: await bcrypt.hash("delivery123", salt),
      createdAt: new Date().toISOString()
    });
  })();
}

// --- AUTHORIZATION MIDDLEWARE & HELPER FUNCTIONS ---

function requireAuth(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    const headerUserId = req.headers["x-session-user-id"];
    if (headerUserId) {
      req.session = req.session || {};
      req.session.userId = headerUserId;
      req.session.email = req.headers["x-session-user-email"] || req.session.email;
      req.session.role = req.headers["x-session-user-role"] || req.session.role || "Pharmacy Owner";
      req.session.name = req.headers["x-session-user-name"] || req.session.name || "Pharmacy Owner";
      req.session.pharmacy_id = req.headers["x-session-pharmacy-id"] || req.session.pharmacy_id || null;
    }
  }

  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Authentication required. Please log in first." });
  }
  req.user = {
    id: req.session.userId,
    email: req.session.email,
    role: req.session.role,
    name: req.session.name,
    pharmacy_id: req.session.pharmacy_id
  };
  next();
}

function requireRole(allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.session || !req.session.userId) {
      const headerUserId = req.headers["x-session-user-id"];
      if (headerUserId) {
        req.session = req.session || {};
        req.session.userId = headerUserId;
        req.session.email = req.headers["x-session-user-email"] || req.session.email;
        req.session.role = req.headers["x-session-user-role"] || req.session.role || "Pharmacy Owner";
        req.session.name = req.headers["x-session-user-name"] || req.session.name || "Pharmacy Owner";
        req.session.pharmacy_id = req.headers["x-session-pharmacy-id"] || req.session.pharmacy_id || null;
      }
    }

    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const userRole = req.session.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Access Denied: This action is restricted to the following roles: ${allowedRoles.join(", ")}`
      });
    }
    req.user = {
      id: req.session.userId,
      email: req.session.email,
      role: req.session.role,
      name: req.session.name,
      pharmacy_id: req.session.pharmacy_id
    };
    next();
  };
}

async function requireVerifiedPharmacy(req: any, res: any, next: any) {
  if (req.user && (req.user.role === "Pharmacy Owner" || req.user.role === "User")) {
    try {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id).catch(() => null);
      if (!pharmacy) {
        return next();
      }
      const st = (pharmacy.verificationStatus || "").toString().toLowerCase();
      if (st === "suspended" || st === "rejected") {
        return res.status(403).json({ error: "Account Suspended — contact support." });
      }
      // Pharmacy verification is optional: pending or unverified accounts are permitted
    } catch (e: any) {
      // allow
    }
  }
  next();
}

// --- HEALTH CHECK ENDPOINT ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- DIAGNOSTIC ENDPOINTS ---
app.post("/api/diagnostic/verify-cart-products", requireAuth, async (req, res) => {
  try {
    const { productIds } = req.body;
    let targetIds = productIds || [];

    if (!targetIds || targetIds.length === 0) {
      const cartItems = await dbService.getCart(req.user.id);
      targetIds = cartItems.map((item: any) => String(item.productId || "").trim()).filter(Boolean);
    }

    const { data: allProducts, error } = await supabaseAdmin.from("products").select("id, name").in("id", targetIds);
    if (error) throw error;
    const productMap = new Map();
    (allProducts || []).forEach((p: any) => productMap.set(String(p.id).trim().toLowerCase(), p));

    const summary = {
      totalProductsInDb: allProducts?.length || 0,
      targetIdsToCheck: targetIds,
      found: [] as any[],
      missing: [] as string[],
      dbSampleIds: (allProducts || []).slice(0, 10).map((p: any) => ({ id: p.id, name: p.name }))
    };

    for (const id of targetIds) {
      const normalizedId = String(id).trim().toLowerCase();
      if (productMap.has(normalizedId)) {
        summary.found.push({ requestedId: id, foundId: productMap.get(normalizedId).id, name: productMap.get(normalizedId).name });
      } else {
        summary.missing.push(id);
      }
    }

    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTHENTICATION & SESSION ENDPOINTS ---

app.post("/api/auth/local-signup", loginLimiter, validateBody(schemas.signup), async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing required registration parameters (email, password, name)." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (localUsersStore.has(normalizedEmail)) {
    return res.status(400).json({ error: "User already exists with this email address." });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name,
      role: "Pharmacy Owner",
      passwordHash,
      createdAt: new Date().toISOString()
    };

    localUsersStore.set(normalizedEmail, newUser);

    // Sync database user profile in parallel to persist details in users table
    await dbService.syncSession(newUser.id, newUser.email, newUser.name, newUser.role).catch(err => {
      log.warn("Could not insert user profile to Supabase users table:", err.message);
    });

    req.session = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      pharmacy_id: null
    };

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      needsSetup: true,
      pharmacy: null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/local-login", loginLimiter, validateBody(schemas.login), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = localUsersStore.get(normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Load any existing pharmacy profile synced in Supabase database
    const pharmacy = await dbService.getPharmacyProfile(user.id).catch(() => null);
    const pharmacyId = pharmacy ? pharmacy.id : null;

    req.session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      pharmacy_id: pharmacyId
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        pharmacy_id: pharmacyId
      },
      needsSetup: !pharmacyId,
      pharmacy
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/sync-session", loginLimiter, async (req, res) => {
  const { id, email, name, phone, role } = req.body;
  if (!id || !email) {
    return res.status(400).json({ error: "Missing required session parameters (id, email)." });
  }

  try {
    let user: any = null;
    let syncError: any = null;

    try {
      const { data, error } = await dbService.syncSession(id, email, name, role || "Pharmacy Owner", phone);
      user = data;
      syncError = error;
    } catch (e: any) {
      syncError = e;
    }

    if (syncError || !user) {
      log.warn("WARNING: Database sync-session failed, using fallback user profile:", syncError?.message || syncError);
      user = {
        id,
        email,
        name: name || "Pharmacy Owner",
        role: role || "Pharmacy Owner",
        phone: phone || "",
        pharmacy_id: null
      };
    }

    req.session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      pharmacy_id: user.pharmacy_id
    };

    let pharmacy = null;
    try {
      pharmacy = await dbService.getPharmacyProfile(user.id);
    } catch (e: any) {
      log.warn("WARNING: Failed to fetch pharmacy profile for session:", e.message || e);
    }
    const needsSetup = !pharmacy || !pharmacy.pharmacyName;

    res.json({
      success: true,
      user,
      needsSetup,
      pharmacy
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// --- PHARMACY PROFILE WORKFLOWS ---

app.get("/api/pharmacy/profile", requireAuth, async (req, res) => {
  try {
    let user = await dbService.getUserById(req.user.id).catch(() => null);
    if (!user) {
      user = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        phone: ""
      };
    }
    const pharmacy = await dbService.getPharmacyProfile(req.user.id).catch(() => null);
    if (pharmacy?.phone && !user.phone) {
      user.phone = pharmacy.phone;
    }
    res.json({
      user,
      pharmacy
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pharmacy/profile", requireAuth, validateBody(schemas.pharmacyProfile), async (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "127.0.0.1";
    
    // Inject and format legal consent audit metadata if present
    const incomingConsent = req.body.legalConsent || req.body.legal_consent;
    let legalConsentPayload = undefined;
    if (incomingConsent) {
      legalConsentPayload = {
        terms_accepted_at: incomingConsent.termsAcceptedAt || incomingConsent.terms_accepted_at || new Date().toISOString(),
        privacy_policy_version: incomingConsent.privacyPolicyVersion || incomingConsent.privacy_policy_version || "v1.0.0",
        ip_address: clientIp,
        verified_authenticity_declaration: incomingConsent.verifiedAuthenticityDeclaration !== false && incomingConsent.verified_authenticity_declaration !== false
      };
    }

    const { data: ph, error, resolvedUserId } = await dbService.updatePharmacyProfile(req.user.id, {
      ...req.body,
      legal_consent: legalConsentPayload || req.body.legal_consent,
      legalConsent: legalConsentPayload || req.body.legalConsent,
      email: req.user?.email || req.body.email
    });

    if (error || !ph) {
      return res.status(500).json({ error: "Failed to update profile: " + error?.message });
    }

    if (resolvedUserId && resolvedUserId !== req.session.userId) {
      req.session.userId = resolvedUserId;
      if (req.user) req.user.id = resolvedUserId;
    }

    const updatedPharmacy = await dbService.getPharmacyProfile(resolvedUserId || req.user.id);
    res.json({ success: true, pharmacy: updatedPharmacy });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pharmacy/verification-documents/signed-url", requireAuth, async (req, res) => {
  try {
    const { path } = req.body;
    if (!path || typeof path !== "string") {
      return res.status(400).json({ error: "Missing document storage path." });
    }

    // Security check: Only Admin or the owning pharmacy/user can generate a signed URL
    const userRole = req.user.role;
    if (userRole !== "Admin") {
      const userPharmacy = await dbService.getPharmacyProfile(req.user.id).catch(() => null);
      const isUserFolder = path.startsWith(`${req.user.id}/`);
      const isPharmacyFolder = userPharmacy?.id ? path.startsWith(`${userPharmacy.id}/`) : false;

      if (!isUserFolder && !isPharmacyFolder) {
        return res.status(403).json({ error: "Access denied. You can only access your own pharmacy documents." });
      }
    }

    const { data, error } = await supabaseAdmin.storage
      .from("verification-documents")
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      return res.status(404).json({ error: "Document not found or signed URL generation failed: " + (error?.message || "empty") });
    }

    res.json({ success: true, signedUrl: data.signedUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MEDICINES & PRODUCT CATALOG ---

let cachedCategories: string[] | null = null;
let lastCategoryFetch = 0;

app.get("/api/categories", async (req, res) => {
  try {
    // 24-hour HTTP Cache header for browser and edge CDNs
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

    if (cachedCategories && Date.now() - lastCategoryFetch < 86400000) {
      return res.json(cachedCategories);
    }
    
    // First try getting from categories table directly
    const { data: catData, error: catErr } = await supabaseAdmin.from("categories").select("name").limit(100);
    
    let categories: string[] = [];
    if (!catErr && catData && catData.length > 0) {
       categories = catData.map((c: any) => c.name);
    } else {
       // Fast fallback to standardized DGDA categories constant instead of scanning 21,000 product rows
       categories = DEFAULT_CATEGORY_OPTIONS;
    }
    
    cachedCategories = categories;
    lastCategoryFetch = Date.now();
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    if (cachedCategories) return res.json(cachedCategories);
    res.json(DEFAULT_CATEGORY_OPTIONS);
  }
});

// Bounded LRU Cache (max 1000 queries, 5-minute TTL) for zero-cost catalog reads
const productLRUCache = new LRUCache<any>(1000, 300000);

let cachedAllProducts: any[] | null = null;
let lastAllProductsFetch = 0;
const ALL_PRODUCTS_TTL = 300000; // 5 minutes

export function clearProductCache() {
  productLRUCache.clear();
  cachedAllProducts = null;
  lastAllProductsFetch = 0;
}

async function getAllProductsMaster(): Promise<any[]> {
  const now = Date.now();
  if (cachedAllProducts && now - lastAllProductsFetch < ALL_PRODUCTS_TTL) {
    return cachedAllProducts;
  }

  try {
    // Fetch products in 1000-row chunks in parallel to cover full catalog (2,202+ items)
    const [c1, c2, c3] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, generic_name, company, category_name_fallback, category_id, strength, pack_size, mrp, selling_price, stock_quantity, discount_percentage, image_url, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)")
        .range(0, 999),
      supabaseAdmin
        .from("products")
        .select("id, name, generic_name, company, category_name_fallback, category_id, strength, pack_size, mrp, selling_price, stock_quantity, discount_percentage, image_url, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)")
        .range(1000, 1999),
      supabaseAdmin
        .from("products")
        .select("id, name, generic_name, company, category_name_fallback, category_id, strength, pack_size, mrp, selling_price, stock_quantity, discount_percentage, image_url, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)")
        .range(2000, 2999),
    ]);

    const rawProducts = [...(c1.data || []), ...(c2.data || []), ...(c3.data || [])];
    if (rawProducts.length === 0 && cachedAllProducts) {
      return cachedAllProducts;
    }

    const mappedProducts = rawProducts.map((p: any) => {
      // Map to frontend Product type
      const inv = p.inventory && Array.isArray(p.inventory) ? p.inventory[0] : (p.inventory || null);
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
        imageUrl: p.image_url || p.imageUrl || undefined,
        image_url: p.image_url || p.imageUrl || undefined
      };
    });

    cachedAllProducts = mappedProducts;
    lastAllProductsFetch = now;
    return mappedProducts;
  } catch (e) {
    console.error("Error loading products master cache:", e);
    if (cachedAllProducts) return cachedAllProducts;
    return [];
  }
}

app.get("/api/products", publicLimiter, async (req, res) => {
  const { search, category, filter, page, limit, paginate } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;
  const searchQuery = ((search as string) || "").trim();
  const cacheKey = `${filter || "all"}_${category || "all"}_${searchQuery}_${pageNum}_${limitNum}_${paginate || "false"}`;

  try {
    // Strategy 5: HTTP Edge cache header (5-min fresh, 1-hour stale-while-revalidate)
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");

    // Strategy 1: In-memory LRU Cache check
    const cached = productLRUCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const allProducts = await getAllProductsMaster();
    let filtered = allProducts;

    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      filtered = filtered.filter(p => {
        const n = (p.name || "").toLowerCase();
        const g = (p.genericName || "").toLowerCase();
        const c = (p.company || "").toLowerCase();
        return searchTerms.every(term => n.includes(term) || g.includes(term) || c.includes(term));
      });
    }

    if (category && category !== "All") {
      filtered = filtered.filter(p => p.category === category);
    }

    if (filter === "low_stock") {
      filtered = filtered.filter(p => (p.availableStock ?? 0) <= 150);
    }

    // Strict Ordering:
    // 1. In-stock products ALWAYS appear first (availableStock > 0)
    // 2. Default: Alphabetical order (A to Z) by medicine name
    // 3. Or specific sort filter (deals, frequent, low_stock)
    filtered = [...filtered].sort((a, b) => {
      const aInStock = (a.availableStock ?? 0) > 0 ? 1 : 0;
      const bInStock = (b.availableStock ?? 0) > 0 ? 1 : 0;
      if (aInStock !== bInStock) {
        return bInStock - aInStock; // In-stock comes before out-of-stock
      }
      if (filter === "deals") {
        return (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0);
      } else if (filter === "frequent") {
        return (b.soldStock ?? 0) - (a.soldStock ?? 0);
      } else if (filter === "low_stock") {
        return (a.availableStock ?? 0) - (b.availableStock ?? 0);
      }
      // Default: Alphabetical (A to Z)
      return (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" });
    });

    const isPaginatedRequest = paginate === "true";
    let responseData: any;
    if (isPaginatedRequest || page || limit) {
      const total = filtered.length;
      const pages = Math.ceil(total / limitNum) || 1;
      const from = (pageNum - 1) * limitNum;
      const pagedItems = filtered.slice(from, from + limitNum);

      responseData = {
        products: pagedItems,
        total,
        page: pageNum,
        pageSize: limitNum,
        pages,
        suggestions: [],
        originalQuery: searchQuery,
        correctedQuery: undefined
      };
    } else {
      responseData = filtered;
    }

    productLRUCache.set(cacheKey, responseData, 300000);
    
    return res.json(responseData);
  } catch (err: any) {
    console.error("Products Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await dbService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MEDICHAIN SMARTORDER: AI VISION OCR & 21K+ PRODUCT MATCHER ---

app.post("/api/smart-order/scan", smartOrderLimiter, async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "অনুগ্রহ করে প্রেসক্রিপশন বা অর্ডার স্লিপের একটি ছবি প্রদান করুন।" });
  }

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "").trim();
  const openRouterKey = (process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "").trim();

  if (!geminiKey && !openRouterKey) {
    return res.status(500).json({ error: "সার্ভারে AI Vision API Key কনফিগার করা নেই। অনুগ্রহ করে Render Dashboard > Environment Variables-এ GEMINI_API_KEY বা OPENROUTER_API_KEY সেট করুন।" });
  }

  try {
    // 1. Multi-Tier Vision OCR (Gemini High Availability Hierarchy + OpenRouter Failover)
    const ocrResult = await scanSmartOrderImage(imageBase64, geminiKey, mimeType || "image/jpeg", openRouterKey);

    if (!ocrResult.items || ocrResult.items.length === 0) {
      return res.json({
        success: true,
        modelUsed: ocrResult.modelUsed,
        items: [],
        message: "ছবিতে কোনো পরিচিত ওষুধের নাম শনাক্ত করা যায়নি। অনুগ্রহ করে পরিষ্কার আলোতে তোলা ছবি দিন।"
      });
    }

    // 2. Candidate Search & Multi-Factor Scoring against Supabase 21k+ Catalog
    const matchedItems = await matchSmartOrderItems(ocrResult.items);

    log.info(`[SmartOrder] Scan successful: ${ocrResult.items.length} items read using ${ocrResult.modelUsed}, matched ${matchedItems.filter(m => m.matchedProduct).length} in catalog.`);

    return res.json({
      success: true,
      modelUsed: ocrResult.modelUsed,
      items: matchedItems
    });
  } catch (err: any) {
    log.error("SmartOrder scan exception:", err);
    return res.status(400).json({
      error: formatFriendlyErrorMessage(err)
    });
  }
});

// Backward-compatible alias for existing prescription scanner callers
app.post("/api/prescription/scan", smartOrderLimiter, async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "No image data provided for scanning." });
  }

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "").trim();
  const openRouterKey = (process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "").trim();

  if (!geminiKey && !openRouterKey) {
    return res.status(500).json({ error: "AI Vision API key is not configured." });
  }

  try {
    const ocrResult = await scanSmartOrderImage(imageBase64, geminiKey, mimeType || "image/jpeg", openRouterKey);
    const matchedItems = await matchSmartOrderItems(ocrResult.items);

    return res.json({
      success: true,
      modelUsed: ocrResult.modelUsed,
      items: matchedItems
    });
  } catch (err: any) {
    return res.status(400).json({ error: formatFriendlyErrorMessage(err) });
  }
});


// --- AI DAILY WHOLESALE PROFIT METER (Gemini AI Daily 12 AM Scheduler) ---

app.get("/api/banner/daily-profit-meter", async (req, res) => {
  try {
    const data = await getDailyBannerData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch daily profit meter data." });
  }
});

app.post("/api/banner/daily-profit-meter/refresh", async (req, res) => {
  try {
    const data = await analyzeDailyWholesaleDiscounts();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to refresh daily profit meter data." });
  }
});


// --- SECURE VERIFICATION DOCUMENTS UPLOAD ENDPOINTS ---

app.post("/api/upload/verification-document", uploadMiddleware.single("file"), async (req, res) => {
  try {
    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let mimeType = "image/jpeg";
    const docType = (req.body.docType || "drug-license").toString().trim();
    const folderId = (req.body.folderId || req.body.pharmacyId || req.user?.id || "registration").toString().replace(/[^a-zA-Z0-9_-]/g, "_");

    if (req.file) {
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype || "image/jpeg";
    } else if (req.body.fileBase64) {
      const base64Data = req.body.fileBase64.replace(/^data:[^;]+;base64,/, "");
      fileBuffer = Buffer.from(base64Data, "base64");
      fileName = req.body.fileName || `doc_${Date.now()}.jpg`;
      mimeType = req.body.mimeType || "image/jpeg";
    } else {
      return res.status(400).json({ error: "No file content provided for upload." });
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "Uploaded file is empty." });
    }

    const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf"];
    if (!allowedExts.includes(fileExt)) {
      return res.status(400).json({ error: `Unsupported file extension: .${fileExt}. Allowed: ${allowedExts.join(", ")}` });
    }

    const cleanBaseName = (fileName.substring(0, fileName.lastIndexOf(".")) || fileName).replace(/[^a-zA-Z0-9_-]/g, "_");
    const storagePath = `${folderId}/${docType}/${Date.now()}_${cleanBaseName}.${fileExt}`;

    // Upload to private verification-documents bucket via supabaseAdmin
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from("verification-documents")
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadErr) {
      log.error("Supabase verification document upload failed:", uploadErr);
      return res.status(500).json({ error: `Document storage failed: ${uploadErr.message}` });
    }

    // Create 7-day signed URL for secure verification viewing
    const { data: signData } = await supabaseAdmin.storage
      .from("verification-documents")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

    const signedUrl = signData?.signedUrl || "";

    return res.json({
      success: true,
      path: storagePath,
      url: signedUrl
    });
  } catch (err: any) {
    log.error("Verification upload exception:", err);
    return res.status(500).json({ error: err.message || "Failed to process document upload." });
  }
});

app.get("/api/upload/document-url", async (req, res) => {
  const docPath = String(req.query.path || "").trim();
  if (!docPath) {
    return res.status(400).json({ error: "Missing document path." });
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from("verification-documents")
      .createSignedUrl(docPath, 60 * 60 * 24 * 7); // 7 days

    if (error || !data?.signedUrl) {
      return res.status(404).json({ error: "Failed to create signed document URL." });
    }

    return res.json({ signedUrl: data.signedUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- WEB PUSH NOTIFICATIONS (Direct Mobile Delivery) ---

app.get("/api/notifications/vapid-public-key", (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to retrieve VAPID public key." });
  }
});

app.post("/api/notifications/push-subscribe", async (req, res) => {
  try {
    const { subscription, userId, pharmacyName } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Missing push subscription payload" });
    }
    const userAgent = req.headers["user-agent"] || "Mobile PWA";
    const stored = pushNotificationService.saveSubscription(
      subscription,
      userId || req.user?.id || null,
      pharmacyName || req.user?.pharmacy_name || null,
      userAgent
    );
    res.json({ success: true, id: stored.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save push subscription." });
  }
});

app.post("/api/notifications/push-unsubscribe", async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "Missing endpoint" });
    }
    const deleted = pushNotificationService.removeSubscription(endpoint);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to unsubscribe." });
  }
});

app.post("/api/notifications/test-push", async (req, res) => {
  try {
    const { userId, title, body } = req.body;
    const result = await pushNotificationService.sendPushNotification(
      {
        title: title || "মেডিচেইন পুশ নোটিফিকেশন 🚀",
        body: body || "আপনার ফোনে পুশ নোটিফিকেশন সার্ভিস সফলভাবে সক্রিয় হয়েছে!",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        url: "/"
      },
      userId || req.user?.id || null
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send test push notification." });
  }
});


// --- PROCUREMENT CART (Stateless DB Synced) ---

app.get("/api/cart", requireAuth, async (req, res) => {
  try {
    const cartItemsInDb = await dbService.getCart(req.user.id);
    const cartItems: any[] = [];
    
    if (cartItemsInDb && cartItemsInDb.length > 0) {
      const productIds = cartItemsInDb.map((item: any) => String(item.productId || "").trim()).filter(Boolean);
      
      const { data: dbProducts, error } = await dbService.supabaseAdmin
        .from('products')
        .select('*, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)')
        .in('id', productIds);
        
      if (!error && dbProducts && dbProducts.length > 0) {
        const productMap = new Map();
        dbProducts.forEach((p: any) => {
          const mrpVal = p.mrp !== undefined && p.mrp !== null ? parseFloat(p.mrp) : 0;
          let sellingVal = 0;
          if (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== "") {
            sellingVal = parseFloat(p.selling_price);
          } else if (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== "") {
            sellingVal = parseFloat(p.sellingPrice);
          } else {
            sellingVal = mrpVal;
          }
          
          const inv = Array.isArray(p.inventory) && p.inventory.length > 0 ? p.inventory[0] : (p.inventory || null);
          const isSquare = (p.company || "").toLowerCase().includes("square");
          const stockVal = isSquare
            ? 0
            : (p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
                ? parseInt(p.stock_quantity, 10)
                : (inv ? (inv.available_stock ?? 0) : (p.availableStock ?? 0)));

          const mapped = {
            id: String(p.id).trim(),
            name: p.name,
            genericName: p.generic_name || p.genericName || "Generic Medicine",
            company: p.company,
            category: p.category_name_fallback || p.category_id || p.category || "Tablet",
            strength: p.strength,
            packSize: p.pack_size || p.packSize,
            mrp: mrpVal,
            sellingPrice: sellingVal,
            discountPercentage: p.discount_percentage ? parseFloat(p.discount_percentage) : (mrpVal > 0 ? Math.round(((mrpVal - sellingVal) / mrpVal) * 100) : 0),
            availableStock: stockVal,
            reservedStock: inv ? (inv.reserved_stock ?? 0) : 0,
            soldStock: inv ? (inv.sold_stock ?? 0) : 0,
            batchNumber: p.batch_number || (inv ? (inv.batch_number || "") : "") || "B-MCH2026",
            expiryDate: p.expiry_date || (inv ? (inv.expiry_date || "") : "") || "2027-12-31",
            imageUrl: p.image_url || p.imageUrl || undefined,
          };

          productMap.set(String(p.id).trim().toLowerCase(), mapped);
          productMap.set(String(p.id).trim(), mapped);
        });
        
        for (const item of cartItemsInDb) {
          const itemKey = String(item.productId || "").trim().toLowerCase();
          const product = productMap.get(itemKey) || productMap.get(String(item.productId || "").trim());
          if (product) {
            cartItems.push({
              product,
              quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
            });
          }
        }
      } else {
        // Fallback to sequential getProductById if bulk query fails
        for (const item of cartItemsInDb) {
          try {
            const p = await dbService.getProductById(String(item.productId || "").trim());
            if (p) {
              cartItems.push({
                product: p,
                quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
              });
            }
          } catch (e) {
            // Ignore individual fetch failure
          }
        }
      }
    }

    const totalMrp = cartItems.reduce((acc, item) => acc + ((item.product.mrp || 0) * item.quantity), 0);
    const totalAmount = cartItems.reduce((acc, item) => acc + ((item.product.sellingPrice || item.product.mrp || 0) * item.quantity), 0);
    const totalSavings = Math.max(0, totalMrp - totalAmount);

    res.json({
      items: cartItems,
      totalMrp,
      totalAmount,
      totalSavings
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/add", requireAuth, requireVerifiedPharmacy, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const product = await dbService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const dbCart = await dbService.getCart(req.user.id);
    const existing = dbCart.find((c: any) => c.productId === productId);
    const totalQty = (existing ? existing.quantity : 0) + quantity;

    // Bypass stock block for demo
    // if (totalQty > product.availableStock) {
    //   return res.status(400).json({ error: `Only ${product.availableStock} boxes are available in stock.` });
    // }

    if (existing) {
      existing.quantity = totalQty;
    } else {
      dbCart.push({ productId, quantity });
    }

    await dbService.saveCart(req.user.id, dbCart);
    res.json({ success: true, cartCount: dbCart.reduce((acc: number, c: any) => acc + c.quantity, 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/smart-order/cart-all", requireAuth, requireVerifiedPharmacy, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "কার্টে যোগ করার জন্য অন্তত একটি ওষুধ নির্বাচন করুন।" });
  }

  try {
    const productIds = items.map((it: any) => String(it.productId || "").trim()).filter(Boolean);
    if (productIds.length === 0) {
      return res.status(400).json({ error: "কোনো বৈধ ওষুধ পাওয়া যায়নি।" });
    }

    // Retrieve live products from Supabase to validate existence and stock
    const { data: dbProducts } = await dbService.supabaseAdmin
      .from("products")
      .select("id, name, selling_price, mrp, stock_quantity")
      .in("id", productIds);

    const prodLookup = new Map<string, any>();
    (dbProducts || []).forEach((p: any) => {
      prodLookup.set(String(p.id).trim().toLowerCase(), p);
      prodLookup.set(String(p.id).trim(), p);
    });

    // Fallback: If any product was not found in batch, fetch individually
    for (const pId of productIds) {
      const lower = pId.toLowerCase();
      if (!prodLookup.has(lower)) {
        try {
          const individualProd = await dbService.getProductById(pId);
          if (individualProd) {
            prodLookup.set(lower, individualProd);
            prodLookup.set(pId, individualProd);
          }
        } catch (e) {
          // Ignore
        }
      }
    }

    if (prodLookup.size === 0) {
      return res.status(404).json({ error: "নির্বাচিত ওষুধগুলো ক্যাটালগে পাওয়া যায়নি।" });
    }

    const dbCart = await dbService.getCart(req.user.id);

    let addedCount = 0;
    for (const item of items) {
      const pId = String(item.productId || "").trim();
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const prod = prodLookup.get(pId.toLowerCase()) || prodLookup.get(pId);
      if (!prod) continue;

      const targetId = prod.id ? String(prod.id).trim() : pId;
      const existingIndex = dbCart.findIndex((c: any) => String(c.productId || "").trim().toLowerCase() === targetId.toLowerCase());
      if (existingIndex >= 0) {
        dbCart[existingIndex].quantity = (dbCart[existingIndex].quantity || 0) + qty;
      } else {
        dbCart.push({ productId: targetId, quantity: qty });
      }
      addedCount++;
    }

    await dbService.saveCart(req.user.id, dbCart);

    return res.json({
      success: true,
      addedCount,
      cartCount: dbCart.reduce((acc: number, c: any) => acc + (c.quantity || 1), 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "কার্ট আপডেট করতে সমস্যা হয়েছে।" });
  }
});

app.post("/api/cart/update", requireAuth, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const dbCart = await dbService.getCart(req.user.id);
    const item = dbCart.find((c: any) => c.productId === productId);
    const product = await dbService.getProductById(productId);

    if (!item || !product) {
      return res.status(404).json({ error: "Cart item or product not found." });
    }

    // Bypass stock block for demo
    // if (quantity > product.availableStock) {
    //   return res.status(400).json({ error: `Only ${product.availableStock} boxes are available in stock.` });
    // }

    let newCart = dbCart;
    if (quantity <= 0) {
      newCart = dbCart.filter((c: any) => c.productId !== productId);
    } else {
      item.quantity = quantity;
    }

    await dbService.saveCart(req.user.id, newCart);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/remove", requireAuth, async (req, res) => {
  const { productId } = req.body;
  try {
    const dbCart = await dbService.getCart(req.user.id);
    const newCart = dbCart.filter((c: any) => c.productId !== productId);
    await dbService.saveCart(req.user.id, newCart);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/clear", requireAuth, async (req, res) => {
  try {
    await dbService.saveCart(req.user.id, []);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics", requireAuth, async (req, res) => {
  try {
    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.json({
        totalPurchase: 0,
        activeCredit: 0,
        dueAmount: 0,
        totalSavings: 0,
        ordersTrend: []
      });
    }

    const orders = await dbService.getOrders(pharmacy.id);
    const totalPurchase = orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const totalSavings = orders.reduce((sum: number, o: any) => sum + (o.totalSavings || 0), 0);

    const ordersTrend = orders.slice(-7).map((o: any) => ({
      date: new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      amount: o.totalAmount
    }));

    res.json({
      totalPurchase,
      activeCredit: 0,
      dueAmount: 0,
      totalSavings,
      ordersTrend
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROCUREMENT ORDERS & RETURNS ---

app.get("/api/pharmacy/dashboard-summary", requireAuth, async (req, res) => {
  try {
    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.json({
        totalOrders: 0,
        monthlyPurchase: 0,
        creditLimit: 0,
        outstandingDue: 0,
        savedAmount: 0
      });
    }

    const orders = await dbService.getOrders(pharmacy.id);
    const totalOrders = orders.length;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyPurchase = orders
      .filter((o: any) => {
        const d = new Date(o.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0);

    const savedAmount = orders.reduce((sum: number, o: any) => sum + (o.totalSavings || 0), 0);

    res.json({
      totalOrders,
      monthlyPurchase,
      creditLimit: 0,
      outstandingDue: 0,
      savedAmount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    let user = await dbService.getUserById(req.user.id).catch(() => null);
    if (!user) user = req.user;
    if (user?.role === "Pharmacy Owner") {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id);
      if (!pharmacy) return res.json([]);
      const orders = await dbService.getOrders(pharmacy.id);
      return res.json(orders);
    } else if (user?.role === "Admin" || user?.role === "Depot Staff" || user?.role === "Delivery Staff") {
      const orders = await dbService.getOrders();
      return res.json(orders);
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", requireAuth, orderLimiter, validateBody(schemas.orderCreate), async (req, res) => {
  const { paymentMethod, notes, deliveryAddress, paymentStatus, transactionId } = req.body;

  try {
    const cartItems = await dbService.getCart(req.user.id);
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const itemIds = cartItems.map((item: any) => String(item.productId || "").trim()).filter(Boolean);
    if (itemIds.length === 0) {
      return res.status(400).json({ error: "No valid product items in your cart." });
    }

    // Use supabaseAdmin (service role client) to ensure RLS does not block product verification
    let { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', itemIds);

    if (error) {
      console.error("Error querying products during order creation:", error);
      return res.status(400).json({ error: `Failed to query products: ${error.message}` });
    }

    // Normalize map keys for case-insensitive and trimmed UUID lookup
    const productMap = new Map<string, any>();
    (products || []).forEach((p: any) => {
      if (p.id) {
        productMap.set(String(p.id).trim().toLowerCase(), p);
      }
    });

    // Strict verification for any missing products against database catalog
    const validItemIds = [];
    for (const itemId of itemIds) {
      const normalizedId = String(itemId).trim().toLowerCase();
      if (!productMap.has(normalizedId)) {
        const directProd = await dbService.getProductById(itemId);
        if (directProd) {
          productMap.set(normalizedId, directProd);
          validItemIds.push(itemId);
        }
      } else {
        validItemIds.push(itemId);
      }
    }
    
    if (validItemIds.length === 0) {
      return res.status(400).json({ error: "No valid product items in your cart." });
    }
    
    // Filter out invalid items from cartItems array
    const validCartItems = cartItems.filter((item: any) => 
      validItemIds.includes(String(item.productId || "").trim())
    );

    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.status(400).json({ error: "Pharmacy verification profile not found." });
    }

    const st = (pharmacy.verificationStatus || "").toString().toLowerCase();
    if (st === "suspended" || st === "rejected") {
      return res.status(403).json({ error: "Your account is suspended or rejected. Please contact support." });
    }

    const result = await dbService.createOrderTransaction(req.user.id, pharmacy.id, {
      paymentMethod,
      notes,
      paymentStatus,
      transactionId,
      items: validCartItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      deliveryAddress
    });

    await dbService.saveCart(req.user.id, []);
    clearProductCache();

    // Send Real-time Web Push to Pharmacy Owner's mobile
    pushNotificationService.sendPushNotification({
      title: "অর্ডার সফলভাবে গ্রহণ করা হয়েছে! 📦",
      body: `আপনার অর্ডার #${result.order.id.slice(0, 8)} প্লেস হয়েছে। মোট: ৳${(result.order.totalAmount || 0).toLocaleString()}`,
      url: "/#order-tracking",
      tag: `order_${result.order.id}`
    }, req.user.id).catch(() => {});

    // Send Real-time Telegram Notification to Admin (Non-blocking)
    sendOrderAlert({
      orderId: result.order.readableId || result.order.id.slice(0, 8),
      pharmacyName: pharmacy.pharmacyName || pharmacy.ownerName || "Registered Pharmacy",
      itemCount: validCartItems.length,
      totalAmount: result.order.totalAmount || 0,
      adminOrderUrl: `${(process.env.APP_URL || "https://medichain.app").replace(/\/+$/, "")}/#depot`
    }).catch((tgErr) => {
      console.error("[Telegram] Unexpected failure in sendOrderAlert:", tgErr?.message || tgErr);
    });

    res.json({
      success: true,
      orderId: result.order.id,
      order: result.order
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/payments/process", requireAuth, async (req, res) => {
  const { orderId, paymentMethod, walletNumber, pin, amount, transactionId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "Missing order ID" });
  }

  try {
    const generatedTrxId = transactionId || `PGW-${(paymentMethod || "GATEWAY").toUpperCase().substring(0, 5)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const result = await dbService.processPaymentGatewayTransaction(
      orderId,
      paymentMethod || "bKash",
      generatedTrxId,
      amount
    );

    res.json({
      success: true,
      message: `Payment of ৳${result.amount.toLocaleString()} processed successfully via ${paymentMethod || 'bKash'} Gateway`,
      transactionId: generatedTrxId,
      orderId: result.orderId,
      status: result.status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Payment processing failed" });
  }
});

app.get("/api/orders/:id", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function generateInvoicePdf(res: express.Response, order: any, pharmacy: any, invoiceNumber: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.id}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  // Colors and Styles
  const primaryColor = "#3b1a6c"; // Deep Brand Purple
  const accentGreen = "#45a834"; // Fresh Brand Green
  const secondaryColor = "#1e293b"; // Slate-800
  const lightGray = "#f8f5fc"; // Subtle lavender tint
  const grayText = "#64748b";

  // Top Accent Banner
  doc.rect(0, 0, doc.page.width, 10).fill(primaryColor);

  // Company Header (Left)
  doc.moveDown(2);
  doc.fillColor(primaryColor).fontSize(26).font("Helvetica-Bold").text("MediChain", 40, 40);
  doc.fillColor(accentGreen).fontSize(9).font("Helvetica-Bold").text("SMART PARTNER FOR PHARMACIES", 40, 70);
  doc.fillColor(grayText).fontSize(8.5).text("Shorear Tol, Rangpur Sadar\nRangpur, Bangladesh\nPhone: +8801940681989\nEmail: support@medichainbd.com\nWeb: www.medichainbd.com", 40, 84);

  // Invoice Meta (Right)
  const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  
  doc.fillColor(primaryColor).fontSize(22).font("Helvetica-Bold").text("INVOICE", 380, 40, { align: "right" });
  
  doc.fillColor(secondaryColor).fontSize(10).font("Helvetica-Bold").text("Invoice Number:", 380, 72, { align: "right" });
  doc.font("Helvetica").text(invoiceNumber, 380, 86, { align: "right" });
  
  doc.font("Helvetica-Bold").text("Date of Issue:", 380, 102, { align: "right" });
  doc.font("Helvetica").text(createdDate, 380, 116, { align: "right" });
  
  doc.font("Helvetica-Bold").text("Order Reference:", 380, 132, { align: "right" });
  doc.font("Helvetica").text(order.readableId || order.id.substring(0,8).toUpperCase(), 380, 146, { align: "right" });

  doc.moveDown(3);

  // Billing and Shipping Info Box
  const billingY = 190;
  doc.rect(40, billingY, 250, 100).fill(lightGray).stroke(primaryColor).lineWidth(0.5).stroke();
  doc.rect(40, billingY, 250, 20).fill(primaryColor);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text("BILLED TO", 48, billingY + 6);
  
  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(11).text(pharmacy?.pharmacyName || "Registered Pharmacy Partner", 48, billingY + 28);
  doc.font("Helvetica").fontSize(9);
  if (pharmacy?.ownerName) doc.text(`Proprietor: ${pharmacy.ownerName}`, 48, billingY + 44);
  if (pharmacy?.licenseNo) doc.text(`Drug License: ${pharmacy.licenseNo}`, 48, billingY + 56);
  if (pharmacy?.phone) doc.text(`Phone: ${pharmacy.phone}`, 48, billingY + 68);
  if (pharmacy?.address) doc.text(`Address: ${pharmacy.address}`, 48, billingY + 80, { width: 230 });

  // Payment Info Box
  doc.rect(305, billingY, 250, 100).fill(lightGray).stroke(primaryColor).lineWidth(0.5).stroke();
  doc.rect(305, billingY, 250, 20).fill(primaryColor);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text("PAYMENT DETAILS", 313, billingY + 6);
  
  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(10).text("Payment Method:", 313, billingY + 30);
  doc.font("Helvetica").text(order.paymentMethod || "B2B Credit Line", 400, billingY + 30);
  
  doc.font("Helvetica-Bold").text("Payment Status:", 313, billingY + 48);
  doc.font("Helvetica").fillColor(order.paymentStatus === "Paid" ? "#16a34a" : "#dc2626").text((order.paymentStatus || "Pending").toUpperCase(), 400, billingY + 48);
  
  doc.fillColor(secondaryColor).font("Helvetica-Bold").text("Due Date:", 313, billingY + 66);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // 30 days net
  doc.font("Helvetica").text(dueDate.toLocaleDateString("en-GB"), 400, billingY + 66);

  // Table Headers
  const tableTop = 320;
  doc.rect(40, tableTop, doc.page.width - 80, 25).fill(primaryColor);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("white");
  
  doc.text("ITEM DESCRIPTION", 50, tableTop + 8, { width: 180 });
  doc.text("STRENGTH", 240, tableTop + 8, { width: 80 });
  doc.text("QTY", 330, tableTop + 8, { width: 40, align: "center" });
  doc.text("UNIT PRICE", 380, tableTop + 8, { width: 70, align: "right" });
  doc.text("SUBTOTAL", 460, tableTop + 8, { width: 80, align: "right" });

  let position = tableTop + 35;
  
  const items = order.items || [];
  let alternate = false;

  // Table Rows
  for (const item of items) {
    if (position > 700) {
      doc.addPage();
      position = 40;
    }

    if (alternate) {
      doc.rect(40, position - 5, doc.page.width - 80, 20).fill(lightGray);
    }
    alternate = !alternate;

    doc.fontSize(9).font("Helvetica-Bold").fillColor(secondaryColor);
    doc.text(item.name || "Medicine Product", 50, position, { width: 180, lineBreak: false });
    
    doc.font("Helvetica").fillColor(grayText);
    doc.text(item.strength || "-", 240, position, { width: 80, lineBreak: false });
    doc.text((item.quantity || 0).toString(), 330, position, { width: 40, align: "center", lineBreak: false });
    doc.text(`BDT ${item.sellingPrice ? item.sellingPrice.toLocaleString() : "0"}`, 380, position, { width: 70, align: "right", lineBreak: false });
    doc.text(`BDT ${item.subtotal ? item.subtotal.toLocaleString() : "0"}`, 460, position, { width: 80, align: "right", lineBreak: false });
    
    position += 20;
  }

  // Table Footer Line
  doc.moveTo(40, position).lineTo(doc.page.width - 40, position).strokeColor(primaryColor).lineWidth(1).stroke();
  position += 15;

  // Breakdown costs & totals with default 40৳ delivery charge automatically included
  const DEFAULT_DELIVERY_CHARGE = 40;
  const deliveryCharge = order.deliveryCharge !== undefined ? order.deliveryCharge : DEFAULT_DELIVERY_CHARGE;

  const itemsList = order.items || [];
  let calculatedSubtotal = 0;
  let calculatedMrp = 0;
  for (const item of itemsList) {
    const qty = item.quantity || 1;
    const price = item.sellingPrice || 0;
    const mrp = item.mrp || (price * 1.25);
    calculatedSubtotal += (item.subtotal !== undefined ? item.subtotal : price * qty);
    calculatedMrp += mrp * qty;
  }

  const subtotal = calculatedSubtotal > 0 ? calculatedSubtotal : Math.max(0, (order.totalAmount || 0) - deliveryCharge);
  const totalMrp = (order.totalMrp && order.totalMrp > subtotal) ? order.totalMrp : (calculatedMrp || subtotal);
  const totalSavings = (order.totalSavings && order.totalSavings > 0) ? order.totalSavings : Math.max(0, totalMrp - subtotal);
  const netPayable = (order.totalAmount && Math.abs(order.totalAmount - (subtotal + deliveryCharge)) < 1)
    ? order.totalAmount
    : (subtotal + deliveryCharge);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(secondaryColor);
  doc.text("SUBTOTAL (MEDICINES):", 310, position, { width: 140, align: "right" });
  doc.font("Helvetica").text(`BDT ${subtotal.toLocaleString()}`, 460, position, { width: 80, align: "right" });
  position += 18;

  if (totalSavings > 0) {
    doc.font("Helvetica-Bold").fillColor("#16a34a");
    doc.text("WHOLESALE SAVINGS:", 290, position, { width: 160, align: "right" });
    doc.font("Helvetica").text(`- BDT ${totalSavings.toLocaleString()}`, 460, position, { width: 80, align: "right" });
    position += 18;
  }

  doc.font("Helvetica-Bold").fontSize(10).fillColor(secondaryColor);
  doc.text("DELIVERY CHARGE:", 310, position, { width: 140, align: "right" });
  doc.font("Helvetica").text(`BDT ${deliveryCharge.toLocaleString()}`, 460, position, { width: 80, align: "right" });
  position += 22;

  // Draw Total Box
  doc.rect(340, position, doc.page.width - 380, 30).fill(lightGray);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(primaryColor);
  doc.text("NET PAYABLE:", 350, position + 8, { width: 100, align: "right" });
  doc.text(`BDT ${netPayable.toLocaleString()}`, 460, position + 8, { width: 80, align: "right" });
  position += 50;

  // Barcode / Verification Hash area (Simulated with text font)
  doc.font("Courier").fontSize(8).fillColor(grayText);
  doc.text(`*|| ${order.id} ||*`, 40, position);
  doc.text(`VERIFICATION HASH: ${Buffer.from(order.id).toString('base64').substring(0, 16)}`, 40, position + 10);

  // Footer & Terms
  doc.moveDown(4);
  const footerY = doc.page.height - 100;
  doc.moveTo(40, footerY).lineTo(doc.page.width - 40, footerY).strokeColor(lightGray).lineWidth(1).stroke();
  
  doc.font("Helvetica-Bold").fontSize(8).fillColor(secondaryColor).text("Terms & Conditions:", 40, footerY + 15);
  doc.font("Helvetica").fillColor(grayText).fontSize(7);
  doc.text("1. FEFO Policy applies. Goods once delivered and accepted cannot be returned unless expired upon delivery.", 40, footerY + 28);
  doc.text("2. Credit payments must be cleared within 30 days of the invoice date.", 40, footerY + 38);
  doc.text("3. This is a computer-generated tax invoice and requires no physical signature.", 40, footerY + 48);

  doc.end();
}

app.get("/api/orders/:id/invoice", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    let pharmacy = null;
    if (order.pharmacyId) {
      pharmacy = await dbService.getPharmacyById(order.pharmacyId);
    }

    let invoiceNumber = `INV-${order.readableId ? order.readableId.replace("MCH-", "") : order.id.substring(0, 8).toUpperCase()}`;
    try {
      const { data: inv } = await dbService.supabaseAdmin
        .from("invoices")
        .select("invoice_number")
        .eq("order_id", order.id)
        .maybeSingle();
      if (inv?.invoice_number) {
        invoiceNumber = inv.invoice_number;
      }
    } catch (e) {
      // Fall back to default invoiceNumber
    }

    generateInvoicePdf(res, order, pharmacy, invoiceNumber);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/cancel", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Pending" && order.status !== "Confirmed") {
      return res.status(400).json({ error: "Cannot cancel order that is already being processed." });
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, "Cancelled");
    if (error) return res.status(500).json({ error: error.message });

    const updated = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/status", requireAuth, async (req, res) => {
  const { status, otp } = req.body;
  const role = req.user.role;

  if (role === "Pharmacy Owner") {
    return res.status(403).json({ error: "Unauthorized. Pharmacy Owners cannot alter order status manually." });
  }

  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Multi-Role Order Lifecycle Enforcement
    if (role === "Admin") {
      if (status !== "Confirmed" && status !== "Cancelled") {
        return res.status(403).json({ error: "Admin can only confirm or cancel orders." });
      }
    } else if (role === "Depot Staff") {
      if (status !== "Processing" && status !== "Packed" && status !== "Out for Delivery") {
        return res.status(403).json({ error: "Depot staff can only set Processing, Packed, or Out for Delivery." });
      }
    } else if (role === "Delivery Staff") {
      if (status !== "Out for Delivery" && status !== "Delivered") {
        return res.status(403).json({ error: "Delivery staff can only set Out for Delivery or Delivered." });
      }
      if (status === "Delivered") {
        if (!otp || String(otp) !== String(order.handoverOtp)) {
          return res.status(400).json({ error: "Invalid OTP. Handover verification failed." });
        }
      }
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, status);
    if (error) return res.status(500).json({ error: error.message });

    const updated = await dbService.getOrderById(req.params.id);
    
    // Real-time broadcast
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", updated);
      io.to("role_Admin").emit("admin_order_updated", updated);
    }

    // Send Web Push Notification to Pharmacy Owner's Mobile
    if (order.pharmacyId) {
      dbService.getPharmacyById(order.pharmacyId).then(pharmacy => {
        const targetUserId = (pharmacy as any)?.userId || (pharmacy as any)?.user_id || pharmacy?.id;
        if (targetUserId) {
          const statusLabels: Record<string, string> = {
            "Confirmed": "কনফার্ম করা হয়েছে ✅",
            "Processing": "প্রসেসিং হচ্ছে ⚙️",
            "Packed": "প্যাকিং সম্পন্ন 📦",
            "Out for Delivery": "ডেলিভারির জন্য বের হয়েছে 🚚",
            "Delivered": "সফলভাবে ডেলিভার হয়েছে 🎉",
            "Cancelled": "বাতিল করা হয়েছে ❌"
          };
          const label = statusLabels[status] || status;
          pushNotificationService.sendPushNotification({
            title: `অর্ডার #${order.id.slice(0, 8)}: ${label}`,
            body: `আপনার অর্ডারের বর্তমান অবস্থা: ${label}। বিস্তারিত জানতে ট্যাপ করুন।`,
            url: "/#order-tracking",
            tag: `order_${order.id}`
          }, targetUserId).catch(() => {});
        }
      }).catch(() => {});
    }

    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/return", requireAuth, async (req, res) => {
  const { reason, productId, quantity } = req.body;
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({ error: "Only delivered orders can be requested for return." });
    }

    // Default first product if not provided
    const targetProdId = productId || (order.items[0]?.productId);
    const targetQty = quantity || (order.items[0]?.quantity || 1);

    await dbService.createReturnRequest(req.params.id, targetProdId, targetQty, reason || "Damage");
    const updated = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/approve-return", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getReturns();
    const rItem = list.find(r => r.orderId === req.params.id);
    if (!rItem) {
      return res.status(404).json({ error: "Return request not found." });
    }

    await dbService.approveReturn(rItem.id, req.user.id);
    const order = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/reorder", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const newCart = [];
    for (const item of order.items) {
      const product = await dbService.getProductById(item.productId);
      if (product) {
        const addQty = Math.min(item.quantity, product.availableStock);
        if (addQty > 0) {
          newCart.push({ productId: item.productId, quantity: addQty });
        }
      }
    }

    await dbService.saveCart(req.user.id, newCart);
    res.json({ success: true, cartCount: newCart.reduce((acc, c) => acc + c.quantity, 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- FAVOURITES MANAGEMENT ---

app.get("/api/favourites/ids", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getFavouritesIds(req.user.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/favourites", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getFavourites(req.user.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/favourites/toggle", requireAuth, async (req, res) => {
  const { productId } = req.body;
  try {
    const result = await dbService.toggleFavourite(req.user.id, productId);
    res.json({ success: true, isFavourite: result.isFavourite });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- REALTIME COMPATIBLE NOTIFICATIONS ---

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getNotifications(req.user.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleMarkRead = async (req: any, res: any) => {
  try {
    await dbService.markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/api/notifications/read/:id", requireAuth, handleMarkRead);
app.patch("/api/notifications/read/:id", requireAuth, handleMarkRead);
app.post("/api/notifications/:id/read", requireAuth, handleMarkRead);
app.patch("/api/notifications/:id/read", requireAuth, handleMarkRead);

const handleMarkAllRead = async (req: any, res: any) => {
  try {
    await dbService.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/api/notifications/read-all", requireAuth, handleMarkAllRead);
app.patch("/api/notifications/read-all", requireAuth, handleMarkAllRead);


// --- DEPOT CHANNELS ---

app.get("/api/depot/dashboard", requireRole(["Admin", "Depot Staff"]), (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the MediChain Depot Portal.",
    role: req.user.role,
    capabilities: [
      "View Assigned Orders",
      "Update Packing Status",
      "Manage Inventory",
      "Update Batch Information",
      "Manage Expiry Tracking"
    ],
    timestamp: new Date().toISOString()
  });
});

app.get("/api/depot/assigned-orders", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const pendingDepotOrders = orders.filter(o => o.status === "Processing" || o.status === "Packed");
    res.json({ success: true, orders: pendingDepotOrders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/depot/orders", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/:id/accept", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Confirmed");
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/:id/process", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { 
      pickerId = (req as any).user?.id, 
      pickerName = (req as any).user?.name, 
      pickStartedAt, 
      pickCompletedAt = new Date().toISOString(), 
      isBatchPicked, 
      batchId, 
      unverifiedPicksCount 
    } = req.body || {};

    const wmsAttr = {
      pickedBy: pickerId,
      pickerName: pickerName,
      pickStartedAt: pickStartedAt || new Date(Date.now() - 120000).toISOString(),
      pickCompletedAt: pickCompletedAt,
      isBatchPicked: Boolean(isBatchPicked),
      batchId: batchId || undefined,
      unverifiedPicksCount: Number(unverifiedPicksCount || 0)
    };

    const { error } = await dbService.updateOrderStatus(req.params.id, "Processing", undefined, undefined, wmsAttr);
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/batch-process", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { 
      orderIds, 
      pickerId = (req as any).user?.id, 
      pickerName = (req as any).user?.name, 
      pickStartedAt, 
      pickCompletedAt = new Date().toISOString(), 
      batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`, 
      unverifiedPicksCount = 0 
    } = req.body || {};

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: "orderIds array is required" });
    }

    const updatedOrders = [];
    for (const id of orderIds) {
      const wmsAttr = {
        pickedBy: pickerId,
        pickerName: pickerName,
        pickStartedAt: pickStartedAt || new Date(Date.now() - 180000).toISOString(),
        pickCompletedAt: pickCompletedAt,
        isBatchPicked: true,
        batchId: batchId,
        unverifiedPicksCount: Number(unverifiedPicksCount || 0)
      };
      await dbService.updateOrderStatus(id, "Processing", undefined, undefined, wmsAttr);
      const updated = await dbService.getOrderById(id);
      if (updated) {
        updatedOrders.push(updated);
        if (io) {
          io.to(`order_${id}`).emit("order_status_updated", updated);
          io.to("role_Admin").emit("admin_order_updated", updated);
        }
      }
    }

    res.json({ success: true, count: updatedOrders.length, batchId, orders: updatedOrders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/:id/pack", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { 
      packerId = (req as any).user?.id, 
      packerName = (req as any).user?.name, 
      packedAt = new Date().toISOString() 
    } = req.body || {};

    const wmsAttr = {
      packedBy: packerId,
      packerName: packerName,
      packedAt: packedAt
    };

    const { error } = await dbService.updateOrderStatus(req.params.id, "Packed", undefined, undefined, wmsAttr);
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/depot/products/barcode-audit", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const products = await getAllProductsMaster();
    const withBarcode = products.filter(p => p.barcode && p.barcode.trim().length > 0);
    const withoutBarcode = products.filter(p => !p.barcode || p.barcode.trim().length === 0);
    res.json({
      success: true,
      totalProducts: products.length,
      withBarcodeCount: withBarcode.length,
      withoutBarcodeCount: withoutBarcode.length,
      coveragePercent: products.length > 0 ? Math.round((withBarcode.length / products.length) * 100) : 0,
      missingSample: withoutBarcode.slice(0, 20).map(p => ({ id: p.id, name: p.name, company: p.company }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/depot/products/:id/barcode", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { barcode } = req.body || {};
    if (!barcode || !barcode.trim()) {
      return res.status(400).json({ error: "Barcode is required" });
    }
    const result = await dbService.updateProductBarcode(req.params.id, barcode.trim());
    clearProductCache();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/products/backfill-barcodes", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const result = await dbService.backfillMissingBarcodes();
    clearProductCache();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/depot/staff-performance", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const metrics = await dbService.getStaffPerformanceMetrics();
    res.json({ success: true, metrics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/:id/assign-delivery", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { assignedRiderId } = req.body;
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Out for Delivery", undefined, assignedRiderId);
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/depot/delivery-staff", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { data, error } = await dbService.getDeliveryStaff();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, staff: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/update-packing", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { orderId, status } = req.body;
  if (!orderId || !status) {
    return res.status(400).json({ error: "Missing orderId or status parameter." });
  }
  try {
    const { error } = await dbService.updateOrderStatus(orderId, status);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: `Depot: Order packing status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/batch-info", requireRole(["Admin", "Depot Staff"]), (req, res) => {
  res.json({ success: true, message: "Depot: Expiry logs and batch information updated." });
});

// --- DELIVERY CHANNELS ---

app.get("/api/delivery/dashboard", requireRole(["Admin", "Delivery Staff"]), (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the MediChain Delivery Companion API.",
    role: req.user.role,
    capabilities: [
      "View Assigned Deliveries",
      "Update Delivery Status",
      "Mark Delivered"
    ],
    timestamp: new Date().toISOString()
  });
});

app.get("/api/delivery/orders", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const assignedDeliveries = orders.filter(o => o.status === "Packed" || o.status === "Out for Delivery");
    res.json({ success: true, orders: assignedDeliveries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/delivery/status/:id", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  const { status, otp, notes } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing status parameter." });
  }
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (status === "Delivered") {
      if (!otp || String(otp) !== String(order.handoverOtp)) {
        return res.status(400).json({ error: "Invalid OTP. Handover verification failed." });
      }
    }
    
    let finalNotes = order.notes || "";
    if (status === "Failed" && notes) {
      finalNotes = finalNotes ? `${finalNotes}\nFailure Reason: ${notes}` : `Failure Reason: ${notes}`;
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, status, status === "Failed" ? finalNotes : undefined);
    if (error) return res.status(400).json({ error: error.message });
    
    // Real-time broadcast
    if (io) {
      const updated = await dbService.getOrderById(req.params.id);
      io.to(`order_${req.params.id}`).emit("order_status_updated", updated);
      io.to("role_Admin").emit("admin_order_updated", updated);
    }

    res.json({ success: true, message: `Delivery Status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/delivery/history", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const completedDeliveries = orders.filter(o => o.status === "Delivered" || o.status === "Completed" || o.status === "Failed");
    res.json({ success: true, orders: completedDeliveries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMPLETE OPERATIONAL MANAGEMENT SUITE - ADMIN ENDPOINTS ---

app.get("/api/admin/dashboard", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter(o => o.status !== "Cancelled");
    const totalOrders = orders.length;

    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingDeliveries = activeOrders.filter(o => o.status !== "Delivered" && o.status !== "Completed").length;

    const pharmacies = await dbService.getAllPharmacies();
    const pendingVerifications = pharmacies.filter(p => {
      const st = (p.verificationStatus || "").toString().toLowerCase();
      return st !== "approved" && st !== "verified" && st !== "suspended" && st !== "rejected";
    }).length;

    const { count: totalProductsCount } = await dbService.supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true });

    res.json({
      success: true,
      metrics: {
        totalRevenue,
        pendingDeliveries,
        pendingVerifications,
        totalOrders,
        totalProducts: totalProductsCount || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/pharmacies", requireRole(["Admin"]), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  try {
    const list = await dbService.getAllPharmacies(page, limit);
    res.json({ pharmacies: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/status", requireRole(["Admin"]), async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing status parameter." });
  }
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, status, req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Adjusted status of pharmacy ID ${req.params.id} to "${status}"`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/admin/pharmacies/pending", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getAllPharmacies();
    const pending = list.filter(p => p.verificationStatus === "Pending");
    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/pharmacies/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const ph = await dbService.getPharmacyById(req.params.id);
    if (!ph) return res.status(404).json({ error: "Pharmacy not found." });
    res.json(ph);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/pharmacies/:id/documents", requireRole(["Admin"]), async (req, res) => {
  try {
    const ph = await dbService.getPharmacyById(req.params.id);
    if (!ph) return res.status(404).json({ error: "Pharmacy not found." });

    const getDocSignedUrl = async (pathOrUrl?: string) => {
      if (!pathOrUrl) return null;
      if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("data:")) {
        return pathOrUrl;
      }
      try {
        const { data } = await supabaseAdmin.storage
          .from("verification-documents")
          .createSignedUrl(pathOrUrl, 3600);
        return data?.signedUrl || null;
      } catch {
        return null;
      }
    };

    const drugLicensePath = ph.drugLicensePath || (ph.drugLicenseUrl && !ph.drugLicenseUrl.startsWith("http") ? ph.drugLicenseUrl : null);
    const tradeLicensePath = ph.tradeLicensePath || (ph.tradeLicenseUrl && !ph.tradeLicenseUrl.startsWith("http") ? ph.tradeLicenseUrl : null);
    const nidDocumentPath = ph.nidDocumentPath || (ph.nidUrl && !ph.nidUrl.startsWith("http") ? ph.nidUrl : null);

    const [drugLicenseSignedUrl, tradeLicenseSignedUrl, nidDocumentSignedUrl] = await Promise.all([
      getDocSignedUrl(drugLicensePath || ph.drugLicenseUrl),
      getDocSignedUrl(tradeLicensePath || ph.tradeLicenseUrl),
      getDocSignedUrl(nidDocumentPath || ph.nidUrl || ph.nidFrontUrl)
    ]);

    res.json({
      success: true,
      documents: {
        drugLicense: {
          path: drugLicensePath || null,
          url: drugLicenseSignedUrl || ph.drugLicenseUrl || null
        },
        tradeLicense: {
          path: tradeLicensePath || null,
          url: tradeLicenseSignedUrl || ph.tradeLicenseUrl || null
        },
        proprietorNid: {
          path: nidDocumentPath || null,
          url: nidDocumentSignedUrl || ph.nidUrl || ph.nidFrontUrl || null
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/approve", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Approved", req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Approved pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/reject", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Rejected", req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Rejected pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/request-update", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Pending", req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Requested document update for pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/suspend", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Suspended", req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Suspended pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/products/:id/price-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getPriceHistory(req.params.id);
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/inventory/alerts/sync", requireRole(["Admin"]), async (req, res) => {
  const alertsCreated: string[] = [];
  try {
    const settings = await dbService.getSystemSettings();
    const lowStockThreshold = settings.low_stock_threshold || 50;

    // Targeted query for products with low stock (no full catalog dump)
    const { data: lowStockItems } = await supabaseAdmin
      .from("products")
      .select("id, name, stock_quantity, expiry_date")
      .lte("stock_quantity", lowStockThreshold)
      .limit(300);

    for (const p of (lowStockItems || [])) {
      const stock = parseInt(p.stock_quantity ?? "0", 10);
      await dbService.logAlert(`⚠️ Low Stock Alert: ${p.name}`, `The available stock for ${p.name} has fallen to ${stock} units.`, p.id);
      alertsCreated.push(`${p.name} (Low Stock)`);

      if (p.expiry_date) {
        const days = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 180 && days > 0) {
          await dbService.logAlert(`🚨 Expiring Soon: ${p.name}`, `Batch of ${p.name} is expiring on ${p.expiry_date} (${days} days remaining).`, p.id);
          alertsCreated.push(`${p.name} (Expiring)`);
        }
      }
    }

    res.json({ success: true, alertsCreated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/products/export/csv", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const products = await dbService.getProductsRaw();
    const headers = [
      "ID",
      "Product Name",
      "Generic Formula Name",
      "Manufacturer Company",
      "Category",
      "Strength",
      "Pack Size",
      "MRP (BDT)",
      "Selling Price (BDT)",
      "Available Stock",
      "Batch Number",
      "Expiry Date",
      "Image URL"
    ];

    const escapeCSVCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = products.map((p: any) => [
      p.id,
      p.name,
      p.genericName || p.generic_name || "",
      p.company,
      p.category || p.category_name_fallback || "Tablet",
      p.strength || "",
      p.packSize || p.pack_size || "",
      p.mrp,
      p.sellingPrice || p.selling_price || p.mrp,
      p.availableStock !== undefined ? p.availableStock : (p.stock_quantity || 0),
      p.batchNumber || p.batch_number || "",
      p.expiryDate || p.expiry_date || "",
      p.imageUrl || p.image_url || ""
    ]);

    const csvLines = [
      headers.map(escapeCSVCell).join(","),
      ...rows.map((row: any[]) => row.map(escapeCSVCell).join(","))
    ];

    const csvContent = csvLines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medichain-all-products-catalog-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/analytics", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter(o => o.status !== "Cancelled");
    const totalOrders = orders.length;

    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const paidRevenue = activeOrders.filter(o => o.paymentStatus === "Paid").reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingRevenue = activeOrders.filter(o => o.paymentStatus !== "Paid").reduce((sum, o) => sum + o.totalAmount, 0);

    const statusDistribution: Record<string, number> = {};
    orders.forEach(o => {
      statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1;
    });

    const medicineCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!medicineCounts[item.productId]) {
          medicineCounts[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        medicineCounts[item.productId].quantity += item.quantity;
        medicineCounts[item.productId].revenue += item.subtotal;
      });
    });

    const topMedicines = Object.values(medicineCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // a. last7DaysTrend: Aggregate order totals and counts grouped day-by-day for the last 7 calendar days
    const today = new Date();
    const daysMap: Record<string, { date: string; dateStr: string; amount: number; count: number }> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDateStr = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
      const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      daysMap[isoDateStr] = {
        date: dateLabel,
        dateStr: isoDateStr,
        amount: 0,
        count: 0
      };
    }

    activeOrders.forEach(o => {
      if (o.createdAt) {
        const orderDateStr = new Date(o.createdAt).toISOString().split("T")[0];
        if (daysMap[orderDateStr]) {
          daysMap[orderDateStr].amount += o.totalAmount;
          daysMap[orderDateStr].count += 1;
        }
      }
    });

    const last7DaysTrend = Object.values(daysMap);

    // b. topPharmacies: Aggregate and rank top ordering pharmacies by total spend/order volume
    const pharmaciesList = await dbService.getAllPharmacies();
    const pharmacyMap = new Map(pharmaciesList.map(p => [p.id, p]));

    const pharmacySpendMap: Record<string, {
      pharmacyId: string;
      pharmacyName: string;
      ownerName: string;
      city: string;
      totalSpend: number;
      orderCount: number;
    }> = {};

    activeOrders.forEach(o => {
      const phId = o.pharmacyId;
      const ph = pharmacyMap.get(phId);
      const pharmacyName = ph ? ph.pharmacyName : "Unknown Pharmacy";
      const ownerName = ph ? ph.ownerName : "";
      const city = ph ? (ph.city || ph.area || "Dhaka") : "Dhaka";

      if (!pharmacySpendMap[phId]) {
        pharmacySpendMap[phId] = {
          pharmacyId: phId,
          pharmacyName,
          ownerName,
          city,
          totalSpend: 0,
          orderCount: 0
        };
      }
      pharmacySpendMap[phId].totalSpend += o.totalAmount;
      pharmacySpendMap[phId].orderCount += 1;
    });

    const topPharmacies = Object.values(pharmacySpendMap)
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10);

    const revenueOverTime = last7DaysTrend.map(d => ({
      date: d.date,
      amount: d.amount
    }));

    res.json({
      success: true,
      totalOrders,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      statusDistribution,
      topMedicines,
      topPharmacies,
      last7DaysTrend,
      revenueOverTime
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/invoices", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getInvoices();
    res.json({ success: true, invoices: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/invoices/:id/download", requireRole(["Admin"]), async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    let pharmacy = null;
    if (order.pharmacyId) {
      pharmacy = await dbService.getPharmacyById(order.pharmacyId);
    }

    let invoiceNumber = `INV-${order.readableId ? order.readableId.replace("MCH-", "") : order.id.substring(0, 8).toUpperCase()}`;
    try {
      const { data: inv } = await dbService.supabaseAdmin
        .from("invoices")
        .select("invoice_number")
        .eq("order_id", order.id)
        .maybeSingle();
      if (inv?.invoice_number) {
        invoiceNumber = inv.invoice_number;
      }
    } catch (e) {
      // Fall back to default invoiceNumber
    }

    generateInvoicePdf(res, order, pharmacy, invoiceNumber);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/export-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getExportHistory();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/export-history", requireRole(["Admin"]), async (req, res) => {
  const { type, format } = req.body;
  try {
    await dbService.logExportHistory(format, type, 10, req.user.name);
    const list = await dbService.getExportHistory();
    res.json({ success: true, record: list[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function handleStockChangeNotifications(oldStock: number | undefined, newStock: number | undefined, product: any, ioInstance?: any) {
  if (!product || newStock === undefined) return;

  // 1. Automatic Restock Notification & Request Resolution: Triggered when product stock is replenished
  const isRestock = (oldStock !== undefined && oldStock <= 0 && newStock > 0) || (oldStock === undefined && newStock > 0) || (oldStock !== undefined && newStock > oldStock && oldStock <= 10);
  if (isRestock) {
    const title = `স্টক আপডেট: ${product.name}`;
    const message = `সম্মানিত ফার্মেসি পার্টনার, আনন্দের সাথে জানানো যাচ্ছে যে ${product.name} আমাদের ডিপো ইনভেন্টরিতে পুনরায় যুক্ত হয়েছে।`;
    const type = "stock_restock";
    try {
      // 1a. Auto-resolve pending restock requests for this product
      const { resolvedCount, pharmacyIds } = await dbService.resolveRestockRequestsForProduct(product.id);
      if (resolvedCount > 0) {
        log.info(`[Restock Automation] Resolved ${resolvedCount} pending restock requests for ${product.name} across ${pharmacyIds.length} pharmacies.`);
      }

      // 1b. Send targeted notification to each requesting pharmacy
      if (pharmacyIds.length > 0) {
        for (const pharmId of pharmacyIds) {
          await dbService.sendNotification(
            pharmId,
            `🎉 Back in Stock: ${product.name}`,
            `Good news! ${product.name} is now available in depot inventory. Place your wholesale order now.`,
            "stock_restock"
          );
        }
      }

      // 1c. Global broadcast
      await dbService.sendNotification(null, title, message, type);
      if (ioInstance) {
        ioInstance.emit("notification", {
          title,
          message,
          type,
          pharmacyId: null,
          created_at: new Date().toISOString()
        });
        ioInstance.emit("admin_order_updated");
        ioInstance.emit("restock_demand_updated", { productId: product.id, resolvedCount });
      }
    } catch (e) {
      console.warn("Restock notification broadcast error:", e);
    }
  }

  // 2. Automatic Low-Stock Notification: Triggered when product stock drops below 11 boxes
  const isLowStock = newStock < 11 && (oldStock === undefined || oldStock >= 11);
  if (isLowStock) {
    const title = `স্টক সতর্কতা: ${product.name}`;
    const message = `দুঃখিত, ডিপোতে ${product.name} এই মুহূর্তে পাওয়া যাচ্ছে না। খুব শীঘ্রই রিস্টক করা হবে।`;
    const type = "stock_alert";
    try {
      await dbService.sendNotification(null, title, message, type);
      if (ioInstance) {
        ioInstance.emit("notification", {
          title,
          message,
          type,
          pharmacyId: null,
          created_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Low stock alert error:", e);
    }
  }
}

app.post("/api/admin/products", requireRole(["Admin"]), validateBody(schemas.adminProduct), async (req, res) => {
  const productData = req.body;
  const validation = validateProduct(productData);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Database-driven targeted duplicate check (name + company + strength)
    let dupQuery = supabaseAdmin
      .from("products")
      .select("id")
      .ilike("name", productData.name.trim())
      .ilike("company", productData.company.trim())
      .ilike("strength", productData.strength.trim());

    if (productData.id) {
      dupQuery = dupQuery.neq("id", productData.id);
    }
    const { data: duplicate } = await dupQuery.limit(1).maybeSingle();

    if (duplicate) {
      return res.json({
        success: false,
        message: "Product already exists"
      });
    }

    const existing = await dbService.getProductById(productData.id);
    const oldStock = existing?.availableStock;
    if (existing && existing.mrp !== productData.mrp) {
      await dbService.logPriceHistory(productData.id, productData.name, existing.mrp, productData.mrp, existing.sellingPrice, productData.sellingPrice, req.user.name);
    }
    
    // Check for significant price drop on frequently ordered items
    if (existing && productData.sellingPrice < existing.sellingPrice) {
      const dropAmount = existing.sellingPrice - productData.sellingPrice;
      const dropPercentage = (dropAmount / existing.sellingPrice) * 100;
      
      const isFrequentlyOrdered = (existing.soldStock || 0) > 10;

      if (dropPercentage >= 5 && isFrequentlyOrdered) {
        await dbService.sendNotification(
          null, // Broadcast to all
          `Price Drop Alert: ${productData.name}`,
          `Good news! The wholesale price for ${productData.name}, one of our frequently ordered items, has dropped by ${dropPercentage.toFixed(1)}%. Stock up now!`,
          "price_drop"
        );
      }
    }

    const saved = await dbService.addOrUpdateProduct(productData);
    await dbService.logAudit(`Product ${productData.id ? "updated" : "created"}: ${productData.name}`, "Products", saved.id, req.user.email, req.user.role);

    // Invalidate product cache
    clearProductCache();

    // Trigger automatic restock/low-stock notifications
    await handleStockChangeNotifications(oldStock, saved.availableStock, saved, req.app.get("io"));

    res.json({ success: true, message: "Product saved successfully.", product: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/products/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const existing = await dbService.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Product not found." });
    }

    const oldStock = existing.availableStock;
    const updates = req.body;
    const merged = { ...existing, ...updates, id: req.params.id };

    // Validate merged product
    try {
      schemas.adminProduct.parse(merged);
    } catch (valErr: any) {
      const fieldErrors: Record<string, string> = {};
      const issues = valErr.issues || valErr.errors || [];
      issues.forEach((err: any) => {
        if (err.path && err.path.length > 0) {
          fieldErrors[err.path[0]] = err.message;
        } else {
          fieldErrors["_general"] = err.message;
        }
      });
      const detailedError = Object.values(fieldErrors).filter(Boolean).join(". ") || "Validation failed";
      return res.status(400).json({ error: detailedError, fields: fieldErrors });
    }

    if (updates.mrp !== undefined && updates.mrp !== existing.mrp) {
      await dbService.logPriceHistory(req.params.id, merged.name, existing.mrp, updates.mrp, existing.sellingPrice, merged.sellingPrice, req.user.name);
    }

    const saved = await dbService.addOrUpdateProduct(merged);
    await dbService.logAudit(`Product patched: ${saved.name}`, "Products", saved.id, req.user.email, req.user.role);

    // Invalidate product cache
    clearProductCache();

    // Trigger automatic restock/low-stock notifications
    await handleStockChangeNotifications(oldStock, saved.availableStock, saved, req.app.get("io"));

    res.json({ success: true, message: "Product updated in place.", product: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/products/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const existing = await dbService.getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });

    await dbService.deleteProduct(req.params.id);
    await dbService.logAudit(`Product deleted: ${existing.name}`, "Products", req.params.id, req.user.email, req.user.role);

    // Invalidate product cache
    clearProductCache();

    res.json({ success: true, message: "Product deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/inventory/update", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { id, availableStock, batchNumber, expiryDate } = req.body;
  try {
    const existing = await dbService.getProductById(id);
    const oldStock = existing?.availableStock;
    await dbService.updateInventoryStock(id, availableStock, batchNumber, expiryDate);
    const updated = await dbService.getProductById(id);
    await dbService.logAudit(`Inventory updated for product ID ${id}`, "Products", id, req.user.email, req.user.role);

    // Invalidate product cache
    clearProductCache();

    // Trigger automatic restock/low-stock notifications
    await handleStockChangeNotifications(oldStock, updated?.availableStock, updated, req.app.get("io"));

    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- STOCK ALERT SUBSCRIPTIONS API ---

app.post("/api/stock-alerts/subscribe", requireAuth, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Product ID is required." });
  try {
    const userId = req.user?.id || req.user?.email || "anonymous";
    const sub = await dbService.subscribeStockAlert(productId, userId, req.user?.pharmacyId);
    res.json({ success: true, message: "Subscribed to stock alert.", alert: sub });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/stock-alerts/unsubscribe", requireAuth, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Product ID is required." });
  try {
    const userId = req.user?.id || req.user?.email || "anonymous";
    await dbService.unsubscribeStockAlert(productId, userId);
    res.json({ success: true, message: "Unsubscribed from stock alert." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stock-alerts", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.email || "anonymous";
    const alerts = await dbService.getUserStockAlerts(userId);
    res.json({ success: true, alerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/notifications/broadcast", requireRole(["Admin"]), async (req, res) => {
  const { title, message, type, targetType } = req.body;
  const notifType = type || targetType || "global";
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required." });
  }
  try {
    const { error } = await dbService.sendNotification(null, title, message, notifType);
    if (error) {
      log.error("Failed to broadcast notification to DB:", error);
      return res.status(500).json({ error: error.message || "Database insert failed." });
    }

    const ioInstance = req.app.get("io");
    if (ioInstance) {
      ioInstance.emit("notification", {
        title,
        message,
        type: notifType,
        pharmacyId: null,
        created_at: new Date().toISOString()
      });
      ioInstance.emit("admin_order_updated");
    }

    res.json({ success: true });
  } catch (err: any) {
    log.error("Exception in /api/admin/notifications/broadcast:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/products/import/template", requireRole(["Admin", "Pharmacy Owner"]), (req, res) => {
  const csvTemplate = 
    "Product Name,Generic Name,Company,Category,Strength,Pack Size,MRP,Selling Price,Stock,Batch Number,Expiry Date,Image URL\n" +
    "Napa Extra,Paracetamol + Caffeine,Beximco Pharmaceuticals,Tablet,500mg + 65mg,240's Box,480.00,360.00,450,B-NPE92,2027-10-15,https://example.com/napa.png\n" +
    "Seclo 20,Omeprazole,Square Pharmaceuticals,Capsule,20mg,120's Box,720.00,576.00,550,SQ-SEC20,2027-12-05,https://example.com/seclo.png\n";

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=medi_chain_bulk_import_template.csv");
  res.status(200).send(csvTemplate);
});

app.get("/api/admin/products/template", requireRole(["Admin", "Pharmacy Owner"]), (req, res) => {
  const csvTemplate = 
    "Product Name,Generic Name,Company,Category,Strength,Pack Size,MRP,Selling Price,Stock,Batch Number,Expiry Date,Image URL\n" +
    "Napa Extra,Paracetamol + Caffeine,Beximco Pharmaceuticals,Tablet,500mg + 65mg,240's Box,480.00,360.00,450,B-NPE92,2027-10-15,https://example.com/napa.png\n" +
    "Seclo 20,Omeprazole,Square Pharmaceuticals,Capsule,20mg,120's Box,720.00,576.00,550,SQ-SEC20,2027-12-05,https://example.com/seclo.png\n";

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=medi_chain_bulk_import_template.csv");
  res.status(200).send(csvTemplate);
});

app.post("/api/admin/products/import", requireRole(["Admin"]), importLimiter, async (req, res) => {
  const { csvContent, commit } = req.body;
  if (!csvContent || typeof csvContent !== "string") {
    return res.status(400).json({ error: "No CSV content provided." });
  }

  try {
    const prods = await dbService.getProductsRaw();
    const result = importBulkCatalog(csvContent, prods);

    const shouldCommit = commit !== false;
    if (shouldCommit && result.successCount > 0) {
      for (const p of result.importedProducts) {
        await dbService.addOrUpdateProduct(p as any);
      }
      await dbService.logImportHistory("bulk_import.csv", result.successCount, "Completed", req.user.name);
      clearProductCache();
    }

    res.json({
      ...result,
      committed: shouldCommit
    });
  } catch (err: any) {
    res.status(500).json({ error: "Bulk import failed: " + err.message });
  }
});

app.get("/api/admin/import-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getImportHistory();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/import-history", requireRole(["Admin"]), async (req, res) => {
  const { fileName, totalRows, successCount } = req.body;
  try {
    await dbService.logImportHistory(fileName, totalRows, "Completed", req.user.name);
    const list = await dbService.getImportHistory();
    res.json({ success: true, event: list[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/prices", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Pricing schema updated." });
});

app.post("/api/admin/discounts", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Product discount rate applied." });
});

app.post("/api/admin/credit-accounts", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Credit account bounds adjusted." });
});

app.post("/api/admin/trigger-price-drop", requireRole(["Admin"]), async (req, res) => {
  const { title, message } = req.body;
  try {
    await dbService.sendNotification(null, title || "Renata Price Drop Alert", message || "Additional 5% wholesale discount applied.", "price_drop");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/trigger-new-offer", requireRole(["Admin"]), async (req, res) => {
  const { title, message } = req.body;
  try {
    await dbService.sendNotification(null, title || "Exclusive Offer!", message || "Save up to 15% on wholesale select drugs.", "offer");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RESTOCK REQUESTS & STOCK ALERT API ENDPOINTS ---

// 1. Pharmacy Endpoint: Create or verify restock request for out-of-stock product
app.post("/api/stock-alerts/request", requireAuth, async (req, res) => {
  const { productId, requestedQuantity } = req.body;
  if (!productId) {
    return res.status(400).json({ error: "Missing required productId parameter." });
  }

  try {
    // Resolve pharmacy profile securely from authenticated user session
    let pharmacyId = req.user.pharmacy_id;
    if (!pharmacyId) {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id);
      pharmacyId = pharmacy ? pharmacy.id : `ph-${req.user.id}`;
    }

    const { request, isExisting } = await dbService.createRestockRequest(
      productId,
      pharmacyId,
      req.user.id,
      requestedQuantity || 1
    );

    // Notify socket rooms of new demand update
    const ioInstance = req.app.get("io");
    if (ioInstance) {
      ioInstance.emit("restock_demand_updated", { productId, pharmacyId });
    }

    res.json({
      success: true,
      request,
      isExisting,
      message: isExisting 
        ? "You already have an active stock alert for this product." 
        : "Restock request submitted. We will notify you as soon as this item is replenished."
    });
  } catch (err: any) {
    console.error("Restock request error:", err);
    res.status(500).json({ error: err.message || "Failed to process restock request." });
  }
});

// Backward-compatible subscribe endpoint
app.post("/api/stock-alerts/subscribe", requireAuth, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing productId." });
  try {
    let pharmacyId = req.user.pharmacy_id;
    if (!pharmacyId) {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id);
      pharmacyId = pharmacy ? pharmacy.id : `ph-${req.user.id}`;
    }
    const { request, isExisting } = await dbService.createRestockRequest(productId, pharmacyId, req.user.id, 1);
    res.json({ success: true, request, isExisting });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Pharmacy Endpoint: Get logged in pharmacy's restock requests
app.get("/api/stock-alerts/my-requests", requireAuth, async (req, res) => {
  try {
    let pharmacyId = req.user.pharmacy_id;
    if (!pharmacyId) {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id);
      pharmacyId = pharmacy ? pharmacy.id : `ph-${req.user.id}`;
    }

    const requests = await dbService.getPharmacyRestockRequests(pharmacyId);
    res.json({ success: true, requests });
  } catch (err: any) {
    console.error("Fetch my-requests error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Admin Endpoint: Get aggregated product demand list
app.get("/api/admin/restock-requests", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { search, status, sortBy } = req.query;
  try {
    const { demand, metrics } = await dbService.getAdminRestockRequestsGrouped({
      search: search as string,
      status: status as string,
      sortBy: sortBy as any
    });
    res.json({ success: true, demand, metrics });
  } catch (err: any) {
    console.error("Admin get restock requests error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Admin Endpoint: Get restock summary metrics
app.get("/api/admin/restock-requests/metrics", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { metrics } = await dbService.getAdminRestockRequestsGrouped();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Admin Endpoint: Update individual restock request status
app.post("/api/admin/restock-requests/:id/status", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { status } = req.body;
  if (!status || !["pending", "restocked", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value (must be pending, restocked, or cancelled)." });
  }

  try {
    const updated = await dbService.updateRestockRequestStatus(req.params.id, status);
    res.json({ success: true, request: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Admin Endpoint: Manually resolve all requests for a product
app.post("/api/admin/restock-requests/product/:productId/resolve", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { resolvedCount, pharmacyIds } = await dbService.resolveRestockRequestsForProduct(req.params.productId);
    const prod = await dbService.getProductById(req.params.productId);

    // Trigger targeted notifications
    if (prod && pharmacyIds.length > 0) {
      for (const phId of pharmacyIds) {
        await dbService.sendNotification(
          phId,
          `🎉 Back in Stock: ${prod.name}`,
          `Good news! ${prod.name} has been marked as restocked and is available for ordering.`,
          "stock_restock"
        );
      }
    }

    res.json({ success: true, resolvedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/audit-log", requireAuth, async (req, res) => {
  const { action, module, description, entity_id } = req.body;
  try {
    await dbService.logAudit(
      `${action}: ${description || ""}`,
      module || "General",
      entity_id || "",
      req.user.email,
      req.user.role
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/audit-logs", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getAuditLogs();
    res.json({ success: true, auditLogs: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/notifications", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getNotifications();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/notifications/send", requireRole(["Admin"]), async (req, res) => {
  const { title, message, targetType, type, pharmacyId } = req.body;
  const notifType = targetType || type || "global";
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required." });
  }
  try {
    const { error } = await dbService.sendNotification(pharmacyId || null, title, message, notifType);
    if (error) {
      log.error("Failed to insert notification to DB:", error);
      return res.status(500).json({ error: error.message || "Database insert failed." });
    }

    const ioInstance = req.app.get("io");
    if (ioInstance) {
      ioInstance.emit("notification", {
        title,
        message,
        type: notifType,
        pharmacyId: pharmacyId || null,
        created_at: new Date().toISOString()
      });
      ioInstance.emit("admin_order_updated");
    }

    res.json({ success: true });
  } catch (err: any) {
    log.error("Exception in /api/admin/notifications/send:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/run-alert-check", requireRole(["Admin"]), async (req, res) => {
  const alertsCreated: string[] = [];
  try {
    const settings = await dbService.getSystemSettings();
    const lowStockThreshold = settings.low_stock_threshold || 50;

    // Targeted query for low stock products without full catalog dump
    const { data: lowStockItems } = await supabaseAdmin
      .from("products")
      .select("id, name, stock_quantity, expiry_date")
      .lte("stock_quantity", lowStockThreshold)
      .limit(300);

    for (const p of (lowStockItems || [])) {
      const stock = parseInt(p.stock_quantity ?? "0", 10);
      await dbService.logAlert(`⚠️ Low Stock Alert: ${p.name}`, `The available stock for ${p.name} has fallen to ${stock} units.`, p.id);
      alertsCreated.push(`${p.name} (Low Stock)`);

      if (p.expiry_date) {
        const days = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 180 && days > 0) {
          await dbService.logAlert(`🚨 Expiring Soon: ${p.name}`, `Batch of ${p.name} is expiring on ${p.expiry_date} (${days} days remaining).`, p.id);
          alertsCreated.push(`${p.name} (Expiring)`);
        }
      }
    }

    res.json({ success: true, alertsCreated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/finance/summary", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter(o => o.status !== "Cancelled");
    const totalSales = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const todaySales = activeOrders
      .filter(o => o.createdAt.startsWith(todayStr))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const monthlyRevenue = activeOrders
      .filter(o => o.createdAt.startsWith(currentMonthPrefix))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingPayments = activeOrders
      .filter(o => o.paymentStatus === "Pending")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pharmacies = await dbService.getAllPharmacies();
    const totalOutstandingCredit = 0;

    const paymentHistory = orders
      .filter(o => o.paymentStatus === "Paid" || o.paymentStatus === "Refunded")
      .map(o => {
        const ph = pharmacies.find(p => p.id === o.pharmacyId);
        return {
          id: "TXN-" + o.id.replace("MCH-", ""),
          orderId: o.id,
          pharmacyName: ph?.pharmacyName || "Registered Pharmacy",
          amount: o.totalAmount,
          method: o.paymentMethod,
          status: o.paymentStatus,
          date: o.createdAt
        };
      });

    res.json({
      success: true,
      totalSales,
      todaySales,
      monthlyRevenue,
      pendingPayments,
      totalOutstandingCredit,
      pharmacies,
      paymentHistory
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- GLOBAL ERROR HANDLING & INITIALIZATION ---

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({
    error: "An unexpected server error occurred. Please contact MediChain Support.",
    message: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

import { Server as SocketIOServer } from "socket.io";

let serverInstance: any;
let io: SocketIOServer;

async function startServer() {
  log.info(`[${new Date().toISOString()}] [INFO] [System] Initializing MediChain platform startup diagnostics...`);
  try {
    await dbService.getSystemSettings();
    log.info(`[${new Date().toISOString()}] [INFO] [Database] Connection diagnostic: SUCCESS. Supabase database backend is responsive and synchronized.`);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [CRITICAL] [Database] Connection diagnostic: FAILED! Supabase database is unreachable. Error:`, err.message || err);
  }

  // --- AI PRODUCT ENRICHMENT ROUTES ---
app.get("/api/admin/enrichment/status", requireRole(["Admin"]), async (req, res) => {
  try {
    let state = await aiEnrichmentService.getState();
    if (state.status === "running") {
      state = await aiEnrichmentService.tick();
    }
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment status error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/start", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.start(req.body);
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment start error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/pause", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.pause();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/resume", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.resume();
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment resume error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/stop", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.stop();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/retry", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.retryFailed();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/tick", async (req, res) => {
  const auth = req.headers["authorization"];
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const state = await aiEnrichmentService.tick();
    res.json({ ok: true, status: state.status, pending: state.pendingIds.length });
  } catch (err: any) {
    console.error("Enrichment tick error:", err);
    res.status(500).json({ error: err.message });
  }
});

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    log.info(`[${new Date().toISOString()}] [INFO] [System] MediChain Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
    logTelegramConfigStatus();
    initDailyBannerScheduler();
  });

  // Initialize Socket.io
  const socketOrigins = allowedOrigins.length > 0 ? allowedOrigins : [process.env.APP_URL || `http://localhost:${PORT}`];
  io = new SocketIOServer(serverInstance, {
    cors: { origin: socketOrigins, methods: ["GET", "POST"] }
  });
  app.set("io", io);

  io.on("connection", (socket) => {
    log.info(`[${new Date().toISOString()}] [INFO] [Socket] Client connected: ${socket.id}`);
    
    socket.on("join_order_room", (orderId) => {
      socket.join(`order_${orderId}`);
      log.info(`[Socket] Client ${socket.id} joined room: order_${orderId}`);
    });

    socket.on("join_role_room", (role) => {
      socket.join(`role_${role}`);
      log.info(`[Socket] Client ${socket.id} joined room: role_${role}`);
    });

    socket.on("disconnect", () => {
      log.info(`[${new Date().toISOString()}] [INFO] [Socket] Client disconnected: ${socket.id}`);
    });
  });

  




  const gracefulShutdown = (signal: string) => {
    log.warn(`[${new Date().toISOString()}] [WARN] [System] Received ${signal} signal. Initiating graceful shutdown...`);
    if (serverInstance) {
      serverInstance.close(() => {
        log.info(`[${new Date().toISOString()}] [INFO] [System] HTTP server closed gracefully. Releasing remaining handles.`);
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error(`[${new Date().toISOString()}] [ERROR] [System] Graceful shutdown timed out. Forcing process termination.`);
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

// Advances the AI enrichment queue by one batch every minute while the
// server process is alive. Strategy 2: Only ticks if there is an active running job.
cron.schedule("* * * * *", async () => {
  try {
    if (aiEnrichmentService.isRunning()) {
      await aiEnrichmentService.tick();
    }
  } catch (err) {
    console.error("[enrichment] cron tick failed:", err);
  }
});


// Auto-expire Bulk Campaigns every hour
cron.schedule("0 * * * *", async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from("bulk_campaigns")
      .update({ status: "Expired" })
      .eq("status", "Live")
      .lt("end_at", new Date().toISOString());
      
    if (error) {
      console.error("[bulk-deals] Failed to auto-expire campaigns:", error);
    }
  } catch (err) {
    console.error("[bulk-deals] cron tick failed:", err);
  }
});

if (!process.env.VERCEL) {
  startServer();
}

export { app };
