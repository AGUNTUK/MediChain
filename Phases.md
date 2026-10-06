# Project Development Phases & Roadmap — MediChain

This document outlines the phased lifecycle of MediChain, detailing completed functional milestones, architecture refactoring, and current execution stages.

---

## Completed Phases (Milestones 1 – 15)

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

---

## Current Active Phases & Future Roadmap

| Phase | Title | Focus & Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 16** | **Rider Offline Sync** | Background indexedDB sync for delivery status updates in zero-connectivity areas. | ⏳ Planned |
| **Phase 17** | **Advanced Batch Barcode Generation** | Automated EAN-128 / Code 128 barcode image generator for batch labels. | ⏳ Planned |
| **Phase 18** | **Automated Telegram Bot Commands** | Two-way Telegram bot commands (`/status [OrderID]`, `/inventory [Generic]`). | ⏳ Planned |
| **Phase 19** | **Predictive Restock Insights** | AI-driven reorder suggestions based on pharmacy purchasing patterns. | ⏳ Planned |
