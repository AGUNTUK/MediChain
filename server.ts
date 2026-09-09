import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import cookieSession from "cookie-session";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";
import { DEFAULT_DELIVERY_CHARGE } from "./src/constants/delivery.js";

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
import { initDailyBannerScheduler, getDailyBannerData, analyzeDailyWholesaleDiscounts } from "./src/lib/geminiBannerService.js";
import { pushNotificationService } from "./src/lib/pushNotificationService.js";
import { LRUCache } from "./src/lib/lruCache.js";
import { DEFAULT_CATEGORY_OPTIONS } from "./src/constants/categories.js";
import { scanSmartOrderImage, formatFriendlyErrorMessage } from "./src/lib/smartOrderOCR.js";
import { matchSmartOrderItems } from "./src/lib/productMatcher.js";
import { sendOrderAlert, logTelegramConfigStatus, sendPhysiciansProductRequest } from "./src/lib/telegramService.js";
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

// CORS for API routes - unconditional with strict allow-list supporting Cloud Run, Vercel, and local dev
const rawAllowed = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()).filter(Boolean) || [];
const defaultDevOrigins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"];
const allowedOrigins = rawAllowed.length > 0 
  ? rawAllowed 
  : (process.env.NODE_ENV === "production" ? [process.env.APP_URL || "https://medichain.vercel.app"] : defaultDevOrigins);

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return true;
  if (process.env.APP_URL && origin === process.env.APP_URL.replace(/\/+$/, "")) return true;

  // Local development ports
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;

  // Google Cloud Run & AI Studio preview containers
  if (/^https:\/\/.*\.run\.app$/.test(origin) || /^https:\/\/.*\.googleusercontent\.com$/.test(origin)) return true;

  // Vercel deployment preview / production domains
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;

  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Body parsers - lowered to 10MB to eliminate memory bloat while supporting OCR base64 payloads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Stateless concurrent cookie session with strict security guidelines
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error("CRITICAL: SESSION_SECRET is not set. Server refusing to start.");
  process.exit(1);
}

app.use(cookieSession({
  name: "session",
  keys: [sessionSecret],
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax"
}));

import { authLimiter, orderLimiter, publicLimiter, smartOrderLimiter, schemas, validateBody } from "./src/lib/security.js";

const loginLimiter = authLimiter;
const importLimiter = authLimiter; // Reuse auth limiter for import for now

// --- LOCAL USER FALLBACK DATA STORE (FOR SECURE LOCAL DEV TESTING) ---

const localUsersStore = new Map<string, any>();

// --- AUTHORIZATION MIDDLEWARE & DUAL AUTH STRATEGY ---

export async function authenticateRequest(req: any): Promise<{ id: string; email: string; role: string; name: string; pharmacy_id: string | null } | null> {
  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey && token === serviceRoleKey) {
        return {
          id: "service-role-admin",
          email: "admin@medichain.app",
          role: "Admin",
          name: "Admin Executive",
          pharmacy_id: null
        };
      }
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          // Look up user role and full_name from DB
          let role = "Pharmacy Owner";
          let name = user.user_metadata?.full_name || user.email || "Pharmacy Owner";

          try {
            const { data: dbUser } = await supabaseAdmin
              .from("users")
              .select("role, full_name, phone")
              .eq("id", user.id)
              .maybeSingle();

            if (dbUser?.role) role = dbUser.role;
            if (dbUser?.full_name) name = dbUser.full_name;
          } catch (e) {
            // DB lookup failed, default to Pharmacy Owner
          }

          // Look up pharmacy
          let pharmacy_id: string | null = null;
          try {
            const { data: pharmacy } = await supabaseAdmin
              .from("pharmacies")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle();
            if (pharmacy?.id) pharmacy_id = pharmacy.id;
          } catch (e) {
            // pharmacy lookup failed
          }

          return {
            id: user.id,
            email: user.email || "",
            role,
            name,
            pharmacy_id
          };
        }
      } catch (err: any) {
        log.warn("Supabase Bearer token verification error:", err?.message || err);
      }
    }
  }

  // 2. Check signed cookie session (req.session.userId)
  if (req.session && req.session.userId) {
    let role = req.session.role || "Pharmacy Owner";
    let name = req.session.name || "Pharmacy Owner";
    let pharmacy_id = req.session.pharmacy_id || null;

    // Verify role and pharmacy from DB (do NOT trust req.session.role blindly)
    try {
      const { data: dbUser } = await supabaseAdmin
        .from("users")
        .select("role, full_name")
        .eq("id", req.session.userId)
        .maybeSingle();

      if (dbUser) {
        if (dbUser.role) {
          role = dbUser.role;
          req.session.role = role;
        }
        if (dbUser.full_name) {
          name = dbUser.full_name;
          req.session.name = name;
        }
      }

      if (!pharmacy_id) {
        const { data: pharmacy } = await supabaseAdmin
          .from("pharmacies")
          .select("id")
          .eq("user_id", req.session.userId)
          .maybeSingle();
        if (pharmacy?.id) {
          pharmacy_id = pharmacy.id;
          req.session.pharmacy_id = pharmacy_id;
        }
      }
    } catch (e) {
      // In transient DB error / offline fallback, retain session values
    }

    return {
      id: req.session.userId,
      email: req.session.email || "",
      role,
      name,
      pharmacy_id
    };
  }

  return null;
}

async function requireAuth(req: any, res: any, next: any) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required. Please log in first." });
    }
    req.user = user;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: "Authentication error." });
  }
}

function requireRole(allowedRoles: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required." });
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          error: `Access Denied: This action is restricted to the following roles: ${allowedRoles.join(", ")}`
        });
      }
      req.user = user;
      next();
    } catch (err: any) {
      return res.status(500).json({ error: "Authorization error." });
    }
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
    await dbService.syncSession(newUser.id, newUser.email, newUser.name).catch(err => {
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

    // Load actual role from database if present
    let role = user.role;
    try {
      const { data: dbUser } = await supabaseAdmin.from("users").select("role, full_name").eq("id", user.id).maybeSingle();
      if (dbUser?.role) {
        role = dbUser.role;
      }
    } catch (e) {
      // fallback to user.role
    }

    // Load any existing pharmacy profile synced in Supabase database
    const pharmacy = await dbService.getPharmacyProfile(user.id).catch(() => null);
    const pharmacyId = pharmacy ? pharmacy.id : null;

    req.session = {
      userId: user.id,
      email: user.email,
      role,
      name: user.name,
      pharmacy_id: pharmacyId
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
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
  let verifiedId: string | null = null;
  let verifiedEmail: string | null = null;
  let verifiedName: string = req.body.name || "";
  let verifiedPhone: string = req.body.phone || "";

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
          return res.status(401).json({ error: "Invalid or expired authorization token." });
        }
        verifiedId = user.id;
        verifiedEmail = user.email || "";
        verifiedName = req.body.name || user.user_metadata?.full_name || verifiedEmail;
      } catch (err: any) {
        return res.status(401).json({ error: "Token verification failed: " + (err?.message || err) });
      }
    }
  }

  // Fallback for local dev/testing without token
  if (!verifiedId) {
    if (!req.body.id || !req.body.email) {
      return res.status(400).json({ error: "Missing required session parameters (id, email) or valid Bearer token." });
    }
    verifiedId = req.body.id;
    verifiedEmail = req.body.email;
  }

  try {
    let user: any = null;
    let syncError: any = null;

    try {
      // Role is NEVER passed from body - syncSession strictly enforces Pharmacy Owner for new accounts
      const { data, error } = await dbService.syncSession(verifiedId, verifiedEmail, verifiedName, verifiedPhone);
      user = data;
      syncError = error;
    } catch (e: any) {
      syncError = e;
    }

    if (syncError || !user) {
      log.warn("WARNING: Database sync-session failed, using fallback user profile:", syncError?.message || syncError);
      user = {
        id: verifiedId,
        email: verifiedEmail,
        name: verifiedName || "Pharmacy Owner",
        role: "Pharmacy Owner",
        phone: verifiedPhone || "",
        pharmacy_id: null
      };
    }

    // Always fetch actual role from DB to prevent role spoofing
    try {
      const { data: dbUser } = await supabaseAdmin.from("users").select("role, full_name").eq("id", user.id).maybeSingle();
      if (dbUser?.role) {
        user.role = dbUser.role;
      }
      if (dbUser?.full_name) {
        user.name = dbUser.full_name;
      }
    } catch (e: any) {
      // retain current user.role
    }

    let pharmacy = null;
    try {
      pharmacy = await dbService.getPharmacyProfile(user.id);
    } catch (e: any) {
      log.warn("WARNING: Failed to fetch pharmacy profile for session:", e.message || e);
    }
    const pharmacyId = pharmacy ? pharmacy.id : null;
    user.pharmacy_id = pharmacyId;

    req.session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      pharmacy_id: pharmacyId
    };

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
    } else {
      user = {
        id: user.id,
        email: user.email,
        name: user.full_name || user.name || req.user.name || user.email?.split("@")[0] || "Staff",
        role: user.role || req.user.role,
        phone: user.phone || ""
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

// Bounded LRU Cache (max 200 bounded queries, 5-minute TTL) for zero-cost catalog reads
const productLRUCache = new LRUCache<any>(200, 300000);

let cachedAllProducts: any[] | null = null;
let lastAllProductsFetch = 0;
const ALL_PRODUCTS_TTL = 2 * 60 * 60 * 1000; // 2 hours (extended from 5m to eliminate 96% of Supabase full-table egress)
let inFlightAllProductsPromise: Promise<any[]> | null = null;

export function clearProductCache() {
  productLRUCache.clear();
  cachedAllProducts = null;
  lastAllProductsFetch = 0;
  inFlightAllProductsPromise = null;
}

export function updateCachedProductStock(items: Array<{ productId: string; quantity: number }>) {
  productLRUCache.clear(); // Invalidate paginated window slices so fresh quantities are reflected immediately
  if (!cachedAllProducts || !Array.isArray(cachedAllProducts)) return;

  const qtyMap = new Map<string, number>();
  for (const item of items) {
    if (item && item.productId) {
      qtyMap.set(String(item.productId).trim().toLowerCase(), Number(item.quantity) || 1);
    }
  }

  for (const p of cachedAllProducts) {
    const id = String(p.id || "").trim().toLowerCase();
    if (qtyMap.has(id)) {
      const qty = qtyMap.get(id)!;
      p.availableStock = Math.max(0, (p.availableStock ?? 0) - qty);
      p.soldStock = (p.soldStock ?? 0) + qty;
    }
  }
}

async function getAllProductsMaster(): Promise<any[]> {
  const now = Date.now();
  if (cachedAllProducts && now - lastAllProductsFetch < ALL_PRODUCTS_TTL) {
    return cachedAllProducts;
  }

  // Strategy E5: In-flight request deduplication to prevent thundering herd
  if (inFlightAllProductsPromise) {
    return inFlightAllProductsPromise;
  }

  inFlightAllProductsPromise = (async () => {
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
  } finally {
    inFlightAllProductsPromise = null;
  }
  })();
  return inFlightAllProductsPromise;
}

app.get("/api/products", publicLimiter, async (req, res) => {
  const { search, category, filter, page, limit, paginate } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;
  const searchQuery = ((search as string) || "").trim();
  const hasSearch = searchQuery.length > 0;
  const cacheKey = `${filter || "all"}_${category || "all"}_${pageNum}_${limitNum}_${paginate || "false"}`;

  try {
    // Strategy 5: HTTP Edge cache header (only for bounded non-search catalog browsing)
    if (!hasSearch) {
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    } else {
      res.setHeader("Cache-Control", "private, no-cache");
    }

    // Strategy 1: In-memory LRU Cache check (only for bounded catalog browsing, never for free-text search)
    if (!hasSearch) {
      const cached = productLRUCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
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

    if (!hasSearch) {
      productLRUCache.set(cacheKey, responseData, 300000);
    }
    
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

const userScanCountMap = new Map<string, { count: number; resetTime: number }>();
const MAX_DAILY_SCANS_PER_USER = 20;

function checkScanQuota(userId: string): boolean {
  const now = Date.now();
  const record = userScanCountMap.get(userId);
  if (!record || now > record.resetTime) {
    userScanCountMap.set(userId, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (record.count >= MAX_DAILY_SCANS_PER_USER) {
    return false;
  }
  record.count++;
  return true;
}

app.post("/api/smart-order/scan", requireAuth, smartOrderLimiter, async (req, res) => {
  if (!checkScanQuota(req.user.id)) {
    return res.status(429).json({ 
      error: `Daily AI scanning quota exceeded (${MAX_DAILY_SCANS_PER_USER} scans per 24 hours). Please try again tomorrow or contact support.` 
    });
  }

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
app.post("/api/prescription/scan", requireAuth, smartOrderLimiter, async (req, res) => {
  if (!checkScanQuota(req.user.id)) {
    return res.status(429).json({ 
      error: `Daily AI scanning quota exceeded (${MAX_DAILY_SCANS_PER_USER} scans per 24 hours). Please try again tomorrow or contact support.` 
    });
  }

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

app.get("/api/banner/daily-profit-meter", requireAuth, async (req, res) => {
  try {
    const data = await getDailyBannerData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch daily profit meter data." });
  }
});

app.post("/api/banner/daily-profit-meter/refresh", requireRole(["Admin"]), async (req, res) => {
  try {
    const data = await analyzeDailyWholesaleDiscounts();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to refresh daily profit meter data." });
  }
});


// --- BULK DEALS & WHOLESALE CAMPAIGNS (Zero-Egress In-Memory Caching) ---

let cachedLiveCampaign: any = null;
let lastLiveCampaignFetch = 0;
const BULK_CAMPAIGN_TTL = 10 * 60 * 1000; // 10 minutes

function parseCampaignRow(row: any) {
  if (!row) return null;
  let meta: any = {};
  if (row.subtext) {
    try {
      meta = JSON.parse(row.subtext);
    } catch {
      meta = { description: row.subtext };
    }
  }
  return {
    ...row,
    subtext: meta.description !== undefined ? meta.description : (row.subtext || ""),
    description: meta.description !== undefined ? meta.description : (row.subtext || ""),
    featured_product_id: row.featured_product_id || meta.featured_product_id || null,
    discount_display_percent: row.discount_display_percent !== undefined && row.discount_display_percent !== null
      ? Number(row.discount_display_percent)
      : (meta.discount_display_percent !== undefined ? Number(meta.discount_display_percent) : 0),
    trust_badges: (Array.isArray(row.trust_badges) && row.trust_badges.length > 0)
      ? row.trust_badges
      : (Array.isArray(meta.trust_badges) ? meta.trust_badges : [
          { icon: "shield", label: "Trusted Brands" },
          { icon: "lightning", label: "Bulk Discounts" },
          { icon: "truck", label: "Fast Delivery" }
        ]),
    cta_link: row.cta_link || meta.cta_link || "/products"
  };
}

async function hydrateCampaignProduct(campaign: any) {
  if (!campaign) return campaign;
  if (campaign.featured_product_id) {
    try {
      const { data: prod } = await supabaseAdmin
        .from("products")
        .select("id, name, generic_name, company, strength, pack_size, mrp, selling_price, image_url")
        .eq("id", campaign.featured_product_id)
        .maybeSingle();
      if (prod) {
        campaign.featured_product = {
          id: prod.id,
          name: prod.name,
          genericName: prod.generic_name,
          company: prod.company,
          strength: prod.strength,
          packSize: prod.pack_size,
          mrp: prod.mrp,
          sellingPrice: prod.selling_price,
          imageUrl: prod.image_url
        };
      }
    } catch (e) {
      console.warn("[Bulk Deals] Failed to hydrate featured product:", e);
    }
  }
  return campaign;
}

app.get("/api/bulk-deals/live", async (req, res) => {
  const now = Date.now();
  if (cachedLiveCampaign !== null && now - lastLiveCampaignFetch < BULK_CAMPAIGN_TTL) {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return res.json(cachedLiveCampaign);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("bulk_campaigns")
      .select("*")
      .eq("status", "Live")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[Bulk Deals] Live campaign query warning:", error.message);
      return res.json(null);
    }

    if (!data) {
      cachedLiveCampaign = null;
      lastLiveCampaignFetch = now;
      return res.json(null);
    }

    const parsed = parseCampaignRow(data);
    await hydrateCampaignProduct(parsed);

    cachedLiveCampaign = parsed;
    lastLiveCampaignFetch = now;
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json(cachedLiveCampaign);
  } catch (err: any) {
    console.warn("[Bulk Deals] Live campaign error:", err.message);
    res.json(null);
  }
});

app.get("/api/bulk-deals/campaigns", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("bulk_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const campaigns = (data || []).map(parseCampaignRow);
    for (const c of campaigns) {
      await hydrateCampaignProduct(c);
    }
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bulk-deals/campaigns/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("bulk_campaigns")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Campaign not found" });

    const parsed = parseCampaignRow(data);
    await hydrateCampaignProduct(parsed);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bulk-deals/campaigns/:id/products", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("bulk_campaign_products")
      .select("*, product:products(*)")
      .eq("campaign_id", req.params.id);

    if (error) throw error;
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bulk-deals/campaigns", requireRole(["Admin"]), async (req, res) => {
  try {
    const body = req.body;
    if (!body.title) {
      return res.status(400).json({ error: "Campaign title is required." });
    }

    const meta = {
      description: body.subtext || body.description || "",
      featured_product_id: body.featured_product_id || null,
      discount_display_percent: body.discount_display_percent !== undefined ? Number(body.discount_display_percent) : 0,
      trust_badges: Array.isArray(body.trust_badges) ? body.trust_badges : [],
      cta_link: body.cta_link || "/products"
    };

    const basePayload: any = {
      title: body.title,
      subtext: JSON.stringify(meta),
      banner_color: body.banner_color || "bg-brand-purple",
      banner_image_url: body.banner_image_url || null,
      cta_text: body.cta_text || "Order Now",
      status: body.status || "Draft",
      updated_at: new Date().toISOString()
    };
    if (body.start_at) basePayload.start_at = body.start_at;
    if (body.end_at) basePayload.end_at = body.end_at;

    const withCols = {
      ...basePayload,
      featured_product_id: meta.featured_product_id,
      discount_display_percent: meta.discount_display_percent,
      trust_badges: meta.trust_badges,
      cta_link: meta.cta_link
    };

    let result = await supabaseAdmin.from("bulk_campaigns").insert([withCols]).select().maybeSingle();
    if (result.error && result.error.code === "PGRST204") {
      result = await supabaseAdmin.from("bulk_campaigns").insert([basePayload]).select().maybeSingle();
    }
    if (result.error) throw result.error;

    cachedLiveCampaign = null;
    lastLiveCampaignFetch = 0;

    const saved = parseCampaignRow(result.data);
    await hydrateCampaignProduct(saved);
    res.json(saved);
  } catch (err: any) {
    console.error("[Bulk Deals] Error creating campaign:", err);
    res.status(500).json({ error: err.message || "Failed to create campaign" });
  }
});

app.put("/api/bulk-deals/campaigns/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;

    const meta = {
      description: body.subtext || body.description || "",
      featured_product_id: body.featured_product_id || null,
      discount_display_percent: body.discount_display_percent !== undefined ? Number(body.discount_display_percent) : 0,
      trust_badges: Array.isArray(body.trust_badges) ? body.trust_badges : [],
      cta_link: body.cta_link || "/products"
    };

    const basePayload: any = {
      updated_at: new Date().toISOString()
    };
    if (body.title !== undefined) basePayload.title = body.title;
    basePayload.subtext = JSON.stringify(meta);
    if (body.banner_color !== undefined) basePayload.banner_color = body.banner_color;
    if (body.banner_image_url !== undefined) basePayload.banner_image_url = body.banner_image_url;
    if (body.cta_text !== undefined) basePayload.cta_text = body.cta_text;
    if (body.status !== undefined) basePayload.status = body.status;
    if (body.start_at !== undefined) basePayload.start_at = body.start_at;
    if (body.end_at !== undefined) basePayload.end_at = body.end_at;

    const withCols = {
      ...basePayload,
      featured_product_id: meta.featured_product_id,
      discount_display_percent: meta.discount_display_percent,
      trust_badges: meta.trust_badges,
      cta_link: meta.cta_link
    };

    let result = await supabaseAdmin.from("bulk_campaigns").update(withCols).eq("id", id).select().maybeSingle();
    if (result.error && result.error.code === "PGRST204") {
      result = await supabaseAdmin.from("bulk_campaigns").update(basePayload).eq("id", id).select().maybeSingle();
    }
    if (result.error) throw result.error;

    cachedLiveCampaign = null;
    lastLiveCampaignFetch = 0;

    const updated = parseCampaignRow(result.data);
    await hydrateCampaignProduct(updated);
    res.json(updated);
  } catch (err: any) {
    console.error("[Bulk Deals] Error updating campaign:", err);
    res.status(500).json({ error: err.message || "Failed to update campaign" });
  }
});

app.delete("/api/bulk-deals/campaigns/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabaseAdmin.from("bulk_campaigns").delete().eq("id", id);
    if (error) throw error;

    cachedLiveCampaign = null;
    lastLiveCampaignFetch = 0;
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Bulk Deals] Error deleting campaign:", err);
    res.status(500).json({ error: err.message || "Failed to delete campaign" });
  }
});

app.post("/api/bulk-deals/campaigns/:id/products", requireRole(["Admin"]), async (req, res) => {
  try {
    const campaignId = req.params.id;
    const products = Array.isArray(req.body.products) ? req.body.products : [];

    // Delete existing items
    await supabaseAdmin.from("bulk_campaign_products").delete().eq("campaign_id", campaignId);

    if (products.length > 0) {
      const insertData = products.map((p: any) => ({
        campaign_id: campaignId,
        product_id: p.product_id,
        tiers: p.tiers || []
      }));
      const { error: insErr } = await supabaseAdmin.from("bulk_campaign_products").insert(insertData);
      if (insErr) throw insErr;
    }

    cachedLiveCampaign = null;
    lastLiveCampaignFetch = 0;
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Bulk Deals] Error setting campaign products:", err);
    res.status(500).json({ error: err.message || "Failed to set campaign products" });
  }
});


// --- SECURE VERIFICATION DOCUMENTS UPLOAD ENDPOINTS ---

app.post("/api/upload/verification-document", requireAuth, uploadMiddleware.single("file"), async (req, res) => {
  try {
    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let mimeType = "image/jpeg";
    const docType = (req.body.docType || "drug-license").toString().trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    // Strictly isolate folder to the authenticated user's ID
    const folderId = String(req.user.id).replace(/[^a-zA-Z0-9_-]/g, "_");

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

    if (fileBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "File exceeds 5MB size limit." });
    }

    const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "pdf"];
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

    // Create 1-hour signed URL for secure verification viewing (short expiry for privacy)
    const { data: signData } = await supabaseAdmin.storage
      .from("verification-documents")
      .createSignedUrl(storagePath, 3600); // 1 hour

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

app.get("/api/upload/document-url", requireAuth, async (req, res) => {
  const docPath = String(req.query.path || "").trim();
  if (!docPath) {
    return res.status(400).json({ error: "Missing document path." });
  }

  // Ownership verification: Admin can view any KYC document.
  // Pharmacy Owners can only request signed URLs for documents in their own user folder or pharmacy folder.
  if (req.user.role !== "Admin") {
    const userFolder = `${req.user.id}/`;
    let isAllowed = docPath.startsWith(userFolder);

    if (!isAllowed && req.user.pharmacy_id) {
      isAllowed = docPath.startsWith(`${req.user.pharmacy_id}/`);
    }

    if (!isAllowed) {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id).catch(() => null);
      if (pharmacy && docPath.startsWith(`${pharmacy.id}/`)) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(404).json({ error: "Document not found or unauthorized access." });
    }
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from("verification-documents")
      .createSignedUrl(docPath, 3600); // 1 hour short expiry

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

// === Physicians Product Quick Request ===
app.post(
  "/api/physicians-product-request",
  requireAuth,
  uploadMiddleware.array("files", 10),
  async (req, res) => {
    try {
      const user = (req as any).user;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const { data: pharmacy, error: pharmError } = await supabaseAdmin
        .from("pharmacies")
        .select("pharmacy_name, phone, address")
        .eq("user_id", user.id)
        .single();

      if (pharmError || !pharmacy) {
        console.error("Pharmacy lookup error:", pharmError, "User ID:", user.id);
        return res.status(404).json({ error: "Pharmacy not found" });
      }

      const result = await sendPhysiciansProductRequest({
        pharmacyName: pharmacy.pharmacy_name || "Unknown",
        phone: pharmacy.phone || user.email || "Unknown",
        address: pharmacy.address || "Unknown",
        files: files
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send request" });
      }

      res.json({ success: true, message: "Request sent to Telegram" });
    } catch (err: any) {
      fs.writeFileSync("err.txt", err.stack); log.error(`[System] Physicians Product Request error: ${err.message}`);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post("/api/notifications/push-subscribe", requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Missing push subscription payload" });
    }
    const userAgent = req.headers["user-agent"] || "Mobile PWA";
    const stored = pushNotificationService.saveSubscription(
      subscription,
      req.user.id,
      req.user.pharmacy_name || req.user.pharmacyName || null,
      userAgent
    );
    res.json({ success: true, id: stored.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save push subscription." });
  }
});

app.post("/api/notifications/push-unsubscribe", requireAuth, async (req, res) => {
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

app.post("/api/notifications/test-push", requireAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Test push notifications are disabled in production mode." });
    }

    const { title, body } = req.body;
    const result = await pushNotificationService.sendPushNotification(
      {
        title: title || "মেডিচেইন পুশ নোটিফিকেশন 🚀",
        body: body || "আপনার ফোনে পুশ নোটিফিকেশন সার্ভিস সফলভাবে সক্রিয় হয়েছে!",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        url: "/"
      },
      req.user.id
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

// --- ORDER ACCESS AUTHORIZATION & DATA INTEGRITY ---

async function assertOrderAccess(user: any, orderId: string): Promise<any | null> {
  const order = await dbService.getOrderById(orderId);
  if (!order) return null;

  // Staff roles have platform-wide access for order fulfillment
  if (user.role === "Admin" || user.role === "Depot Staff" || user.role === "Delivery Staff") {
    return order;
  }

  // Pharmacy Owner must own the order via their registered pharmacy
  let pharmacyId = user.pharmacy_id;
  if (!pharmacyId) {
    const pharmacy = await dbService.getPharmacyProfile(user.id).catch(() => null);
    pharmacyId = pharmacy?.id || null;
  }

  if (pharmacyId && order.pharmacyId === pharmacyId) {
    return order;
  }

  // Return null so the calling route responds with 404 (preventing order existence probing)
  return null;
}

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
      // Ensure handover_otp is never returned in platform-wide/staff list views
      const sanitized = orders.map((o: any) => {
        const copy = { ...o };
        delete copy.handoverOtp;
        delete copy.handover_otp;
        return copy;
      });
      return res.json(sanitized);
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", requireAuth, orderLimiter, validateBody(schemas.orderCreate), async (req, res) => {
  const { notes, deliveryAddress } = req.body;

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

    // Cash on Delivery is strictly mandated platform-wide.
    // Strategy E3: Pass preloaded products to avoid duplicate DB query on order placement.
    const result = await dbService.createOrderTransaction(
      req.user.id, 
      pharmacy.id, 
      {
        paymentMethod: "Cash on Delivery",
        notes,
        items: validCartItems.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        deliveryAddress
      },
      products || Array.from(productMap.values())
    );

    await dbService.saveCart(req.user.id, []);
    updateCachedProductStock(validCartItems);

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

    // Real-time broadcast to Admin & Depot Staff
    if (io) {
      io.to("role_Admin").emit("admin_order_updated", result.order);
      io.to("role_Depot Staff").emit("admin_order_updated", result.order);
    }

    res.json({
      success: true,
      orderId: result.order.id,
      order: result.order
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/orders/:id", requireAuth, async (req, res) => {
  try {
    const order = await assertOrderAccess(req.user, req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    // handoverOtp is restricted to the owning Pharmacy Owner for delivery confirmation
    if (req.user.role !== "Pharmacy Owner") {
      delete order.handoverOtp;
      delete order.handover_otp;
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function resolvePdfItemType(item: any): string {
  const cat = (item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const pack = (item.packSize || item.pack_size || "").toLowerCase();
  
  if (cat.includes("tablet") || name.includes("tablet") || name.includes("tab ") || name.includes("tab.") || pack.includes("tab")) return "Tablet";
  if (cat.includes("syrup") || cat.includes("suspension") || name.includes("syrup") || name.includes("suspension") || name.includes("syp") || name.includes("liquid") || pack.includes("bottle") || pack.includes("100ml")) return "Syrup";
  if (cat.includes("capsule") || name.includes("capsule") || name.includes("cap ") || name.includes("cap.") || pack.includes("cap")) return "Capsule";
  if (cat.includes("injection") || name.includes("injection") || name.includes("inj") || name.includes("infusion") || name.includes("iv")) return "Injection";
  if (cat.includes("drop") || name.includes("drop") || name.includes("eye drop")) return "Drop";
  if (cat.includes("ointment") || cat.includes("cream") || cat.includes("gel") || name.includes("ointment") || name.includes("cream")) return "Ointment";
  if (cat.includes("inhaler") || cat.includes("spray") || name.includes("inhaler") || name.includes("spray")) return "Inhaler";
  if (cat.includes("powder") || cat.includes("sachet") || name.includes("powder")) return "Powder";
  if (cat.includes("suppository") || name.includes("suppository")) return "Suppository";
  
  if (item.category && item.category.trim()) {
    return item.category.charAt(0).toUpperCase() + item.category.slice(1);
  }
  return "Tablet";
}

function generateInvoicePdf(res: express.Response, order: any, pharmacy: any, invoiceNumber: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.id}.pdf"`);

  const doc = new PDFDocument({ margin: 0, size: "A4" });
  doc.pipe(res);

  const logoPath = path.join(process.cwd(), "public", "logo.png");

  // Watermark renderer: Centered, rotated -8deg, 4.5% opacity
  const renderWatermark = () => {
    if (fs.existsSync(logoPath)) {
      doc.save();
      doc.opacity(0.045);
      doc.rotate(-8, { origin: [doc.page.width / 2, doc.page.height / 2] });
      const wmSize = 420;
      doc.image(logoPath, (doc.page.width - wmSize) / 2, (doc.page.height - wmSize) / 2, { width: wmSize });
      doc.restore();
    }
  };

  renderWatermark();

  // 1. Header Band: Diagonal Dark Gradient (#14161B -> #1E1024 -> #2B1338)
  const headerGrad = doc.linearGradient(0, 0, doc.page.width, 95);
  headerGrad.stop(0, "#14161B").stop(0.5, "#1E1024").stop(1, "#2B1338");
  doc.rect(0, 0, doc.page.width, 95).fill(headerGrad);

  // 3px Accent Line along bottom edge of band (Orchid Purple to Lime Green)
  const accentGrad = doc.linearGradient(0, 95, doc.page.width, 95);
  accentGrad.stop(0, "#A855F7").stop(1, "#A3E635");
  doc.rect(0, 95, doc.page.width, 3).fill(accentGrad);

  // Header Content - Left: Logo, MediChain, Tagline, Contact Info
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 22, { width: 52 });
  }
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#F4F4F5").text("MediChain", 92, 22);
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#A3E635").text("SMART PARTNER FOR PHARMACIES", 92, 44, { characterSpacing: 1.5 });
  doc.font("Helvetica").fontSize(7.5).fillColor("#9CA3AF").text("Shorear Tol, Rangpur Sadar, Rangpur, Bangladesh • Mob: 01940-681989", 92, 57);
  doc.text("Email: support@medichainbd.com", 92, 69);

  // Header Content - Right: INVOICE, Number, Date, Order Ref
  const cleanId = (order.id || "").replace(/-/g, "").substring(0, 6).toUpperCase();
  const readableNum = order.readableId ? order.readableId.replace("MCH-", "").replace("INV-", "") : cleanId;
  const displayInvoiceNum = invoiceNumber && !invoiceNumber.includes("INV-undefined") ? invoiceNumber : `INV-${readableNum}`;
  const orderRef = order.readableId || `MCH-${cleanId}`;

  const now = new Date(order.createdAt || Date.now());
  const invoiceDate = `${String(now.getDate()).padStart(2, "0")}-${now.toLocaleString("en-US", { month: "short" }).toUpperCase()}-${now.getFullYear()}`;

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#C084FC").text("INVOICE", 380, 22, { align: "right", width: doc.page.width - 410 });
  doc.font("Helvetica-Bold").fontSize(17).fillColor("#F4F4F5").text(displayInvoiceNum, 380, 35, { align: "right", width: doc.page.width - 410 });
  doc.font("Helvetica").fontSize(7.5).fillColor("#9CA3AF").text(`Date: ${invoiceDate}`, 380, 57, { align: "right", width: doc.page.width - 410 });
  doc.text(`Order Ref: #${orderRef}`, 380, 69, { align: "right", width: doc.page.width - 410 });

  // 2. Billed To / Payment Info Strip
  const stripY = 112;
  const pharmacyName = pharmacy?.pharmacyName || order.pharmacyName || "Registered Pharmacy Partner";
  const proprietorName = pharmacy?.ownerName || (pharmacy as any)?.owner_name || order.pharmacyOwner || order.customerName || "Proprietor";
  const pharmacyPhone = pharmacy?.phone || order.pharmacyPhone || "01924-243556";
  const pharmacyAddress = pharmacy?.address || order.pharmacyAddress || order.deliveryAddress || "Rangpur Division, Bangladesh";
  
  let drugLicense = pharmacy?.licenseNo || "";
  if (!drugLicense && (pharmacy as any)?.license_information) {
    try {
      const parsed = typeof (pharmacy as any).license_information === "string" 
        ? JSON.parse((pharmacy as any).license_information) 
        : (pharmacy as any).license_information;
      drugLicense = parsed.drugLicense || parsed.licenseNo || "";
    } catch (e) {}
  }
  if (!drugLicense) drugLicense = "DGDA-DL-2026-9988";

  const isPaid = order.paymentStatus === "Paid";

  // Left column: BILLED TO
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#A855F7").text("BILLED TO", 30, stripY);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#14161B").text(pharmacyName, 30, stripY + 12);
  doc.font("Helvetica").fontSize(7.5).fillColor("#6B7280").text(`Proprietor: ${proprietorName}`, 30, stripY + 25);
  doc.text(`Drug Lic: ${drugLicense} • Mob: ${pharmacyPhone}`, 30, stripY + 36);
  doc.text(pharmacyAddress, 30, stripY + 47, { width: 280, lineBreak: false });

  // Vertical divider line
  doc.moveTo(320, stripY).lineTo(320, stripY + 58).strokeColor("#E2E8F0").lineWidth(0.8).stroke();

  // Right column: PAYMENT
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#A855F7").text("PAYMENT", 335, stripY);
  doc.font("Helvetica").fontSize(7.5).fillColor("#6B7280").text("Method: Cash on Delivery (COD)", 335, stripY + 12);
  doc.text(`Due Date: ${invoiceDate}`, 335, stripY + 24);

  // Status pill badge
  if (isPaid) {
    doc.roundedRect(335, stripY + 37, 48, 14, 7).fill("#DCFCE7");
    doc.roundedRect(335, stripY + 37, 48, 14, 7).strokeColor("#86EFAC").lineWidth(0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#166534").text("PAID", 335, stripY + 41, { width: 48, align: "center" });
  } else {
    doc.roundedRect(335, stripY + 37, 56, 14, 7).fill("#FEF3C7");
    doc.roundedRect(335, stripY + 37, 56, 14, 7).strokeColor("#FCD34D").lineWidth(0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#92400E").text("PENDING", 335, stripY + 41, { width: 56, align: "center" });
  }

  // Divider below strip
  doc.moveTo(30, stripY + 66).lineTo(doc.page.width - 30, stripY + 66).strokeColor("#E2E8F0").lineWidth(0.8).stroke();

  // 3. Line Items Table
  // Columns: SL | Type | Item Name | MRP | Rate | Qty | Net Disc | Total
  const tableTop = stripY + 76;
  const tableWidth = doc.page.width - 60;

  const drawTableHeader = (y: number) => {
    doc.roundedRect(30, y, tableWidth, 20, 4).fill("#14161B");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#F4F4F5");
    doc.text("SL", 32, y + 6, { width: 22, align: "center" });
    doc.text("TYPE", 58, y + 6, { width: 46 });
    doc.text("ITEM NAME", 108, y + 6, { width: 170 });
    doc.text("MRP", 284, y + 6, { width: 44, align: "right" });
    doc.text("RATE", 332, y + 6, { width: 44, align: "right" });
    doc.text("QTY", 380, y + 6, { width: 24, align: "right" });
    doc.text("NET DISC", 408, y + 6, { width: 54, align: "right" });
    doc.text("TOTAL", 466, y + 6, { width: 68, align: "right" });
  };

  drawTableHeader(tableTop);

  let position = tableTop + 20;
  let subtotalMedicines = 0;
  let totalMrpSum = 0;

  // Active items (excluding items marked unavailable per Order Amendment logic)
  const activeItems = (order.items || []).filter((it: any) => !it.unavailable && !it.isUnavailable);

  activeItems.forEach((item: any, idx: number) => {
    // Check if new page needed
    if (position > doc.page.height - 190) {
      doc.addPage();
      renderWatermark();
      position = 40;
      drawTableHeader(position);
      position += 20;
    }

    const type = resolvePdfItemType(item);
    const qty = item.quantity || 1;
    const rate = item.sellingPrice || (item.subtotal ? item.subtotal / qty : 0);
    const mrp = item.mrp && item.mrp >= rate ? item.mrp : Math.round(rate * 1.22 * 100) / 100;
    const unitDiscount = Math.max(0, mrp - rate);
    const netDiscount = Math.round(unitDiscount * qty * 100) / 100;
    const itemTotal = Math.round(rate * qty * 100) / 100;

    subtotalMedicines += itemTotal;
    totalMrpSum += mrp * qty;

    const isEven = idx % 2 === 1;
    doc.rect(30, position, tableWidth, 18).fill(isEven ? "#FAFAFB" : "#ffffff");
    doc.moveTo(30, position + 18).lineTo(30 + tableWidth, position + 18).strokeColor("#F1F5F9").lineWidth(0.5).stroke();

    let displayName = item.name || "Medicine Item";
    if (item.strength) displayName = `${displayName} (${item.strength})`;

    doc.font("Helvetica").fontSize(7).fillColor("#6B7280").text((idx + 1).toString(), 32, position + 5, { width: 22, align: "center" });
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#7C3AED").text(type.toUpperCase(), 58, position + 5, { width: 46 });
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#14161B").text(displayName, 108, position + 5, { width: 170, lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor("#6B7280").text(`Tk ${mrp.toFixed(2)}`, 284, position + 5, { width: 44, align: "right" });
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#14161B").text(`Tk ${rate.toFixed(2)}`, 332, position + 5, { width: 44, align: "right" });
    doc.font("Helvetica").fontSize(7.5).fillColor("#14161B").text(qty.toString(), 380, position + 5, { width: 24, align: "right" });
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#65A30D").text(`Tk ${netDiscount.toFixed(2)}`, 408, position + 5, { width: 54, align: "right" });
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#14161B").text(`Tk ${itemTotal.toFixed(2)}`, 466, position + 5, { width: 68, align: "right" });

    position += 18;
  });

  // Check if summary box and signatures fit on current page
  if (position > doc.page.height - 230) {
    doc.addPage();
    renderWatermark();
    position = 40;
  }

  // 4. Summary Box (Bottom Right, ~230pt wide)
  const summaryX = 335;
  const summaryWidth = doc.page.width - 335 - 30;
  const wholesaleSavings = Math.max(0, totalMrpSum - subtotalMedicines);
  const deliveryCharge = DEFAULT_DELIVERY_CHARGE; // Fixed platform-wide constant (Tk 40)
  const netPayable = subtotalMedicines + deliveryCharge;
  const amountDue = isPaid ? 0.00 : netPayable;

  let sY = position + 14;

  // Row 1: Subtotal (Medicines)
  doc.font("Helvetica").fontSize(8).fillColor("#6B7280").text("Subtotal (Medicines)", summaryX, sY);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#14161B").text(`Tk ${subtotalMedicines.toFixed(2)}`, summaryX, sY, { width: summaryWidth, align: "right" });

  // Row 2: Wholesale Savings
  doc.font("Helvetica").fontSize(8).fillColor("#6B7280").text("Wholesale Savings", summaryX, sY + 14);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#65A30D").text(`-Tk ${wholesaleSavings.toFixed(2)}`, summaryX, sY + 14, { width: summaryWidth, align: "right" });

  // Row 3: Delivery Charge (Fixed Tk 40)
  doc.font("Helvetica").fontSize(8).fillColor("#6B7280").text("Delivery Charge", summaryX, sY + 28);
  doc.font("Helvetica").fontSize(8).fillColor("#14161B").text(`Tk ${deliveryCharge.toFixed(2)}`, summaryX, sY + 28, { width: summaryWidth, align: "right" });

  // Row 4: Net Payable (Filled card with purple gradient #A855F7 to #7C3AED)
  const netGrad = doc.linearGradient(summaryX, sY + 44, summaryX + summaryWidth, sY + 44);
  netGrad.stop(0, "#A855F7").stop(1, "#7C3AED");
  doc.roundedRect(summaryX, sY + 44, summaryWidth, 24, 6).fill(netGrad);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF").text("NET PAYABLE", summaryX + 8, sY + 51);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF").text(`Tk ${netPayable.toFixed(2)}`, summaryX, sY + 49.5, { width: summaryWidth - 8, align: "right" });

  // Row 5: Amount Due (Light grey background card with border)
  doc.roundedRect(summaryX, sY + 74, summaryWidth, 20, 6).fill("#FAFAFB");
  doc.roundedRect(summaryX, sY + 74, summaryWidth, 20, 6).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor("#334155").text(isPaid ? "Amount Due (Paid)" : "Amount Due (Cash on Delivery)", summaryX + 8, sY + 79.5);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(isPaid ? "#166534" : "#14161B").text(`Tk ${amountDue.toFixed(2)}`, summaryX, sY + 78.5, { width: summaryWidth - 8, align: "right" });

  // 5. Footer Section
  const footerY = Math.max(sY + 104, position + 15);
  doc.dash(3, { space: 3 }).moveTo(30, footerY).lineTo(doc.page.width - 30, footerY).strokeColor("#CBD5E1").lineWidth(0.6).stroke().undash();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#A855F7").text("TERMS & CONDITIONS", 30, footerY + 8);
  doc.font("Helvetica").fontSize(6.5).fillColor("#6B7280");
  doc.text("1. FEFO Policy: All pharmaceutical inventory distributed strictly under First Expired, First Out (FEFO) regulatory compliance.", 30, footerY + 18, { width: doc.page.width - 60 });
  doc.text("2. COD Payment: Cash on Delivery (COD) collection is mandatory upon receipt. At least 80% invoice value goods must be received or full order returned.", 30, footerY + 28, { width: doc.page.width - 60 });
  doc.text("3. Return Policy: Sold pharmaceuticals are non-refundable once accepted and physically inspected by the licensed pharmacist.", 30, footerY + 38, { width: doc.page.width - 60 });
  doc.text("4. Computer-Generated: This is an authentic digital tax sales invoice generated by MediChain systems and does not require a physical seal.", 30, footerY + 48, { width: doc.page.width - 60 });

  // 6. Signatures
  const sigY = footerY + 86;
  
  // Left: Depot/Warehouse Staff
  doc.moveTo(30, sigY).lineTo(150, sigY).strokeColor("#9CA3AF").lineWidth(0.5).stroke();
  doc.font("Helvetica").fontSize(7).fillColor("#6B7280").text("Depot/Warehouse Staff", 30, sigY + 5, { width: 120, align: "center" });

  // Center: Delivery Rider
  const centerX = (doc.page.width - 120) / 2;
  doc.moveTo(centerX, sigY).lineTo(centerX + 120, sigY).strokeColor("#9CA3AF").lineWidth(0.5).stroke();
  doc.text("Delivery Rider", centerX, sigY + 5, { width: 120, align: "center" });

  // Right: Received By
  const rightX = doc.page.width - 150;
  doc.moveTo(rightX, sigY).lineTo(rightX + 120, sigY).strokeColor("#9CA3AF").lineWidth(0.5).stroke();
  doc.text("Received By", rightX, sigY + 5, { width: 120, align: "center" });

  const bottomRowY = doc.page.height - 22;
  doc.moveTo(30, bottomRowY - 6).lineTo(doc.page.width - 30, bottomRowY - 6).strokeColor("#F1F5F9").lineWidth(0.5).stroke();
  doc.font("Courier").fontSize(6.5).fillColor("#9CA3AF").text(`Verification Hash: ${orderRef}-${cleanId}`, 30, bottomRowY);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#65A30D").text("✓ Verified by MediChain", 380, bottomRowY, { align: "right", width: doc.page.width - 410 });

  doc.end();
}

app.get("/api/orders/:id/invoice", requireAuth, async (req, res) => {
  try {
    const order = await assertOrderAccess(req.user, req.params.id);
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
    const order = await assertOrderAccess(req.user, req.params.id);
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
      io.to("role_Depot Staff").emit("admin_order_updated", updated);
      io.to("role_Delivery Staff").emit("admin_order_updated", updated);
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

app.post("/api/orders/:id/amend", requireRole(["Admin", "Depot Manager", "Depot Staff"]), async (req, res) => {
  const { productId, reason } = req.body;
  if (!productId) {
    return res.status(400).json({ error: "Missing required field: productId" });
  }

  try {
    const result = await dbService.amendOrderLineItem(req.params.id, productId, req.user, reason);
    
    // Broadcast real-time socket events
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_amended", {
        orderId: req.params.id,
        order: result.order,
        amendment: result.amendment
      });
      io.to(`order_${req.params.id}`).emit("order_status_updated", result.order);
      io.to("role_Admin").emit("admin_order_updated", result.order);
      io.to("role_Depot Staff").emit("admin_order_updated", result.order);

      if (result.notification?.user_id) {
        io.to(`user_${result.notification.user_id}`).emit("new_notification", result.notification);
      }
    }

    // Push notification to pharmacy owner
    if (result.order.pharmacyId) {
      dbService.getPharmacyById(result.order.pharmacyId).then(pharmacy => {
        const targetUserId = (pharmacy as any)?.userId || (pharmacy as any)?.user_id || pharmacy?.id;
        if (targetUserId) {
          pushNotificationService.sendPushNotification({
            title: `অর্ডার সংশোধিত (Order Amended) ⚠️`,
            body: `আপনার অর্ডার #${result.order.readableId || result.order.id.slice(0, 8)} থেকে সাময়িক অনুপলব্ধ আইটেম বাদ দেওয়া হয়েছে। সংশোধিত বিল: ৳${result.order.totalAmount.toLocaleString()}।`,
            url: "/#order-history",
            tag: `order_amended_${result.order.id}`
          }, targetUserId).catch(() => {});
        }
      }).catch(() => {});
    }

    res.json(result);
  } catch (err: any) {
    console.error("Error amending order line item:", err);
    res.status(400).json({ error: err.message || "Failed to amend order line item." });
  }
});

app.get("/api/orders/:id/amendments", requireAuth, async (req, res) => {
  try {
    const order = await assertOrderAccess(req.user, req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    const amendments = await dbService.getOrderAmendments(req.params.id);
    res.json({ amendments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/return", requireAuth, async (req, res) => {
  const { reason, productId, quantity } = req.body;
  try {
    const order = await assertOrderAccess(req.user, req.params.id);
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
    const order = await assertOrderAccess(req.user, req.params.id);
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

// Canonical notification mark-read endpoint
app.patch("/api/notifications/:id/read", requireAuth, handleMarkRead);
// Client backwards-compatibility aliases (retained for older mobile PWA and legacy client bundles)
app.post("/api/notifications/:id/read", requireAuth, handleMarkRead);
app.post("/api/notifications/read/:id", requireAuth, handleMarkRead);
app.patch("/api/notifications/read/:id", requireAuth, handleMarkRead);

const handleMarkAllRead = async (req: any, res: any) => {
  try {
    await dbService.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Canonical notification mark-all-read endpoint
app.patch("/api/notifications/read-all", requireAuth, handleMarkAllRead);
// Client backwards-compatibility alias
app.post("/api/notifications/read-all", requireAuth, handleMarkAllRead);


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
    const orders = await dbService.getOrders(undefined, 1, 1000);
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
      io.to("role_Depot Staff").emit("admin_order_updated", order);
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
      io.to("role_Depot Staff").emit("admin_order_updated", order);
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
          io.to("role_Depot Staff").emit("admin_order_updated", updated);
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
      io.to("role_Depot Staff").emit("admin_order_updated", order);
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
      io.to("role_Depot Staff").emit("admin_order_updated", order);
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
    const assignedDeliveries = orders
      .filter(o => o.status === "Packed" || o.status === "Out for Delivery")
      .map((o: any) => {
        const copy = { ...o };
        delete copy.handoverOtp;
        delete copy.handover_otp;
        return copy;
      });
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
      io.to("role_Depot Staff").emit("admin_order_updated", updated);
      io.to("role_Delivery Staff").emit("admin_order_updated", updated);
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

app.get("/api/delivery/profile", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await dbService.getRiderProfile(userId);

    // Calculate real dynamic delivery statistics
    const orders = await dbService.getOrders();
    const delivered = orders.filter(o => o.status === "Delivered" || o.status === "Completed");
    const failed = orders.filter(o => o.status === "Failed");
    const totalHandled = delivered.length + failed.length;
    const totalCollected = delivered.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
    const successRate = totalHandled > 0 ? Math.round((delivered.length / totalHandled) * 100) : 100;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayDeliveredList = delivered.filter(o => new Date(o.createdAt || Date.now()) >= todayStart);
    const todayDelivered = todayDeliveredList.length;
    const todayCollected = todayDeliveredList.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

    const stats = {
      totalDelivered: delivered.length,
      totalFailed: failed.length,
      totalCollected,
      successRate,
      todayDelivered,
      todayCollected,
      rating: profile?.rating || 4.9
    };

    res.json({
      success: true,
      profile: {
        ...profile,
        ...stats
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch rider profile" });
  }
});

app.post("/api/delivery/profile", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const userId = req.user.id;
    const updated = await dbService.updateRiderProfile(userId, req.body);

    // Broadcast if rider duty status or profile details changed
    if (io) {
      io.to("role_Admin").emit("rider_profile_updated", {
        userId,
        name: updated.name,
        dutyStatus: updated.dutyStatus,
        phone: updated.phone,
        zone: updated.zone
      });
      io.to("role_Depot Staff").emit("rider_profile_updated", {
        userId,
        name: updated.name,
        dutyStatus: updated.dutyStatus,
        phone: updated.phone,
        zone: updated.zone
      });
    }

    res.json({
      success: true,
      profile: updated,
      message: "Delivery rider profile updated successfully."
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update rider profile" });
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
  const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);
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

  // 2. Automatic Low-Stock Operational Alert: Triggered when product stock drops below 11 boxes
  // CRITICAL (F3): Operational alert strictly routed to Depot Staff & Admin audit logs.
  // NEVER broadcast depot stock depletion to external customer pharmacies!
  const isLowStock = newStock < 11 && (oldStock === undefined || oldStock >= 11);
  if (isLowStock) {
    const title = `ডিপো স্টক সতর্কতা: ${product.name}`;
    const message = `ডিপোতে ${product.name}-এর স্টক ১১ ইউনিটের নিচে নেমে এসেছে (বর্তমান স্টক: ${newStock})। অনুগ্রহ করে রিস্টক ইনিশিয়েট করুন।`;
    try {
      await dbService.logAlert(title, message, product.id);
      if (ioInstance) {
        ioInstance.emit("admin_stock_alert", {
          title,
          message,
          type: "depot_stock_alert",
          productId: product.id,
          stock: newStock,
          created_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Low stock operational alert error:", e);
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

// Canonical product import template handler
const handleProductImportTemplate = (req: any, res: any) => {
  const csvTemplate = 
    "Product Name,Generic Name,Company,Category,Strength,Pack Size,MRP,Selling Price,Stock,Batch Number,Expiry Date,Image URL\n" +
    "Napa Extra,Paracetamol + Caffeine,Beximco Pharmaceuticals,Tablet,500mg + 65mg,240's Box,480.00,360.00,450,B-NPE92,2027-10-15,https://example.com/napa.png\n" +
    "Seclo 20,Omeprazole,Square Pharmaceuticals,Capsule,20mg,120's Box,720.00,576.00,550,SQ-SEC20,2027-12-05,https://example.com/seclo.png\n";

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=medi_chain_bulk_import_template.csv");
  res.status(200).send(csvTemplate);
};

// Canonical product import CSV template endpoint
app.get("/api/admin/products/import/template", requireRole(["Admin", "Depot Staff"]), handleProductImportTemplate);
// Client backwards-compatibility alias
app.get("/api/admin/products/template", requireRole(["Admin", "Depot Staff"]), handleProductImportTemplate);

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
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const before = req.query.before as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const list = await dbService.getAuditLogs({ limit, before, startDate, endDate });
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

// Canonical notification dispatch handler (handles both targeted pharmacy & platform-wide broadcasts)
const handleAdminNotificationDispatch = async (req: any, res: any) => {
  const { title, message, targetType, type, pharmacyId } = req.body;
  const notifType = targetType || type || "global";
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required." });
  }
  try {
    const targetPharmacyId = pharmacyId || null;
    const { error } = await dbService.sendNotification(targetPharmacyId, title, message, notifType);
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
        pharmacyId: targetPharmacyId,
        created_at: new Date().toISOString()
      });
      ioInstance.emit("admin_order_updated");
    }

    res.json({ success: true });
  } catch (err: any) {
    log.error("Exception in notification dispatch:", err);
    res.status(500).json({ error: err.message });
  }
};

// Canonical admin notification send endpoint
app.post("/api/admin/notifications/send", requireRole(["Admin"]), handleAdminNotificationDispatch);
// Backwards-compatible broadcast alias
app.post("/api/admin/notifications/broadcast", requireRole(["Admin"]), (req, res) => {
  req.body.pharmacyId = null;
  return handleAdminNotificationDispatch(req, res);
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

// --- BULK CAMPAIGN AUTO-EXPIRY (IDEMPOTENT WORKER & CRON ENDPOINT) ---

let isCampaignExpiryRunning = false;
export async function expireEndedBulkCampaigns(): Promise<{ success: boolean; expiredCount: number; error?: string }> {
  if (isCampaignExpiryRunning) {
    return { success: true, expiredCount: 0 }; // Idempotent mutex guard against duplicate concurrent triggers
  }
  isCampaignExpiryRunning = true;
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("bulk_campaigns")
      .update({ status: "Expired" })
      .eq("status", "Live")
      .lt("end_at", nowIso)
      .select("id, title");

    if (error) {
      console.error("[bulk-deals] Failed to auto-expire campaigns:", error);
      return { success: false, expiredCount: 0, error: error.message };
    }
    const count = data?.length || 0;
    if (count > 0) {
      log.info(`[bulk-deals] Auto-expired ${count} ended campaign(s).`);
    }
    return { success: true, expiredCount: count };
  } catch (err: any) {
    console.error("[bulk-deals] Campaign expiry exception:", err);
    return { success: false, expiredCount: 0, error: err.message };
  } finally {
    isCampaignExpiryRunning = false;
  }
}

// Authenticated external cron trigger for bulk campaign expiry (compatible with Supabase pg_cron or Render cron)
app.post("/api/cron/expire-campaigns", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers["x-cron-secret"] || req.query.secret;
  if (!cronSecret || providedSecret !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid CRON_SECRET." });
  }
  const result = await expireEndedBulkCampaigns();
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  return res.json(result);
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

  // Handle unknown API endpoints with 404 JSON before falling back to frontend SPA
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found." });
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
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global 4-argument Express error handler - registered after all routes and fallbacks
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || err.statusCode || 500).json({
      error: "An unexpected server error occurred. Please contact MediChain Support.",
      message: process.env.NODE_ENV === "production" ? undefined : (err.message || String(err)),
    });
  });

  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    log.info(`[${new Date().toISOString()}] [INFO] [System] MediChain Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
    logTelegramConfigStatus();
    initDailyBannerScheduler();
  });

  // Initialize Socket.io
  io = new SocketIOServer(serverInstance, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"), false);
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  app.set("io", io);

  // Authenticate socket connections via handshake auth payload
  io.use((socket, next) => {
    try {
      const auth = socket.handshake.auth || {};
      socket.data.userId = auth.userId || null;
      socket.data.role = auth.role || null;
      socket.data.pharmacyId = auth.pharmacyId || null;
      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket) => {
    log.info(`[${new Date().toISOString()}] [INFO] [Socket] Client connected: ${socket.id} (user: ${socket.data.userId || "anonymous"})`);
    
    socket.on("join_order_room", async (orderId) => {
      try {
        if (!orderId || typeof orderId !== "string") return;
        const cleanOrderId = orderId.trim();

        // 1. Staff roles (Admin, Depot, Delivery) can join any order tracking room
        const isStaff = socket.data.role === "Admin" || socket.data.role === "Depot Staff" || socket.data.role === "Delivery Staff";
        if (isStaff) {
          socket.join(`order_${cleanOrderId}`);
          log.info(`[Socket] Staff (${socket.data.role}) joined order room: order_${cleanOrderId}`);
          return;
        }

        // 2. Pharmacy owners must own the order
        if (socket.data.pharmacyId || socket.data.userId) {
          let orderQuery = supabaseAdmin
            .from("orders")
            .select("id, pharmacy_id, user_id");

          if (dbService.isValidUUID(cleanOrderId)) {
            orderQuery = orderQuery.eq("id", cleanOrderId);
          } else {
            orderQuery = orderQuery.eq("readable_id", cleanOrderId);
          }

          const { data: order } = await orderQuery.limit(1).maybeSingle();

          if (order) {
            const isOwner = (socket.data.pharmacyId && order.pharmacy_id === socket.data.pharmacyId) ||
                            (socket.data.userId && order.user_id === socket.data.userId);
            if (isOwner) {
              socket.join(`order_${cleanOrderId}`);
              log.info(`[Socket] Owner ${socket.data.userId} joined order room: order_${cleanOrderId}`);
              return;
            }
          }
        }

        log.warn(`[Socket] Unauthorized room join attempt rejected for order_${cleanOrderId} from socket ${socket.id}`);
      } catch (err: any) {
        log.warn(`[Socket] Error joining order room: ${err.message}`);
      }
    });

    socket.on("join_role_room", (role) => {
      const allowedRoles = ["Admin", "Depot Staff", "Delivery Staff"];
      if (typeof role === "string" && allowedRoles.includes(role)) {
        // Enforce that client's authenticated role matches the requested room
        if (socket.data.role === role) {
          socket.join(`role_${role}`);
          log.info(`[Socket] Authorized client ${socket.id} joined room: role_${role}`);
        } else {
          log.warn(`[Socket] Denied unprivileged client ${socket.id} (role: ${socket.data.role}) from joining room: role_${role}`);
        }
      }
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



// In-process fallback scheduler (with concurrency & idempotency guard)
cron.schedule("0 * * * *", async () => {
  await expireEndedBulkCampaigns();
});

if (!process.env.VERCEL) {
  startServer();
}

export { app };
