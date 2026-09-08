import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import xss from "xss";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

// Rate Limiters with per-identity key generation (supports reverse proxies)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // 30 attempts per 15 minutes per identity
  keyGenerator: (req: any) => req.user?.id || req.body?.email || ipKeyGenerator(req.ip || "127.0.0.1"),
  message: { error: "Too many authentication attempts. Please try again after a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req: any) => req.user?.id || ipKeyGenerator(req.ip || "127.0.0.1"),
  message: { error: "Too many order submissions. Please try again after 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: (req: any) => req.user?.id || ipKeyGenerator(req.ip || "127.0.0.1"),
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const smartOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  keyGenerator: (req: any) => req.user?.id || ipKeyGenerator(req.ip || "127.0.0.1"),
  message: { error: "Too many OCR requests. Please try again after 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});


// Zod Schemas
export const schemas = {
  signup: z.object({
    email: z.string().email("Invalid email format."),
    password: z.string().min(8, "Password must be at least 8 characters long."),
    name: z.string().min(2, "Name must be at least 2 characters long."),
    role: z.string().optional(),
  }),
  login: z.object({
    email: z.string().email("Invalid email format."),
    password: z.string().min(1, "Password is required."),
  }),
  pharmacyProfile: z.object({
    pharmacyName: z.string().optional(),
    ownerName: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    licenseNo: z.string().optional(),
    nidNumber: z.string().optional(),
    nidOwnerName: z.string().optional(),
    dob: z.string().optional(),
    nidFrontUrl: z.string().optional(),
    nidBackUrl: z.string().optional(),
    drugLicenseExpiry: z.string().optional(),
    drugLicenseUrl: z.string().optional(),
    tradeLicenseNo: z.string().optional(),
    tinNumber: z.string().optional(),
    tradeLicenseUrl: z.string().optional(),
    nidUrl: z.string().optional(),
    email: z.string().optional(),
    city: z.string().optional(),
    division: z.string().optional(),
    district: z.string().optional(),
    thana: z.string().optional(),
    landmark: z.string().optional(),
    status: z.string().optional(),
    submittedAt: z.string().optional(),
    legalConsent: z.any().optional(),
    legal_consent: z.any().optional(),
  }).passthrough(),
  orderCreate: z.object({
    paymentMethod: z.literal("Cash on Delivery").default("Cash on Delivery").optional(),
    notes: z.string().optional(),
    deliveryAddress: z.string().min(5, "Delivery address is required."),
  }).passthrough(),
  adminProduct: z.object({
    name: z.string().min(2, "Product name is required."),
    genericName: z.string().min(2, "Generic name is required."),
    company: z.string().min(2, "Company is required."),
    category: z.string().min(2, "Category is required."),
    strength: z.string().optional(),
    packSize: z.string().optional(),
    mrp: z.number().positive("MRP must be a positive number.").or(z.string().regex(/^\d+(\.\d+)?$/).transform(Number).refine(n => n > 0, "MRP must be a positive number")),
    sellingPrice: z.number().positive("Selling Price must be a positive number.").or(z.string().regex(/^\d+(\.\d+)?$/).transform(Number).refine(n => n > 0, "Selling Price must be a positive number")),
    availableStock: z.number().min(0, "Stock cannot be negative.").or(z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 0, "Stock cannot be negative")),
    batchNumber: z.string().min(1, "Batch number is required."),
    expiryDate: z.string().min(4, "Expiry date is required."),
    imageUrl: z.string().optional(),
  }).refine((data) => data.mrp >= data.sellingPrice, {
    message: "MRP must be greater than or equal to the wholesale Selling Price.",
    path: ["mrp"],
  }),
};

// Validation Middleware
export const validateBody = (schema: z.ZodType<any>) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error: any) {
    const issues = error?.issues || error?.errors || (error instanceof z.ZodError ? (error as any).issues : null) || [];
    if (Array.isArray(issues) && issues.length > 0) {
      const fieldErrors: Record<string, string> = {};
      issues.forEach((err: any) => {
        if (err.path && err.path.length > 0) {
          fieldErrors[err.path[0]] = err.message;
        } else {
          fieldErrors["_general"] = err.message;
        }
      });
      return res.status(400).json({ error: "Validation failed", fields: fieldErrors });
    }
    return res.status(400).json({ error: error?.message || "Invalid request payload" });
  }
};

// Targeted HTML sanitizer helper - only to be used where rich HTML is explicitly rendered
export const sanitizeHtmlString = (value: string): string => {
  if (typeof value !== "string") return value;
  return xss(value.trim());
};

// Deprecated global sanitization middleware:
// Disabled to prevent event loop blocking on multi-megabyte base64 payloads (OCR/images),
// silent password mangling (stripping < and &), and search query degradation (& -> &amp;).
// Application security relies on boundary Zod schemas and React virtual DOM output encoding.
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  next();
};

