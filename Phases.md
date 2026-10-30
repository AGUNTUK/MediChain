# Project Development Phases & Roadmap — MediChain

This document outlines the phased lifecycle of MediChain, detailing completed functional milestones, architecture refactoring, and current execution stages.

---

## Completed Phases (Milestones 1 – 13)

### Phase 1: Foundation & Authentication Setup
- Core React 19 + TypeScript + Tailwind CSS structure.
- Multi-role user modeling (Pharmacy Owner, Depot Staff, Delivery Staff, Admin).
- Local session auth & Supabase Auth integration.

### Phase 2: Pharmacy Onboarding & KYC Compliance
- Pharmacy registration wizard collecting Trade License, Drug License, and physical location.
- KYC verification queue for Admin with document status transitions.

### Phase 3: B2B Medicine Catalog & Search Engine
- Full pharmaceutical catalog structuring (Generics, Dosages, Manufacturers, Categories).
- High-performance multi-token search with Bengali phonetic matching.
- Real-time pricing calculations, wholesale margins, and savings badges.

### Phase 4: Cart Engine & COD Checkout
- Wholesale Cart Drawer with animated fly-to-cart particle effects.
- 100% Cash on Delivery (COD) order checkout.
- Automated 6-digit handover OTP generation upon order dispatch.

### Phase 5: Smart Order via Prescription (Gemini OCR)
- Prescription image upload interface (Drag & Drop + Mobile Camera).
- Google Gemini Vision AI OCR parsing handwritten prescriptions into matched cart items.

### Phase 6: WMS Depot Warehouse Management
- Order Center with sequential rack/shelf walking path optimization.
- Barcode scanning verification during pick-and-pack.
- 80mm thermal receipt printer preview and `.txt` packing slip download.

### Phase 7: Delivery Staff (Rider) Companion Portal
- Real-time active deliveries stream with direct owner phone dialing.
- 6-digit OTP verification modal for secure parcel handover.
- Delivery failure reporting with reason codes.
- Complete historical tracking and past delivery cards.

### Phase 8: Operations Telegram & Web Push Notifications
- Telegram Bot alerts for instant order dispatch notifications to depot ops.
- Web Push Notification subscription manager (VAPID) for mobile notifications.

### Phase 9: Admin Suite & Bulk Deals Engine
- Revenue, order volume, and top generics Recharts dashboards.
- Volume-based tiered bulk discount builder.
- Dynamic homepage hero carousel banner manager.

### Phase 10: Performance, Caching & Universal Bengali Typography
- Integration of custom font `@font-face` `Li Alinur Banglaborno` for pristine Bengali typography.
- In-memory LRU cache (`apiCache.ts`) for sub-100ms catalog read times.
- Full PWA Service Worker caching (`sw.js`).

### Phase 11: Production Vercel Migration & Serverless API Optimization
- Migration from Render to Vercel Serverless Functions (`api/index.ts`) and Vercel Edge.
- Single-bundle serverless function configuration with explicit extension resolution, eliminating `FUNCTION_INVOCATION_FAILED`.
- Seamless URL rewrites in `vercel.json` routing `/api/*` to the serverless Express backend.

### Phase 12: Pharma Khata Hub & Shortage Book Sync Engine
- Built comprehensive retail accounts manager:
  - **Customer Khata** (বাকির খাতা) for managing customer debt and payment reminders.
  - **Supplier Khata** (পাওনাদার খাতা) for tracking company representatives and payables.
  - **Smart Shortage Book** (ঘাটতি বই) for auto-recording stockouts and 1-tap cart additions.
  - **Cashbook & Accounts Ledger** for daily cash inflow/outflow reconciliation.
- Dual-layer optimistic cache (`usePharmaKhata.ts`): instant 0ms localStorage read + remote Supabase synchronization (`/api/khata/bundle`, `/api/khata/short-book`).
- Cross-component event bus (`khataUpdated`) eliminating stale-closure state divergence between storefront and Khata hub.

### Phase 13: Non-Recursive RLS Hardening & Special Role Onboarding Exemption
- Eliminated PostgreSQL error `42P17 infinite recursion detected in policy for relation "users"` by migrating to direct `(SELECT auth.uid())` non-recursive RLS policies.
- Hardened `/api/auth/sync-session` using `supabaseAdmin` service-role credentials.
- Exempted special roles (`Admin`, `Depot Staff`, `Delivery Staff`) from the Pharmacy Onboarding Wizard, routing them directly to their dedicated cockpits.
- Guaranteed existing verified pharmacy owners bypass setup prompts and proceed straight to the store.

---

## Current Active Phases & Future Roadmap

| Phase | Title | Focus & Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 14** | **Rider Offline Sync** | Background IndexedDB queue for delivery status updates in zero-connectivity areas. | ⏳ Planned |
| **Phase 15** | **Automated Batch Barcode Generation** | Automated EAN-128 / Code 128 barcode generator for depot warehouse labels. | ⏳ Planned |
| **Phase 16** | **Two-Way Telegram Bot Operations** | Interactive Telegram commands (`/status [OrderID]`, `/inventory [Generic]`). | ⏳ Planned |
| **Phase 17** | **Predictive Restock Insights** | AI-driven reorder suggestions based on retail pharmacy purchasing velocity. | ⏳ Planned |
