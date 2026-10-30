# Permanent Context & Working Memory — MediChain

**Last Updated:** 2026-10-30  
**Active Project State:** High-Stability Live Production Mode  
**Architecture:** React 19 SPA + Express Monolith on Vercel Serverless (`api/index.ts`) & Port 3000 Local Dev + PostgreSQL (Supabase)  
**Production URL:** `https://medichainbd.vercel.app`  
**Payment Model:** 100% Cash on Delivery (COD) Exclusive  

---

## 1. Core Operating Context

1. **Active Roles & Access Control:**
   - `Pharmacy Owner`: Catalog browsing, wholesale cart, COD checkout, order tracking with 6-digit OTP, invoice viewer, and Pharma Khata Hub (Customer Khata, Supplier Khata, Short Book, Cashbook).
   - `Depot Staff`: Order picking center (sorted by rack/shelf coordinates), 80mm thermal receipt printer preview, barcode verification. Exempt from pharmacy onboarding.
   - `Delivery Staff (Rider)`: Real-time parcel queue, one-click caller, OTP verification modal, failure reporting, delivery history. Exempt from pharmacy onboarding.
   - `Admin`: User management, pharmacy KYC approvals, catalog import, pricing updates, bulk deal tiers, hero banners, analytics. Exempt from pharmacy onboarding.

2. **Critical Architectural Decisions:**
   - **No Payment Gateways:** All digital payment gateways (bKash/Nagad/SSLCommerz) and credit card flows have been permanently removed. COD is the only active payment method.
   - **No Autonomous Web Scraping:** AI background crawling engines have been disabled to preserve server egress and DB stability.
   - **Universal Bengali Typography:** Custom `@font-face` `Li Alinur Banglaborno` is configured globally in `src/index.css`.
   - **State-Based SPA Navigation:** Main view state is governed by `appStep` & `activeTab` in `src/App.tsx`. Do NOT introduce `react-router-dom`.
   - **Authenticated API Client:** Always use `apiFetch()` (`/src/lib/apiFetch.ts`) to make backend requests.
   - **Non-Recursive RLS & Session Sync:** Session synchronization `/api/auth/sync-session` uses Supabase Admin service-role to avoid PostgreSQL RLS recursion (42P17).

---

## 2. Key Server Endpoints (`server.ts` & `api/index.ts`)

| Route | Method | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/auth/me` | GET | All | Current session & user role verification |
| `/api/auth/sync-session` | POST | Authenticated | Authoritative session sync, role resolution & onboarding status |
| `/api/products` | GET | Public | Products catalog with in-memory caching |
| `/api/products/search` | GET | Public | Multi-token search with Bengali phonetic matching |
| `/api/orders` | GET/POST | Pharmacy/Admin | Fetch pharmacy orders or place new COD order |
| `/api/orders/:id/track` | GET | Pharmacy/Rider | Real-time delivery timeline & 6-digit OTP |
| `/api/khata/bundle` | GET | Pharmacy | Load complete Khata bundle (Short Book, Customers, Suppliers, Transactions) |
| `/api/khata/short-book` | POST | Pharmacy | Upsert shortage book item with verified pharmacy UUID |
| `/api/khata/short-book/:id` | DELETE | Pharmacy | Delete shortage book item |
| `/api/khata/short-book/bulk-status` | POST | Pharmacy | Batch update short book statuses (`In Cart`, `Ordered`, etc.) |
| `/api/depot/orders` | GET | Depot Staff | Warehouse order center with rack coordinates |
| `/api/depot/status/:id` | POST | Depot Staff | Update order stage (`Processing`, `Packed`, `Dispatched`) |
| `/api/delivery/orders` | GET | Delivery Staff | Active assigned deliveries for the rider |
| `/api/delivery/history` | GET | Delivery Staff | Completed/historical deliveries |
| `/api/delivery/status/:id` | POST | Delivery Staff | Handover with 6-digit OTP verification or failure report |
| `/api/notifications/telegram/test` | POST | Admin | Telegram bot operations alert test |
| `/api/smart-order/ocr` | POST | Authenticated | Google Gemini Vision handwriting OCR scanner |

---

## 3. Real-Time Socket.io Rooms

- `role_Admin`: Broadcasts global order events and KYC verification requests.
- `role_Depot Staff`: Broadcasts new orders requiring batch pick and packing.
- `role_Delivery Staff`: Broadcasts dispatched parcels ready for delivery.
- `order_[orderId]`: Broadcasts live status transitions directly to the pharmacy owner's screen.

---

## 4. Current Quality & Build Status

- **TypeScript Compilation (`tsc --noEmit`):** ✅ Clean (0 errors).
- **Vite Production Build (`npm run build`):** ✅ Clean (`dist/` generated).
- **Vercel Serverless Invocation:** ✅ Clean (`api/index.ts` operational with zero cold-start failures).
- **Git Branch:** `main` tracking `origin/main`.
