# Permanent Context & Working Memory — MediChain

**Last Updated:** 2026-09-06  
**Active Project State:** High-Stability Live Production Mode  
**Architecture:** React 19 SPA + Express Monolith (Port 3000) + PostgreSQL (Supabase)  
**Payment Model:** 100% Cash on Delivery (COD) Exclusive  

---

## 1. Core Operating Context

1. **Active Roles & Access Control:**
   - `Pharmacy Owner`: Catalog browsing, wholesale cart, COD checkout, order tracking with 6-digit OTP, invoice viewer.
   - `Depot Staff`: Order picking center (sorted by rack/shelf), 80mm thermal receipt printer preview, barcode validation.
   - `Delivery Staff (Rider)`: Real-time parcel queue, one-click caller, OTP verification modal, failure reporting, history.
   - `Admin`: User management, pharmacy KYC approvals, pricing updates, bulk deal tiers, hero banners, analytics.

2. **Critical Architectural Decisions:**
   - **No Payment Gateways:** All digital payment gateways (bKash/Nagad/SSLCommerz) and credit card flows have been permanently removed. COD is the only active payment method.
   - **No Autonomous Web Scraping:** AI background crawling engines have been disabled to preserve server egress and DB stability.
   - **Universal Bengali Typography:** Custom `@font-face` `Li Alinur Banglaborno` is configured globally in `src/index.css`.
   - **State-Based SPA Navigation:** Main view state is governed by `appStep` & `activeTab` in `src/App.tsx`. Do NOT introduce `react-router-dom`.
   - **Authenticated API Client:** Always use `apiFetch()` (`/src/lib/apiFetch.ts`) to make backend requests.

---

## 2. Key Server Endpoints (`server.ts`)

| Route | Method | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/auth/me` | GET | All | Current session & user role verification |
| `/api/products` | GET | Public | Products catalog with in-memory caching |
| `/api/products/search` | GET | Public | Multi-token search with Bengali phonetic matching |
| `/api/orders` | GET/POST | Pharmacy/Admin | Fetch pharmacy orders or place new COD order |
| `/api/orders/:id/track` | GET | Pharmacy/Rider | Real-time delivery timeline & 6-digit OTP |
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
- **Git Branch:** `main` tracking `origin/main`.
