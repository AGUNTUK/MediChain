# Product Requirements Document (PRD) — MediChain

**Project Name:** MediChain  
**Platform Version:** 1.0.0 (B2B Pharmaceutical Operating System & Retail Pharmacy Management)  
**Primary Target Market:** Retail Pharmacies, Hospitals, Wholesale Depots, Pharmaceutical Distributors (Bangladesh / South Asia)  
**Deployment Platform:** Vercel Serverless Functions (`https://medichainbd.vercel.app`) with Supabase PostgreSQL  
**Document Status:** Approved & Maintained  

---

## 1. Executive Summary & Vision

MediChain is a high-performance, real-time B2B pharmaceutical procurement and retail management operating system. It streamlines and digitizes medicine sourcing for retail pharmacies, ensuring authentic supply chains, transparent wholesale pricing, guaranteed manufacturer batches, FEFO (First-Expired, First-Out) warehouse inventory, automated delivery tracking, and digital retail ledger management (Pharma Khata).

### Core Value Proposition
- **Direct Wholesale Sourcing:** Retail pharmacies order genuine medicines directly at competitive trade prices.
- **Cash on Delivery (COD) Exclusivity:** Secure, verified handovers with OTP verification at delivery.
- **Smart Order by Prescription / List (OCR):** Gemini AI-assisted handwriting and invoice digitization.
- **Pharma Khata Hub (Smart Retail Ledger):** Digital Customer Credit Ledger (বাকির খাতা), Supplier Ledger (পাওনাদার খাতা), Smart Shortage Book (ঘাটতি বই), and Daily Cashbook.
- **Depot Warehouse Management (WMS):** Batch picking, rack locations, thermal label printing (80mm), and real-time status updates.
- **Rider Companion Application:** Real-time route delivery, OTP-verified handover, and live status reporting.

---

## 2. Target User Personas & Roles

| Role | Target User | Key Responsibilities & Capabilities |
| :--- | :--- | :--- |
| **Pharmacy Owner** | Retail Chemist / Drug Store Manager | Registers pharmacy, uploads Drug License / Trade License, browses wholesale catalog, builds bulk carts, places orders via COD, manages Customer and Supplier Khata ledgers, tracks shortages in Short Book, tracks deliveries, downloads VAT invoices. |
| **Depot Staff** | Warehouse Picker & Pack Manager | Receives confirmed orders, picks products by rack/shelf sequence, verifies barcodes, packs batches, assigns delivery riders, prints thermal packing slips (80mm). |
| **Delivery Staff (Rider)** | Courier / Fleet Driver | Views assigned orders, navigates delivery addresses, calls pharmacy owners, performs OTP-verified handover, collects COD payment. |
| **Administrator** | MediChain Ops / Compliance Lead | Approves pharmacy KYC verification, manages product catalogs and pricing, monitors revenue analytics, broadcasts alerts, manages bulk discount deals and banner carousels. |

---

## 3. Key Feature Specifications

### 3.1 Authentication & KYC Onboarding
- **Multi-Role Authentication:** Supabase Auth with server-side session synchronization (`/api/auth/sync-session`) powered by `supabaseAdmin` service role credentials, eliminating PostgreSQL RLS recursion (42P17).
- **Pharmacy Registration Wizard:** Onboarding collecting Pharmacy Name, Trade License Number, Drug License Number, Owner Contact, and Physical Geo-Address.
- **Exempt Special Roles:** Admins, Depot Staff, and Delivery Staff bypass the pharmacy onboarding wizard and route directly to their operational cockpits.
- **Verified Profile Direct Bypass:** Existing verified pharmacy owners bypass setup prompts and proceed straight to the store.

### 3.2 Product Catalog & Search Experience
- **Categorized Directory:** Tablets, Capsules, Syrups, Injections, Ointments, Eye/Ear Drops, Surgical & Medical Devices, Herbal/Ayurvedic.
- **High-Contrast Bengali & English Search:** Multi-token search matching Brand Name, Generic Molecule, Dosage Strength, Manufacturer, and Therapeutic Category.
- **Real-Time Stock & Pricing:** Live MRP vs Trade Price comparison, percentage savings badges (`% সাশ্রয়`), manufacturer batch information, and out-of-stock notification triggers.

### 3.3 Ordering & Cash on Delivery (COD) Checkout
- **Wholesale Cart & Minimum Quantities:** Automatic calculations of total MRP, wholesale savings, and net payable.
- **Strict 100% COD Exclusivity:** Transparent Cash on Delivery with zero credit card friction.
- **6-Digit Handover OTP Security:** Cryptographically generated one-time code sent to pharmacy upon dispatch for delivery verification.
- **Smart Order (AI OCR):** Instant prescription upload digitized via Gemini Vision API into auto-matched cart items.
- **Physicians Product Direct Request:** Dedicated bottom-sheet workflow enabling multi-file uploads directly to the Telegram operations channel for special/bulk manual orders.

### 3.4 Retail Pharma Khata Hub & Ledger Management
- **Customer Khata (বাকির খাতা):**
  - Customer registry with phone numbers, credit limits, and outstanding balances.
  - Due recording, cash repayments, and 1-tap Bengali payment reminder SMS generation.
- **Supplier Khata (পাওনাদার খাতা):**
  - Record wholesale pharmaceutical representatives and suppliers.
  - Track invoice totals, paid amounts, and due settlements.
- **Smart Shortage Book (ঘাটতি বই):**
  - Instant logging of depleted or requested medicines.
  - 1-tap conversion of shortage items into wholesale shopping cart lines.
  - Dual-layer optimistic persistence: instant 0ms localStorage read + Supabase `khata_short_book` remote sync with cross-component event bus (`khataUpdated`).
- **Daily Cashbook & Ledger:**
  - Track daily cash inflows, customer collections, business expenses, and net profit margins.
  - Timezone safety using Asia/Dhaka (UTC+6:00).

### 3.5 Depot Warehouse Operations (WMS)
- **Order Center:** Filterable pipeline (Pending, Processing, Packed, Out for Delivery, Delivered, Cancelled).
- **Optimized Walking Path:** Orders automatically sorted by warehouse Rack/Shelf coordinates.
- **Thermal Label Preview & Print:** 80mm roll formatted slips, download to `.txt`, and printable layout.
- **Barcode Verification:** Scanner interface to prevent wrong-batch or wrong-medicine dispatch.

### 3.6 Delivery & Rider Portal
- **Active Deliveries Queue:** Real-time push updates for newly assigned parcels.
- **One-Click Owner Communication:** Direct phone dialing and GPS address navigation.
- **OTP Handover Verification:** Delivery completed only when rider inputs the pharmacy owner's 6-digit OTP.
- **Failure Reporting:** Structured failure logging with reason codes (e.g., Shop Closed, Payment Discrepancy).

### 3.7 Admin Management Suite
- **Analytics & Charts:** Recharts visualization of Gross Revenue, Daily Orders, Top Selling Generics, and Margin Distribution.
- **Product Management:** Add, edit, bulk import via Excel/CSV, price update, and stock adjustment.
- **Bulk Deals & Banners:** Tiered volume discount manager and dynamic homepage carousel banner builder.
- **Telegram & Push Notifications:** Live instant alerts to operations Telegram channels and Web Push alerts to pharmacy mobiles.

---

## 4. Non-Functional Requirements

- **Performance:** Sub-100ms API response time with local LRU memory caching.
- **Mobile First / PWA:** 100% responsive viewport with installable Progressive Web App support and offline fallback.
- **Typography:** Universal Bengali typography powered by `@font-face` Li Alinur Banglaborno + Inter/Geist.
- **Security:** RLS (Row Level Security), Rate limiting, sanitized input validation, secure HTTP-only cookies, IDOR protection.
- **Hosting & Infrastructure:** Vercel Serverless Functions (`api/index.ts`) and Vercel Edge for zero server maintenance and high global availability.
