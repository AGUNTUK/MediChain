# 🛡️ MediChain — Premium B2B Pharma Procurement OS

MediChain is a high-performance, secure, enterprise-grade B2B pharmaceutical procurement operating system designed to streamline bulk wholesale drug ordering, batch tracking, warehouse fulfillment, and retail pharmacy financial ledgers.

This repository contains the complete full-stack codebase of MediChain, fully audited, secured, and **Supabase-Ready** for production deployment on **Vercel** (`https://medichainbd.vercel.app`).

---

## 📖 Project Overview

Local pharmacies frequently suffer from highly fragmented supply chains, forcing them to coordinate with 20 to 30 separate pharmaceutical manufacturing depots daily to maintain critical drug stock. MediChain solves this fragmentation by acting as a single, centralized procurement aggregator, integrating dynamic multi-token searching, real-time FEFO inventory validation, digital retail ledger management (Pharma Khata), and intelligent optical prescription scanning into a unified, high-speed interface.

---

## 💼 Business Model

MediChain operates on a modern, high-volume **B2B Aggregation & Fulfillment Model**:

$$\text{Pharma Manufacturers (Square, Beximco, Incepta, Renata)} \longrightarrow \text{MediChain Central Depot} \longrightarrow \text{Licensed Retail Pharmacies}$$

### Core Value Drivers:
1. **Unified SKU Aggregation**: Retail pharmacies see MediChain as their single point of purchase and logistics delivery, eliminating the administrative overhead of coordinating separate invoices, payments, and delivery drivers for each pharma manufacturer.
2. **Bulk Wholesale Savings**: By leveraging aggregate wholesale ordering volumes, MediChain secures bulk tier discounts directly from manufacturers and passes substantial savings (typically 10% to 25% off MRP) down to retail pharmacies, increasing their retail profit margins.
3. **Strict 100% Cash on Delivery (COD)**: Transparent procurement with zero credit card or digital payment gateway friction. All orders are settled at the pharmacy door upon verified delivery.
4. **Optimized FEFO Logistics**: MediChain utilizes a strict **FEFO (First Expiry First Out)** warehousing workflow, routing orders to batches with the earliest expiry dates to maximize retail shelf life and prevent wastage.

---

## ✨ Features & Capabilities

- **⚡ Instant Procurement Engine**: Full-text searching across brand names, generic formulas, and manufacturing companies with advanced phonetic typo tolerance and instant autocomplete suggestions.
- **📦 Smart Quantity Controls**: Interactive bulk quantity selection presets (10, 50, 100, 200 boxes) with live subtotal calculation, available stock boundary validation, and real-time inventory updates.
- **🔄 Past Invoice 1-Tap Reorders**: Instant history retrieval allowing busy pharmacy owners to duplicate past order lines into their active cart in a single tap, bypassing standard browsing steps.
- **🧾 Intelligent Optical Prescription Scanning**: Powered by **Google Gemini AI** (server-side via official `@google/genai` SDK), allowing pharmacies to upload patient prescription sheets and automatically map handwritten formulas to real, purchasable wholesale inventory SKUs with confidence matching.
- **📱 Physicians Product Quick-Request**: A seamless Telegram-integrated upload flow accessible via a specialized floating action button (FAB), enabling pharmacists to instantly submit bulk product inquiries and physician prescription sheets directly to the administrative Telegram channel.
- **📒 Retail Pharma Khata Hub (Smart Ledger)**: Built-in retail accounts manager featuring **Customer Khata** (বাকির খাতা with due balances & SMS reminders), **Supplier Khata** (পাওনাদার খাতা with purchase tracking), **Smart Shortage Book** (ঘাটতি বই auto-recording low/zero stock with 1-tap cart restocking), and **Daily Cashbook** ledger.
- **🔒 6-Digit Handover OTP Verification**: Delivery security ensured through cryptographically generated one-time passcodes issued upon parcel dispatch and verified on the rider's device at handover.
- **🚚 Built-In Multi-Role Cockpits**: Dedicated, purpose-built dashboards within the same application for **Pharmacy Owners** (storefront, cart, invoices, Khata ledger), **Depot Staff** (order picking by rack/shelf, barcode verification, 80mm thermal slips), **Delivery Couriers** (assigned parcels, direct phone dialing, OTP verification), and **Administrators** (compliance, catalog import, bulk deal tiers, financial analytics).

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion / Framer Motion (`motion/react`), Lucide React iconography.
- **Backend / API**: Node.js & Express.js, running natively on **Vercel Serverless Functions** (`/api/*` via `api/index.ts`) in production with local development on `server.ts`.
- **Database & Storage**: PostgreSQL via Supabase with active Row Level Security (RLS) policies, automated triggers, and Supabase Storage for prescription files.
- **AI Core**: Google Gemini 2.5 Flash / Vision (accessed via server-side `@google/genai` SDK).
- **Typography & Localization**: Bilingual English & Bengali UI powered by custom `@font-face` `Li Alinur Banglaborno` typography.
- **Real-Time & Alerts**: Telegram Bot operations alert integration and Web Push API notifications.
- **Document Generation**: PDFKit (official VAT invoices) and custom monospace formatter for 80mm thermal warehouse pick slips.

---

## ⚙️ Environment Configuration

To configure MediChain for local development or deployment, copy `.env.example` to `.env` in the root directory and populate your credentials:

```env
# Server Ingress Settings
PORT=3000
NODE_ENV=production

# Server-Side Google Gemini AI Key (Never exposed to browser/client-side)
GEMINI_API_KEY="your_google_gemini_api_key_here"

# Public Client-Side Supabase Keys (Exposed to Vite bundle)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your_public_client_anon_key_here"

# Secure Backend Supabase Service Role Key (Exposed only to backend Node runtime)
SUPABASE_SERVICE_ROLE_KEY="your_backend_supabase_service_role_key_here"

# Self-referential URL of the hosting environment
APP_URL="https://medichainbd.vercel.app"

# Operations Alerts (Optional)
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_CHAT_ID="your_telegram_chat_id"
```

---

## 📦 Installation & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** package manager

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Start Local Development Server
```bash
npm run dev
```
The server will start on **`http://localhost:3000`** and load development catalog and ledger data.

### 4. Build for Production
To build the React Single Page App assets and compile the Express backend for production deployment:
```bash
npm run build
```

### 5. Start Production Server (Local / Container)
```bash
npm run start
```

---

## 🚀 Supabase Database Provisioning

The complete relational schema mapping is located in [**`supabase-schema.sql`**](./supabase-schema.sql) at the root level, alongside migration files in `supabase/migrations/`:

1. **Create Supabase Project**: Login to [Supabase](https://supabase.com) and create a new PostgreSQL database project.
2. **Execute Schema SQL**: Go to the **SQL Editor** tab in the Supabase Dashboard, create a new query, paste the contents of `supabase-schema.sql`, and click **Run**. This will build:
   - Relational tables: `users`, `pharmacies`, `products`, `inventory`, `orders`, `order_items`, `khata_parties`, `khata_transactions`, `khata_short_book`, `bulk_deal_tiers`, `hero_banners`, `audit_logs`.
   - Comprehensive query performance indexes (`idx_inventory_expiry`, `idx_products_name_generic`, `idx_khata_short_book_pharmacy`).
   - Automated timestamp triggers to keep table rows synchronized.
   - Non-recursive Row Level Security (RLS) policies isolating user profiles, orders, and retail khata ledgers.
3. **Retrieve Keys**: Navigate to **Project Settings > API** in Supabase and copy your `Project URL`, `anon public key`, and `service_role secret key`.
4. **Apply Env Variables**: Input these keys into your Vercel Project Settings or local `.env` file.

---

## 🏛️ Built-In Role Architecture & Cockpits

MediChain provides specialized role cockpits accessible directly within the application, secured by backend Role-Based Access Control (RBAC):

1. **Pharmacy Owner Cockpit (`Home.tsx`, `PharmaKhataHub.tsx`)**:
   - Live wholesale medicine catalog browsing with categorized filters and search.
   - Wholesale cart with bulk tiered discounts and 100% Cash on Delivery checkout.
   - Smart Order AI OCR prescription scanner (`SmartOrderModal.tsx`).
   - Complete Pharma Khata Hub: Customer credit ledger (বাকির খাতা), Supplier ledger (পাওনাদার খাতা), Shortage Book (ঘাটতি বই) with 1-tap cart addition, and Daily Cashbook.
   - Real-time order timeline tracking with 6-digit handover OTP.

2. **Depot Warehouse Management (`DepotDashboard.tsx`)**:
   - Order Center with sequential walking path optimization based on warehouse Rack/Shelf coordinates.
   - Barcode picking verification scanner (`BarcodePickScanner.tsx`).
   - 80mm thermal receipt printer preview and `.txt` packing slip generation.
   - Inventory batch management, FEFO stock audits, and rider dispatch assignment.

3. **Delivery Courier Portal (`DeliveryDashboard.tsx`)**:
   - Active assigned deliveries queue with direct phone dialing and GPS address details.
   - Secure handover modal requiring the customer's 6-digit OTP to finalize deliveries.
   - Delivery failure reporting with structured reason codes.
   - Delivery history and earnings ledger.

4. **Administration & Compliance Panel (`AdminPanel.tsx`)**:
   - Pharmacy KYC onboarding verification and document inspection.
   - Medicine catalog management with bulk Excel/CSV import and price update engine.
   - Bulk volume deal tier manager and homepage hero banner manager.
   - Operations Telegram alerts broadcast and financial analytics (gross sales, margin, top generics).

---

## 🛡️ Production Security & Quality Assurances

1. **No Client-Side Secrets**: All communication with external services (Gemini AI, Telegram Bot, Supabase Service Role) is securely proxied through backend routes.
2. **Server-Side Session Synchronization**: Authentication sessions are verified through `/api/auth/sync-session` using service-role credentials to eliminate client-side RLS infinite recursion (Postgres error 42P17).
3. **100% Cash on Delivery Safety**: All payment amounts and wholesale margin discounts are computed server-side, preventing client-side cart tampering.
4. **Rigorous Quality Standards**: The entire application compiles cleanly under strict TypeScript (`tsc --noEmit`) and Vite production bundling with zero errors.
