# MediChain Security Architecture & Authentication Model

This document outlines the security architecture, authentication lifecycle, Role-Based Access Control (RBAC), and boundary validation enforced across MediChain.

---

## 1. Authentication Lifecycle

MediChain implements a dual-mode authentication strategy tailored for both production deployment (with Supabase Auth) and offline-capable PWA edge resilience.

### A. Obtaining a Token
1. **Frontend Authentication (`src/services/auth.ts`)**:
   - Clients authenticate with email and password via Supabase Auth:
     ```ts
     const { data, error } = await supabase.auth.signInWithPassword({ email, password });
     const token = data.session?.access_token;
     ```
   - In offline/local development, authentication falls back to local cookie session via `/api/auth/local-login`.
2. **Session Persistence**:
   - The verified access token is stored in client memory/localStorage.
   - Cross-origin API calls made via `apiFetch` attach the Bearer token in the standard HTTP header:
     ```http
     Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>
     ```
   - For web session resilience on modern reverse proxies (Cloud Run / Render / Vercel), signed HTTP-only cookies (`cookie-session`) are maintained with `SameSite=None; Secure` in production and a 30-day lifecycle.

### B. Token Verification (`authenticateRequest` in `server.ts`)
1. When a request arrives at the Express backend:
   - The `Authorization` header is inspected for `Bearer <token>`.
   - The token is cryptographically verified server-side against Supabase using the service role client:
     ```ts
     const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
     ```
   - If the token is invalid, expired, or tampered with, the request is rejected immediately with HTTP 401.
2. If no Bearer token is provided, the backend checks the cryptographic `cookie-session` signature.
3. **CRITICAL HARDENING (Phase 6)**: The server **never** trusts client-supplied user identity headers (`x-session-user-id`, `x-session-user-role`, or `x-session-pharmacy-id`). Any incoming `x-session-*` headers are completely stripped and ignored.

### C. Role Resolution
1. Roles are **never** client-assignable. Even if an attacker passes `{ role: "Admin" }` during signup, profile creation, or session synchronization, the role is strictly overridden to `"Pharmacy Owner"`.
2. Role lookup hierarchy:
   - Verified Supabase user ID -> Query `users` database table:
     ```ts
     const { data: profile } = await supabaseAdmin
       .from("users")
       .select("role, pharmacy_id, full_name")
       .eq("id", user.id)
       .maybeSingle();
     ```
   - Role is resolved directly from the authenticated database row.

---

## 2. Role-Based Access Control (RBAC) Matrix

All protected API endpoints require either `requireAuth` (any valid authenticated session) or `requireRole([...])` (explicit role authorization).

| Route / Surface | Allowed Roles | Description |
|---|---|---|
| **Public Routes** | | |
| `GET /api/products` | Public / Edge Cache | Catalog browsing with bounded pagination |
| `GET /api/products/search` | Public / Private Cache | Trigram catalog search |
| `GET /api/categories` | Public | Category list |
| `POST /api/auth/local-login` | Public (Rate Limited) | Local credentials login |
| `POST /api/auth/local-signup` | Public (Rate Limited) | Strict Pharmacy Owner signup |
| `GET /api/hero-carousel` | Public | Active homepage banners |
| `GET /api/bulk-deals/live` | Public | Active wholesale campaigns |
| `GET /api/notifications/vapid-public-key` | Public | Web push public key |
| **Pharmacy Customer Routes** | | |
| `GET /api/auth/me` | Authenticated Users | Current user profile |
| `POST /api/orders` | `Pharmacy Owner` | Checkout (COD Exclusive, server-side totals) |
| `GET /api/orders` | `Pharmacy Owner` (owns order) | Filtered order history (IDOR protected) |
| `GET /api/orders/:id` | `Pharmacy Owner` (owns order) | Order details & invoice |
| `POST /api/orders/:id/cancel` | `Pharmacy Owner` (owns order) | Cancel pending order |
| `GET /api/cart` / `POST /api/cart` | Authenticated Users | Dedicated user cart store |
| `GET /api/notifications` | Authenticated Users | Dedicated user notification inbox |
| `PATCH /api/notifications/:id/read` | Authenticated Users | Mark notification as read |
| `POST /api/stock-alerts/request` | Authenticated Users | Out-of-stock restock request |
| `POST /api/smart-order/scan` | Authenticated Users | Gemini Vision OCR (20 daily quota limit) |
| `POST /api/prescription/scan` | Authenticated Users | Prescription OCR (20 daily quota limit) |
| `POST /api/upload/verification-document` | Authenticated Users | Isolated KYC document upload |
| **Depot & Logistics Routes** | | |
| `GET /api/depot/dashboard` | `Admin`, `Depot Staff` | Depot inventory and orders summary |
| `GET /api/depot/orders` | `Admin`, `Depot Staff` | Orders pending pack and dispatch |
| `POST /api/depot/orders/:id/dispatch` | `Admin`, `Depot Staff` | Assign rider & issue delivery OTP |
| `GET /api/delivery/dashboard` | `Admin`, `Delivery Staff` | Assigned deliveries |
| `POST /api/delivery/orders/:id/verify-otp` | `Admin`, `Delivery Staff` | Confirm delivery with cryptographic OTP |
| **Administrative Routes** | | |
| `GET /api/admin/products` | `Admin`, `Depot Staff` | Full administrative catalog |
| `POST /api/admin/products` | `Admin` | Add new medicine |
| `PUT /api/admin/products/:id` | `Admin` | Modify catalog item |
| `POST /api/admin/products/import` | `Admin` | Batch CSV catalog import |
| `GET /api/admin/products/import/template`| `Admin`, `Depot Staff` | Download CSV template |
| `POST /api/admin/notifications/send` | `Admin` | Dispatch targeted or broadcast notification |
| `GET /api/admin/audit-logs` | `Admin` | Bounded audit log trail (max 200) |
| `GET /api/admin/finance/summary` | `Admin` | Ledger overview |
| `POST /api/cron/expire-campaigns` | `CRON_SECRET` Header | Idempotent bulk campaign expiration worker |

---

## 3. Database Security & Row Level Security (RLS)

- **PostgreSQL Row Level Security (RLS)** is active on all core tables:
  - `products`: Public read for active items; write restricted to service role / admin.
  - `orders` & `order_items`: Read/write strictly restricted to owner `(select auth.uid()) = user_id` or admin.
  - `inventory`: Public read of stock quantities; updates restricted to staff/admin.
  - `notifications`: User-scoped read/update; staff-only for operational alerts.
  - `carts`: User-scoped `(select auth.uid()) = user_id`.
  - `audit_logs`: Admin read-only; append-only via service role.
- **Service Role Isolation**: Express backend connects via `SUPABASE_SERVICE_ROLE_KEY` to execute verified mutations. The key is never exposed to the frontend client bundle.
- **Frontend Anon Key**: `VITE_SUPABASE_ANON_KEY` is public by design; all direct anon accesses are constrained by RLS policies.

---

## 4. Input Validation & Defense in Depth

1. **Zod Boundary Schemas (`src/lib/security.ts`)**:
   - Every state-changing API request (`/api/orders`, `/api/auth/*`, `/api/admin/*`) is validated against strict Zod schemas before hitting business logic.
   - Excess or unrecognized fields are rejected.
2. **PostgREST Injection Elimination**:
   - Template interpolation into PostgREST `.or(...)` filter strings is strictly prohibited.
   - All filters use parameterized builders (`.eq()`, `.in()`) with UUID boundary validation.
3. **Event Loop DoS Prevention**:
   - Multi-megabyte request bodies are parsed without recursive regex scanners.
   - Dedicated 10MB limits protect OCR endpoints while preventing memory exhaustion.
