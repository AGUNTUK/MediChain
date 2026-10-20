# Product Requirements Document (PRD) — MediChain

**Project Name:** MediChain  
**Platform Version:** 1.0.0 (B2B Pharmaceutical Operating System)  
**Primary Target Market:** Retail Pharmacies, Hospitals, Wholesale Depots, Pharmaceutical Distributors (Bangladesh / South Asia)  
**Document Status:** Approved & Maintained  

---

## 1. Executive Summary & Vision

MediChain is a high-performance, real-time B2B pharmaceutical procurement operating system. It streamlines and digitizes medicine sourcing for retail pharmacies, ensuring authentic supply chains, transparent wholesale pricing, guaranteed manufacturer batches, FEFO (First-Expired, First-Out) warehouse inventory, and automated delivery tracking.

### Core Value Proposition
- **Direct Wholesale Sourcing:** Retail pharmacies order genuine medicines directly at competitive trade prices.
- **Cash on Delivery (COD) Exclusivity:** Secure, verified handovers with OTP verification at delivery.
- **Smart Order by Prescription / List (OCR):** Gemini AI-assisted handwriting and invoice digitization.
- **Depot Warehouse Management (WMS):** Batch picking, rack locations, thermal label printing (80mm), and real-time status updates.
- **Rider Companion Application:** Real-time route delivery, OTP-verified handover, and live status reporting.

---

## 2. Target User Personas & Roles

| Role | Target User | Key Responsibilities & Capabilities |
| :--- | :--- | :--- |
| **Pharmacy Owner** | Retail Chemist / Drug Store Manager | Registers pharmacy, uploads Drug License / Trade License, browses catalog, builds bulk carts, places orders via COD, tracks deliveries, downloads VAT invoices, requests out-of-stock items. |
| **Depot Staff** | Warehouse Picker & Pack Manager | Receives confirmed orders, picks products by rack/shelf sequence, verifies barcodes, packs batches, assigns delivery riders, prints thermal packing slips (80mm). |
| **Delivery Staff (Rider)** | Courier / Fleet Driver | Views assigned orders, navigates delivery addresses, calls pharmacy owners, performs OTP-verified handover, collects COD payment. |
| **Administrator** | MediChain Ops / Compliance Lead | Approves pharmacy KYC verification, manages product catalogs and pricing, monitors revenue analytics, broadcasts alerts, manages bulk discount deals and banner carousels. |

---

## 3. Key Feature Specifications

### 3.1 Authentication & KYC Onboarding
- **Multi-Role Authentication:** Supabase Auth with fallback local session tokens, encrypted with bcryptjs and signed JWT tokens.
- **Pharmacy Registration Wizard:** Step-by-step onboarding collecting Pharmacy Name, Trade License Number, Drug License Number, Owner Contact, and Physical Geo-Address.
- **KYC Verification Hub:** Pending screen state for unverified accounts; Admin approval queue with document viewing.

### 3.2 Product Catalog & Search Experience
- **Categorized Directory:** Tablets, Syrups, Injections, Ointments, Eye/Ear Drops, Surgical & Medical Devices, Herbal/Ayurvedic.
- **High-Contrast Bengali & English Search:** Multi-token search matching Brand Name, Generic Molecule, Dosage Strength, Manufacturer, and Therapeutic Category.
- **Real-Time Stock & Pricing:** Live MRP vs Trade Price comparison, percentage savings badges (`% সাশ্রয়`), manufacturer batch information, and out-of-stock notification triggers.
- **3D Medicine Inspection:** Three.js / CSS 3D interactive viewer for packaging inspection.

### 3.3 Ordering & Cash on Delivery (COD) Checkout
- **Wholesale Cart & Minimum Quantities:** Automatic calculations of total MRP, wholesale savings, and net payable.
- **Strict 100% COD Exclusivity:** Transparent Cash on Delivery with no credit card or online payment gateway friction.
- **6-Digit Handover OTP Security:** Cryptographically generated one-time code sent to pharmacy upon dispatch for delivery verification.
- **Smart Order (AI OCR):** Instant prescription upload digitized via Gemini Vision API into auto-matched cart items.
- **Physicians Product Direct Request:** Dedicated bottom-sheet workflow (accessible via central FAB) enabling multi-file uploads directly to the Telegram operations channel for special/bulk manual orders.

### 3.4 Depot Warehouse Operations (WMS)
- **Order Center:** Filterable pipeline (Pending, Processing, Packed, Out for Delivery, Delivered, Cancelled).
- **Optimized Walking Path:** Orders automatically sorted by warehouse Rack/Shelf coordinates.
- **Thermal Label Preview & Print:** 80mm roll formatted slips, download to `.txt`, and printable layout.
- **Barcode Verification:** Scanner interface to prevent wrong-batch or wrong-medicine dispatch.

### 3.5 Delivery & Rider Portal
- **Active Deliveries Queue:** Real-time push updates for newly assigned parcels.
- **One-Click Owner Communication:** Direct phone dialing and GPS address navigation.
- **OTP Handover Verification:** Delivery completed only when rider inputs the pharmacy owner's 6-digit OTP.
- **Failure Reporting:** Structured failure logging with reason codes (e.g., Shop Closed, Payment Discrepancy).

### 3.6 Admin Management Suite
- **Analytics & Charts:** Recharts visualization of Gross Revenue, Daily Orders, Top Selling Generics, and Margin Distribution.
- **Product Management:** Add, edit, bulk import via Excel/CSV, price update, and stock adjustment.
- **Bulk Deals & Banners:** Tiered volume discount manager and dynamic AI-powered homepage carousel builder.
- **Telegram & Push Notifications:** Live instant alerts to operations Telegram channels and Web Push alerts to pharmacy mobiles.

---

## 4. Non-Functional Requirements

- **Performance:** Sub-100ms API response time with local LRU memory caching.
- **Mobile First / PWA:** 100% responsive viewport with installable Progressive Web App support and offline fallback.
- **Typography:** Universal Bengali typography powered by `@font-face` Li Alinur Banglaborno + Inter/Geist.
- **Security:** RLS (Row Level Security), Rate limiting, sanitized input validation, secure HTTP-only cookies, IDOR protection.
- **Reliability:** Zero-data-loss SQLite/PostgreSQL schema with atomic transaction rollbacks for order creation.
