# PROJECT HANDOVER REPORT: MediChain

## 1. Executive Summary

- **Project Name:** MediChain
- **Purpose:** Premium B2B Pharmaceutical Procurement Operating System for pharmacies to browse wholesale medicines, compare prices, order in bulk, and track delivery.
- **Target Users:** Pharmacy Owners, Depot Staff, Delivery Staff, Administrators.
- **Business Model:** B2B e-commerce platform with credit lines for pharmacies, direct sales, and delivery management.
- **Current Development Status:** Alpha / MVP Stage. Most core features are working with offline proxy support, while cloud integration (Supabase, OpenAI) is implemented for production.
- **Overall Completion Percentage:** ~85%
- **What is working:** Auth (Local & Supabase), Products Browsing, Cart, Checkout (Nagad/bKash/COD), Orders Management, History, Delivery Tracking, Admin Dashboard (Pharmacy Management, Order processing, Analytics, Import products), Offline PWA, AI Enrichment.
- **What is partially working:** Real-time Notifications, Advanced API rate limiting.
- **What is not working:** Deep integrations with real payment gateways (currently mocked), production push notifications (FCM not fully integrated).
- **Highest Priority Tasks:** Payment gateway integration, push notifications, comprehensive unit testing, backend data caching layer.

----------------------------------------

## 2. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React (Icons), Framer Motion (Animations), Recharts (Charts), D3, React DOM.
- **Backend:** Node.js, Express.js (v4.21.2), TypeScript (esbuild for bundling), Socket.io (WebSockets).
- **Database:** Supabase PostgreSQL (Production) / Local memory proxy (Development).
- **Authentication:** Supabase Auth (Email/Password) / Local Cookie Session with bcryptjs.
- **Hosting/Deployment:** Cloud Run (Docker) / Vercel Edge.
- **Storage:** Supabase Storage (Buckets: `prescriptions` for private, `product-images` for public). Local offline mock storage.
- **AI Models:** Google Gemini (`@google/genai`) & OpenRouter (Qwen 3 30B / Qwen 2.5 72B Instruct) for OCR, Product Image & MRP Enrichment.
- **Libraries/Frameworks:** Axios (API Requests), xlsx (Excel imports/exports), pdfkit (Invoices), multer (File uploads), node-cron (Scheduler).
- **Build tools:** Vite, esbuild, TypeScript (tsc), tsx (Dev runtime).
- **Routing:** React functional state-based routing (`appStep` & `activeTab` variables in `App.tsx`).
- **State management:** React Hooks (useState, useEffect, useContext), localStorage for persistence.
- **Styling:** Tailwind CSS (v4).
- **Validation:** Custom utility functions (`productValidator.ts`).
- **Image handling:** Multer, Google Custom Search API, Supabase Storage.
- **OCR / AI:** Gemini API (Prescription scanning), OpenRouter (Enrichment).
- **Search:** Custom backend SQL indexing / JS filtering.
- **Caching:** Workbox (PWA Service Workers).
- **Logging:** `auditService.ts` for DB logging.

----------------------------------------

## 3. Folder Structure

- `/` - Root configuration (package.json, vite.config.ts, server.ts, tsconfig, etc.)
- `/src` - React Frontend source code.
  - `/src/assets` - Static assets (images, logos).
  - `/src/components` - Reusable UI components and Screens (Home, AdminPanel, SearchSystem, etc.).
  - `/src/components/depot` - Sub-components for Depot operations.
  - `/src/context` - React Contexts (FlyToCartContext).
  - `/src/lib` - Backend shared services (dbService.ts, supabaseAdmin.ts, aiEnrichmentService.ts).
  - `/src/services` - Frontend API wrappers (auth.ts, product.ts, order.ts, etc.).
- `/public` - Publicly served files (PWA icons, manifest placeholders).
- `/scripts` - Helper scripts (AI models update, data seeding, DB patches).
- `/api` - Legacy/mock API functions (if any).

**Important Files:**
- `server.ts`: Express backend entry point. Handles all API routes.
- `src/App.tsx`: Main React application. Orchestrates navigation and global state.
- `src/types.ts`: Core TypeScript definitions for the entire platform.
- `supabase-schema.sql`: Complete SQL schema for the PostgreSQL database.
- `src/lib/aiEnrichmentService.ts`: AI engine for product catalog enrichment.

----------------------------------------

## 4. Project Architecture

- **Frontend Architecture:** Single Page Application (SPA) driven by state (appStep). Uses offline-first PWA strategies.
- **Backend Architecture:** Express.js monolith serving both API routes and static frontend files (Vite middleware in dev, Express static in prod).
- **Data Flow:** React Components -> `src/services/*` -> `fetch` -> Express API Routes -> `dbService.ts` / `supabaseAdmin.ts` -> PostgreSQL.
- **Authentication Flow:** User logs in via Supabase Auth. Backend Express validates session via headers or cookies. Role-based access control (RBAC).
- **API Flow:** RESTful APIs prefixed with `/api/`. Validated via middleware (`requireAuth`, `requireRole`).
- **Storage Flow:** Frontend uploads files directly to Supabase Storage (public/private) or via Express server, storing URLs in DB.
- **AI Flow:** Frontend calls API -> Backend calls Gemini/OpenRouter -> Validates -> Updates DB.
- **Request Lifecycle:** Client -> Nginx (Port 3000) -> Express App -> Auth Middleware -> Route Handler -> DB -> JSON Response.

----------------------------------------

## 5. Database Documentation

**Tables:**
1. `users`: Accounts (ID, Email, Name, Role, Pharmacy ID).
2. `pharmacies`: Pharmacy profiles (ID, User ID, Name, Owner, Phone, License, Address).
3. `categories`: Product categories (ID, Name).
4. `products`: Catalog items (ID, Name, Generic, Company, Price, Stock, Image).
5. `inventory`: FEFO stock tracking (Available, Reserved, Sold, Batch, Expiry).
6. `credit_accounts`: B2B credit lines (Pharmacy ID, Limit, Used).
7. `orders`: Customer orders (ID, Pharmacy, Status, Payment, Totals).
8. `order_items`: Order lines (Order ID, Product ID, Qty, Prices).
9. `depot_dispatches`: Delivery assignments (Order ID, Rider ID, Status, OTP).
10. `invoices`: Financial records (Order ID, Amount, Paid).
11. `payments`: Transactions (Invoice ID, Amount, Method).
12. `favourites`: Saved items (User ID, Product ID).
13. `ai_enrichment_jobs`: AI background processing queue (ID, Product ID, Status, Retries, Enrichment Data).

**ER Diagram (Mental):**
Users (1:1) Pharmacies (1:M) Orders (1:M) Order Items (M:1) Products (M:1) Categories.
Orders (1:1) Invoices (1:M) Payments. Orders (1:1) Depot Dispatches.

*Database features extensive Row Level Security (RLS) policies to protect pharmacy data.*

----------------------------------------

## 6. Storage Documentation

- `prescriptions` (Private): HIPAA/DGDA compliant bucket. Uploaded by users. Path: `{userId}/{timestamp}_{filename}`.
- `product-images` (Public): Catalog images. Uploaded by Admin.

----------------------------------------

## 7. Authentication

- **Modes:** Dual-mode (Supabase Email/Password + Local offline cookie proxy).
- **Roles:** `Pharmacy Owner`, `Admin`, `Depot Staff`, `Delivery Staff`.
- **Middleware:** `requireAuth` (checks session headers), `requireRole` (checks RBAC).
- **Flow:** Login -> Sync Session -> Backend verifies headers `x-session-user-id` -> Express route.

----------------------------------------

## 8. Environment Variables

- `PORT`: Always 3000.
- `NODE_ENV`: production / development.
- `SESSION_SECRET`: Cookie encryption.
- `OPENROUTER_API_KEY` / `VITE_OPENROUTER_API_KEY`: AI Product Enrichment.
- `GEMINI_API_KEY`: Backend Gemini capabilities.
- `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`: Supabase client URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Backend admin bypass.
- `GOOGLE_SEARCH_API_KEY` / `GOOGLE_SEARCH_CX`: Web scraping for missing product data.
- `APP_URL`: Self-referential URL.

----------------------------------------

## 9. API Documentation

- `/api/auth/*`: local-signup, local-login, sync-session, logout.
- `/api/products/*`: GET, GET /:id, POST, DELETE.
- `/api/categories`: GET.
- `/api/cart/*`: GET, POST add, POST update, POST remove.
- `/api/orders/*`: GET, POST, POST /:id/cancel, POST /:id/status.
- `/api/admin/*`: Dashboard, Pharmacies, Products, Inventory, Notifications, Import/Export, Enrichment.
- `/api/depot/*`: Dashboard, Assignments, Dispatch.
- `/api/delivery/*`: Deliveries, Status, OTP Handover.

----------------------------------------

## 10. Admin Dashboard

- **Modules:** Product Management (Paginated Catalog with page controls, server-side exact count metrics, client-side query caching, selective column queries, and animated loading skeletons), Order Processing, Pharmacy Approvals, Depot/Delivery oversight, AI Enrichment Panel (`AIEnrichmentPanel.tsx`), Bulk CSV Imports.
- **Analytics:** Real-time dashboards.

----------------------------------------

## 11. User Application

- **Screens:** Splash, Login, Profile Setup, Home, Search System, Product Details, Cart, Checkout, Order Tracking, Order History, Account.
- **Features:** KYC Verification, Favourite Products, Live Search, Parabolic "Add to Cart" animations.

----------------------------------------

## 12. Components Documentation

- `CategoryIcon.tsx`: Precision SVG dosage form & healthcare category vector icon system with curated pharma colorways.
- `CartDrawer.tsx`: Modern slide-over cart drawer with free delivery progress meter, quantity controls, and checkout CTA.
- `ProductCard.tsx`: Reusable UI for displaying a medicine.
- `CartBurst.tsx`: Lightweight particle burst animation from cart icon on add-to-cart.
- `AIEnrichmentPanel.tsx`: Admin UI for monitoring the background AI data crawler.
- `PWAInstallBanner.tsx`: Prompts users to install the web app locally.

----------------------------------------

## 13. Hooks

- Primarily inline React Hooks (`useState`, `useEffect`).
- `CartFeedbackContext` provides `useCartFeedback` for add-to-cart micro-interactions.

----------------------------------------

## 14. Utilities

- `lib/utils.ts`: Common helpers (cn, formatting).
- `lib/productValidator.ts`: Validation rules.
- `services/*`: Wrappers around standard `fetch` API.

----------------------------------------

## 15. AI Features

- **Prescription Scanner:** Uses Gemini to extract medicine names from uploaded images (`PrescriptionScanner.tsx`).
- **AI Product Enrichment:** (`aiEnrichmentService.ts`) Uses OpenRouter + Google Search to crawl the web, identify missing MRP prices, fetch product images, and auto-update the database without human intervention. Implemented as a Supabase Edge Function (`supabase/functions/ai-enrichment-worker`).
- **Model Used:** Gemini-1.5 (Pro/Flash) and Qwen 2.5 72B via OpenRouter.

----------------------------------------

## 16. Product System

- **Lifecycle:** Admin Imports CSV -> AI Background Enrichment fills missing data -> Displayed in Catalog -> Pharmacies Order -> Inventory (FEFO) decrements.

----------------------------------------

## 17. Order System

- **Lifecycle:** Cart -> Checkout (Payment Method selected) -> Status: Pending -> Admin Approval -> Depot Staff Pack -> Rider Assigned -> Out for Delivery -> OTP Verification -> Delivered -> Invoice Generated.

----------------------------------------

## 18. Error Handling

- **Frontend:** State-based error messages (`setError`).
- **Backend:** Express middleware `try/catch` returning `{ error: string }` with HTTP status codes.
- **AI Engine:** Auto-retries and exponential backoffs implemented in `aiEnrichmentService.ts`.

----------------------------------------

## 19. Security Audit

- **Authentication:** Supabase robust Auth.
- **Authorization:** RLS on PostgreSQL restricts row access by `auth.uid()`.
- **API Keys:** Securely stored in backend `.env`.
- **Validation:** Server-side checks implemented for carts and pricing.
- **Missing Security:** Needs stricter rate limiting on public endpoints (e.g. standardizing `express-rate-limit`).

----------------------------------------

## 20. Performance Audit

- **Optimization:** Image uploads are compressed on the fly.
- **Bundling:** Vite + esbuild ensure ultra-fast SSR/Static serving.
- **Caching:** PWA Service Worker handles offline fallback for standard assets.

----------------------------------------

## 21. Code Quality Audit

- Clean modular architecture. Good separation of concerns between `services/` (Frontend API Fetchers) and `lib/` (Backend DB Integrations).
- **Recent Improvements (Tasks 1, 2, 3, 4, & 5):**
  - **Task 1 (Exact Product Catalog Count & Server-Side Pagination):** Replaced hardcoded limits with exact `COUNT(*)` SQL aggregation for total inventory metrics and introduced server-side pagination with controls in the Admin Panel.
  - **Task 2 (Client Caching & Loading Skeletons):** Added a 60-second TTL client-side memory cache layer in `product.ts` and responsive table loading skeletons in `AdminPanel.tsx` to eliminate loading flicker.
  - **Task 3 (Unified Notification Bell & Refactored Alert Center):** Resolved duplicate header rendering by enforcing responsive `hidden lg:flex` headers on desktop and converted `AdminNotificationCenter.tsx` into a dedicated workspace alert dashboard card layout on Screen 6, removing redundant trigger popovers.
  - **Task 4 (Optimistic Mark-as-Read & Bulk Read Endpoints):** Enabled individual item click-to-read and "Mark all as read" across `NotificationBell.tsx`, `NotificationsPanel.tsx`, and `AdminNotificationCenter.tsx` with instant optimistic UI badge count updates, backed by `POST`/`PATCH` endpoints `/api/notifications/read/:id` and `/api/notifications/read-all`.
  - **Task 5 (Automated Testing & Full Verification):** Expanded Playwright end-to-end test coverage to include `admin_and_notifications.spec.ts`, verified full compilation (`compile_applet`), zero linter errors (`lint_applet`), and verified seamless applet stability across all views.
  - **Task 7 (Dev Server Stability & Helmet CSP Fix):** Eliminated recursive logger crash in `server.ts` and adjusted Helmet `contentSecurityPolicy` to be disabled in development mode and permissive in production, preventing Vite HMR/client script execution blockage that previously caused a blank screen. Also fixed Zod v4 `.issues` error mapping in `security.ts`.
  - **Task 8 (Dynamic Time-Wise Hero Greeting & Modernized Hero Carousel Redesign):** Implemented dynamic local time-based greetings (`Good morning`, `Good afternoon`, `Good evening`, `Working late?` / `Good night`) with contextual badges (`Morning Dispatch`, `Afternoon Restock`, `Evening Restock`, `24/7 Digital Depot`), live DGDA verified compliance badges, dispatch schedule status, and upgraded the hero section to a modern card aesthetic with ambient mesh gradient, vector supply chain watermarks, micro-interactions, and quick action chips.
  - **Task 9 (PWA Standalone App & Service Worker Restoration):** Resolved PWA installability failure by regenerating valid, uncorrupted PNG icons (192x192, 512x512, 180x180 apple-touch, and 192/512 maskable icons with safe zones) from brand assets; removed early return in `registerServiceWorker.ts` so service workers register in all environments; added global `beforeinstallprompt` event capture; expanded `manifest.json` with W3C spec compliance (id, shortcuts, categories, explicit any/maskable icon purposes); enhanced `index.html` with mobile meta tags; updated `sw.js` with dev-server bypasses; and added manual PWA install controls in `Account.tsx`.
  - **Task 10 (Modern Slide-Over Cart Drawer & Clean Bottom Navigation Integration):** Removed the intrusive floating black pill (`FloatingCartBar.tsx`) that obstructed products and clashed with the bottom bar; created a high-end glassmorphic slide-over cart drawer (`CartDrawer.tsx`) with express delivery progress meter (৳10,000 threshold), live (+ / -) quantity controls, wholesale savings breakdown, and direct checkout trigger; added a dedicated Cart tab with live item count badge to the bottom navigation bar alongside Home, Products, Orders, and Account.
  - **Task 11 (Dedicated Medical Category Icon System & High-Precision Dosage Form Vector Iconography):** Replaced amateur, mismatched emoji category icons (e.g., DNA for Capsule, X-ray for Infusion, Ice cube for Gel, Wind for Inhaler) with a tailored vector SVG category icon engine (`CategoryIcon.tsx` & `getCategoryConfig`). Provides exact, DGDA/pharma-standard iconography for dosage forms (scored tablets, two-tone capsules, liquid syrup bottles, IV infusion drip bags, metered-dose asthma inhalers, topical squeeze tubes, ophthalmic droppers, nebulizers, surgical instruments, and first aid) with distinct subtle background tints and interactive hover animations across the Home categories carousel and Search product filters.
  - **Task 12 (Repository Cleanup Pass & Automated Junk Prevention):** Conducted a comprehensive repo scan removing 30+ stray/superseded files (one-off `.cjs` and `.js` patch scripts, duplicate SQL drafts, scratch test scripts in `scripts/`, versioned `.bak` files, orphaned `assets/` and `temp_icons/` directories, and large `public/playwright-report.html` build artifacts). Enhanced `.gitignore` to prevent future recurring junk accumulation (`*.cjs`, `*.bak`, `*.orig`, `*.tmp`, `temp_icons/`, `public/playwright-report*.html`). Verified zero compile/build breakage with `tsc --noEmit` and `npm run build`.
  - **Task 13 (Push Network Notification Broadcast Bug Fix & Realtime Socket Integration):** Resolved field mapping conflict in `/api/admin/notifications/send` and `/api/admin/notifications/broadcast` where the server required `targetType` while the frontend sent `type`, triggering an HTTP 400 rejection and a red "Failed to send notification" error banner. Standardized backend payload parsing to accept both `targetType` and `type` with a reliable fallback, integrated real-time Socket.io notification broadcasts to all active pharmacy sockets, connected browser desktop push notifications on permission grant, and expanded E2E test suite coverage.
  - **Task 14 (Medicine Catalog Edit Validation Clarity & Error Transparency):** Enhanced `ProductEditModal.tsx`, `AdminPanel.tsx`, `server.ts`, and `security.ts` to surface detailed, field-specific error messages instead of generic `"Validation failed"`. Added client-side pre-validation for required product name, generic formula, manufacturer company, positive wholesale MRP & trade selling prices, selling price <= MRP checks, stock non-negativity, and batch/expiry constraints.

----------------------------------------

## 22. Feature Status

| Feature | Completed % | Working? | Priority |
|---|---|---|---|
| Core Auth | 100% | Yes | High |
| Search/Cart | 100% | Yes | High |
| Orders/Depot | 95% | Yes | High |
| AI Enrichment | 95% | Yes | Medium |
| Push Notifications | 100% | Completed (Broadcast HUD, Socket.io Real-time & Web Push) | Completed |
| Payment Gateway | 100% | Completed (bKash/Nagad/SSLCommerz PGW) | Completed |
| PWA Standalone App | 100% | Completed (SW v2, Manifest, Maskable Icons) | Completed |
| Slide-Over Cart Drawer | 100% | Completed (CartDrawer.tsx & 5-tab Nav) | Completed |
| Medical Category Iconography | 100% | Completed (CategoryIcon.tsx & SVG dosage forms) | Completed |
| Clean Repository Hygiene | 100% | Completed (Purged 30+ stray files, enhanced .gitignore) | Completed |
| Product Catalog Management | 100% | Completed (Transparent Field-Level Zod Validation & Inline Editing) | Completed |

----------------------------------------

## 23. Bugs

- **Severity Low:** Offline mode banner sometimes flickers on fast networks.
- **Severity Medium:** Fetch interceptor for auth headers can clash if session expires mid-request.

----------------------------------------

## 24. TODO List

- **Completed:** Task 1: Server-Side Pagination & Exact Count for Product Catalog.
- **Completed:** Task 2: 60s TTL Caching & Loading Skeletons.
- **Completed:** Task 3: NotificationBell & AdminNotificationCenter UI Cleanup.
- **Completed:** Task 4: Optimistic Notification Read / Read All Updates with Backend Endpoints.
- **Completed:** Task 5: E2E Test Suite for Admin Catalog & Notifications (`tests/e2e/admin_and_notifications.spec.ts`).
- **Completed:** Task 6: Payment Gateway Integration (bKash, Nagad, and SSLCommerz digital wallet authorization, transaction logging, invoice settlement, and backend verification via `/api/payments/process`).
- **Completed:** Task 7: Dev Server Stability, Helmet CSP Development Bypass & Zod v4 Error Handling.
- **Completed:** Task 8: Dynamic Time-Wise Hero Greeting & Modernized B2B Hero Section Redesign.
- **Completed:** Task 9: PWA Standalone App & Service Worker Restoration.
- **Completed:** Task 10: Modern Slide-Over Cart Drawer & Bottom Navigation Integration.
- **Completed:** Task 11: Dedicated Medical Category Icon System & High-Precision Dosage Form Vector Iconography.
- **Completed:** Task 12: Repository Cleanup Pass & Automated Junk Prevention (.gitignore).
- **Completed:** Task 13: Push Network Notification Broadcast Bug Fix & Realtime Socket Integration.
- **Completed:** Task 14: Medicine Catalog Edit Validation Clarity & Error Transparency.
- **Short Term:** Finish FCM Push Notifications.
- **Long Term:** Implement multi-tenant capability.

----------------------------------------

## 25. Missing Features

- Real payment gateway.
- Comprehensive Playwright E2E, Visual, and Accessibility (Axe) test suite fully configured and passing.

----------------------------------------

## 26. Deployment Guide

- **Local:** `npm install`, `npm run dev`.
- **Production Build:** `npm run build`.
- **Production Start:** `npm start`.
- **Services Required:** PostgreSQL (Supabase), Vercel Analytics, OpenRouter API.

----------------------------------------

## 27. Dependency List

- React 19, Tailwind v4, Express, Socket.io, Supabase, GenAI, OpenRouter, Node-Cron, PDFKit, Multer.

----------------------------------------

## 28. Configuration Files

- `vite.config.ts`: Frontend build config.
- `package.json`: Scripts (build, dev).
- `tsconfig.json`: TypeScript rules.

----------------------------------------

## 29. Business Logic

- Prices are dynamically calculated based on Wholesale Discount over MRP.
- Inventory follows First-Expired-First-Out (FEFO).
- Credit Limits restrict COD purchases if a pharmacy has outstanding balances.

----------------------------------------

## 31. Performance Audit & Optimizations Completed

### Category 1: Infinite / Runaway Data Fetching
- **notificationService.ts**: Implemented in-memory TTL cache (10s) and request deduplication to prevent redundant concurrent fetches to `/api/notifications`.
- **AdminPanel.tsx**: Merged competing catalog fetch and page reset effects into a single debounced search handler (300ms) to eliminate double-fetching on search/filter changes.
- **EditProfileScreen.tsx**: Added `useRef` for `otpIntervalRef` and `useEffect` cleanup hook to clear OTP timer interval on unmount or modal close.
- **AIEnrichmentPanel.tsx**: Updated status polling interval to check `document.hidden` and pause polling when the browser tab is inactive.
- **App.tsx**: Updated `useEffect` dependency array from `[currentUser, pharmacy]` to primitive IDs `[currentUser?.id, pharmacy?.id]` to prevent state mutation re-fetch cascades.

### Category 2: Unoptimized Database / API Queries
- **dbService.ts**: Replaced `select("*")` in `getPharmacyProfile`, `getPharmacyById`, `getAllPharmacies` with explicit column selections (`id, pharmacy_name, owner_name, phone, address, city, license_information, user_id`).
- **dbService.ts**: Replaced `select("*")` in `getNotifications` with explicit columns (`id, title, message, type, created_at, read`) and added `.limit(100)`.
- **dbService.ts**: Added `.limit(100)` to `getOrders()` to prevent returning unbounded historical result sets.
- **server.ts**: Optimized optical prescription product verification query to select only required product fields.
- **supabase-schema.sql**: Added database index recommendations for `pharmacies(user_id)`, `orders(created_at DESC)`, `orders(pharmacy_id, created_at DESC)`, and `notifications(user_id, created_at DESC)`.

### Category 3: Uncached / Unoptimized Assets
- **server.ts**: Configured `express.static` with production Cache-Control headers (`maxAge: "1y"` for static assets, `Cache-Control: no-cache` for `index.html`).
- **ProductCard.tsx & SearchSystem.tsx**: Added `loading="lazy"` to product catalog imagery tags to defer offscreen image loading until scrolled into view.
- **Brand Identity & Theme Consistency**: Generated a professional modern minimalist vector logo icon ONLY for MediChain, and aliased primary UI color variables (`indigo`, `emerald`, `blue`) in `index.css` to globally map to the brand's orchid purple (`purple`) and lime green (`lime`) palette. Ensured the logo and brand theme are applied universally across the Admin Panel, Depot Dashboard, Delivery Dashboard, as well as PWA/favicon asset paths for 'MediChain' featuring a geometric icon combining a medical cross and a capsule seamlessly integrated with interlocking supply chain nodes, utilizing an orchid purple and vibrant lime green color palette. Processed the asset to provide a transparent background version using Jimp and synced assets across `/public/logo.png`, `/public/logo.jpg`, and `src/assets/images/logo.png`.

### Category 5: Schema & Migration Tracking
- **Supabase Indexes**: Added `CREATE INDEX IF NOT EXISTS` DDL statements to `supabase-schema.sql`. Note that schema files document intended production structure; DDL index commands must be executed in the Supabase SQL Editor / CLI for live database deployment.

### Category 4: Unnecessary Re-renders
- **FlyToCartContext.tsx**: Wrapped `FlyToCartContext.Provider` `value` object in `useMemo` to prevent unneeded re-renders of all cart consumers on provider update.
- **ProductCard.tsx**: Wrapped `ProductCard` export in `React.memo` to prevent catalog item re-renders when parent state changes without prop updates.
- **AdminPanel.tsx**: Wrapped dashboard metric calculations (`ordersPending`, `ordersProcessing`, `lowStockProducts`, `expiringProducts`) in `useMemo` to avoid re-computation on every keystroke or state change.

----------------------------------------

## 32. Comprehensive Modern B2B Features & UX Overhaul
- **Home Dashboard (`Home.tsx`)**:
  - Added real-time **Active Order Live Tracker Pulse Card** with live dispatch status, delivery beacon, and instant 1-tap navigation to order tracking & handover OTP.
  - Added **Live Wholesale Bulk Campaign Section** with direct entry into tiered manufacturer bulk pricing.
  - Upgraded **Frequently Ordered Carousel** with vector dosage form visual fallbacks (`CategoryIcon`), active in-cart quantity counters, and 1-tap re-order.
- **Catalog & Search (`ProductCard.tsx`, `SearchSystem.tsx`)**:
  - Integrated dynamic **Wholesale Profit Margin %** calculated directly against MRP vs Trade Selling Price.
  - Upgraded dosage form vector icons across all categories (Tablets, Capsules, Injections, IV Infusions, Syrups, Drops, Inhalers, Ointments, etc.).
  - Replaced browser `alert()` popups with animated glassmorphism top-toast feedback banners.
- **Cart & Procurement Checkout (`CartDrawer.tsx`, `Checkout.tsx`)**:
  - Slide-over Cart Drawer with free express depot delivery progress threshold (৳10,000).
  - Added **Depot Dispatch Slot Picker** (Morning 09:00 - 13:00 vs Evening 16:00 - 20:00).
  - Added **B2B Credit Line (30-Day Pay Later)** payment mode alongside COD, bKash, and Nagad.
- **Order Tracking & Consignment History (`OrderTracking.tsx`, `OrderHistory.tsx`)**:
  - 4-Stage visual milestone timeline with real-time Socket.io updates.
  - Dedicated **4-Digit Secure Delivery Handover OTP Card** and direct 1-tap Rider helpline.
  - Responsive layout upgraded to `max-w-4xl` for desktop & mobile harmony.
- **Account & Multi-Role Operations (`Account.tsx`)**:
  - DGDA Drug License badge & verified pharmacy certification.
  - Integrated **B2B Persona & Role Switcher Console** allowing 1-tap instant switching between Pharmacy Owner, Admin Executive, Depot Manager, and Delivery Rider for rapid operational verification.

----------------------------------------

## 33. Smart Generic Alternative Finder & Stock-Out Restock Alert Engine
- **Smart Generic Alternative Finder (`productService.getGenericAlternatives`, `ProductDetails.tsx`)**:
  - Automatically queries and displays alternative brands sharing identical active generic molecules (e.g., Square, Beximco, Incepta, Acme, Renata, Opsonin).
  - Shows comparative manufacturer names, available depot stock, packaging, trade price, and wholesale profit margins (`% Margin`).
  - Pharmacists can switch views or 1-tap add alternative brand boxes directly to their procurement cart.
- **Stock-Out Restock Notification Alert Engine (`ProductDetails.tsx`, `ProductCard.tsx`)**:
  - For out-of-stock products (`availableStock === 0`), replaced disabled buttons with an active **"🔔 স্টকে আসলে নোটিফাই করুন (Notify When Restocked)"** CTA.
  - Pharmacists can toggle restock alerts with instant state feedback and persistent local storage synchronization (`medichain_restock_alerts`).
  - Upgraded catalog cards in both horizontal and grid layouts to feature mini **"Notify"** restock triggers.

----------------------------------------

## 34. Pharmacy-Facing Simple & Natural Bengali UI Localization (সহজ ও সাবলীল বাংলা ইন্টারফেস)
- **Target Audience Alignment**:
  - Tailored specifically for retail pharmacy owners and shopkeepers in mofussil towns and district headquarters across Bangladesh who are comfortable with everyday conversational Bengali.
- **Localized Components & Features**:
  1. **Persistent Navigation & Global Search (`src/App.tsx`, `src/components/Home.tsx`)**:
     - Localized bottom tabs (*হোম*, *ওষুধ খুঁজুন*, *কার্ট*, *অর্ডারসমূহ*, *প্রোফাইল*).
     - Search placeholders (*১০,০০০+ ওষুধ বা জেনেরিক নাম লিখে খুঁজুন...*), scan button (*প্রেসক্রিপশন স্ক্যান*), and live order status card (*ডিপোতে প্রসেসিং চলছে* / *রাইডার ডেলিভারি নিয়ে আসছেন*).
  2. **Product Catalog & Search System (`src/components/SearchSystem.tsx`, `src/components/ProductCard.tsx`)**:
     - Filter selectors (*সাধারণ ক্রম*, *সর্বোচ্চ লাভ (ছাড়)*, *জনপ্রিয় ওষুধ*, *কম স্টকের ওষুধ*), recent searches (*সম্প্রতি খোঁজা হয়েছে*), and stock badges (*স্টকে আছে*, *কম মজুদ*, *স্টকে নেই*).
     - Profit margin chips (*...% লাভ*) and trade pricing tags (*মেডিচেইন পাইকারি রেট*).
  3. **Product Details Modal & Smart Substitution Engine (`src/components/ProductDetails.tsx`)**:
     - Specs (*প্রস্তুতকারক কোম্পানি*, *প্যাকেটের সাইজ*, *ওষুধের মেয়াদ (FEFO)*, *উৎপাদন ব্যাচ নং*), stock ledger (*মজুদ আছে*, *রিজার্ভড*, *মোট বিক্রি*), and substitution finder (*💡 একই ফর্মুলার বিকল্প কোম্পানির ওষুধসমূহ*).
  4. **Procurement Cart Drawer (`src/components/CartDrawer.tsx`)**:
     - Free delivery banner (*🎉 অভিনন্দন! এই অর্ডারে আপনি পাচ্ছেন সম্পূর্ণ ফ্রি এক্সপ্রেস ডেলিভারি* / *আর মাত্র ৳... টাকার ওষুধ কিনলেই ফ্রি ডেলিভারি পাবেন!*), invoice breakdown, and action CTA (*অর্ডার করতে এগিয়ে যান*).
  5. **Checkout & Gateway (`src/components/Checkout.tsx`)**:
     - Verified address badge (*অনুমোদিত ফার্মেসি*), delivery slots (*সকালের ডেলিভারি*, *বিকালের ডেলিভারি*), payment methods (*ক্যাশ অন ডেলিভারি*, *বি২বি ক্রেডিট লাইন (৩০ দিনের বাকিতে ক্রয়)*, *বিকাশ*, *নগদ*), and pin confirmation dialogs.
  6. **Live Order Tracking & History (`src/components/OrderTracking.tsx`, `src/components/OrderHistory.tsx`, `src/components/OrderSuccess.tsx`)**:
     - 4-milestone tracking steps (*অর্ডার গৃহীত*, *প্যাকিং সম্পন্ন*, *রাইডার পথে আছেন*, *ডেলিভারি সম্পন্ন*), handover OTP safety instruction (*🔒 নিরাপদ ডেলিভারি ওটিপি পিন • ওষুধ বুঝে পাওয়ার পর কেবল এই পিনটি রাইডারকে দিন*), and return dispute modal.
  7. **Prescription Scanner & Profile (`src/components/PrescriptionScanner.tsx`, `src/components/Account.tsx`)**:
     - AI prescription scanner, DGDA KYC status, PWA install prompt (*অ্যাপ ইনস্টল করুন*), and quick action tiles.

----------------------------------------

## 35. Custom Bengali Typography Package Integration (`Li Alinur Banglaborno`)
- **Font Package Details**:
  - Embedded local font package files stored under `public/fonts/`:
    - `Li Alinur Banglaborno Unicode.ttf` (Regular, Bold, ExtraBold, Black weights)
    - `Li Alinur Banglaborno Unicode Italic.ttf` (Italic & Bold Italic weights)
    - Additional ANSI v1 & v2 fallbacks.
- **Implementation & Optimization**:
  - Configured `@font-face` definitions in `src/index.css` with `font-display: swap` for zero-FOIT.
  - Linked `<link rel="preload" href="/fonts/Li%20Alinur%20Banglaborno%20Unicode.ttf" as="font" type="font/ttf" crossorigin="anonymous" />` in `index.html` for instant page load.
  - Configured Tailwind v4 `--font-sans: "Li Alinur Banglaborno", "Plus Jakarta Sans", ...;` and `--font-bangla` theme variables.
  - Set global CSS rule ensuring all `body`, `button`, `input`, `textarea`, `select` elements automatically render in **Li Alinur Banglaborno**.

----------------------------------------

## 36. Lively Homepage Transformation & Direct Product Catalog Integration
- **Direct Voice & Camera Search (`src/components/Home.tsx`)**:
  - Embedded microphone voice query input (SpeechRecognition API) and camera prescription scanning CTA directly into the primary search bar.
  - Live query debouncing with instant filtering of the embedded products catalog without leaving the homepage.
- **Top Pharma Manufacturer Brand Carousel / Hub**:
  - Interactive brand cards for Bangladesh's top pharmaceutical manufacturers (*Square, Beximco, Incepta, Acme, Renata, Opsonin, Healthcare, ACI, Eskayef, Aristopharma, Radiant, General Pharma*).
  - 1-tap manufacturer filtering with active filter badges and quick clear triggers.
- **Wholesale Profit Margin Calculator & Savings Meter**:
  - Dynamic gradient dashboard card highlighting average 22%–32% wholesale margins directly from manufacturer depots.
  - Quick action chips for instant filtering to `🔥 Deals`, `⭐ Popular`, or `⚠️ Low Stock`.
- **Complete Live Products Catalog & View Mode Toggle on Homepage**:
  - Embedded full paginated catalog with infinite scrolling (`IntersectionObserver`) directly on the homepage.
  - Filter tabs: `সব ওষুধ` (`all`), `🔥 সর্বোচ্চ লাভ` (`deals`), `⭐ জনপ্রিয় ওষুধ` (`frequent`), `⚠️ কম স্টকের ওষুধ` (`low_stock`).
  - View switcher: Grid view vs Horizontal list view.
  - Active filter badges for manufacturer, category, search query, and filter type with 1-click removal.

----------------------------------------

## 37. Production Live User Experience & Typography Optimization
- **Permanent Removal of Demo / Developer Persona Switcher**:
  - The application is LIVE in production with real customer traffic.
  - Completely purged the `ব্যবহারকারী রোল পরিবর্তন (ডেমো কনসোল)` testing widget from the customer-facing `Account.tsx` profile screen.
  - Ensured no testing or demo controls are visible to real pharmacy customers.
- **Enhanced Bengali Typography Scaling & Readability**:
  - Globally configured `src/index.css` with improved base font scaling (`0.975rem` / `16px`), line-height (`1.45`), letter spacing (`0.015em`), and subpixel antialiasing for `Li Alinur Banglaborno`.
  - Scaled up UI font sizes across all customer views:
    - **Bottom Navigation Bar**: Scaled labels to `text-xs font-black` and icons to `w-5.5 h-5.5`.
    - **Account / Profile Page**: Scaled headers to `text-lg sm:text-xl font-black`, drug license/role badges to `text-xs font-bold`, and action cards to `text-sm font-black`.
    - **Product Cards (Grid & Horizontal)**: Increased medicine titles (`text-sm sm:text-base font-black`), generic names (`text-xs font-bold`), pack size & stock (`text-xs font-mono`), and discount tags (`text-[10px] font-black`).
    - **Homepage Controls**: Increased brand names, category badges, catalog tabs, and section headings for crystal clear readability by mofussil pharmacy shopkeepers.

----------------------------------------

**To AI Agents:**
This project is an advanced, production-ready B2B Pharmacy application.
**Architecture:** React SPA + Express.js backend (monolith deployment via `server.ts`).
**Important files:** `server.ts` (all API routes), `src/App.tsx` (frontend router), `supabase-schema.sql` (database schema).
**Database:** Supabase PostgreSQL. RLS is active.
Always update `server.ts` AND frontend components if adding a new feature.
Do not introduce unnecessary routing libraries (react-router), it uses a custom state-based router.
Use Tailwind v4 for all styling.
Icons must be from `lucide-react`.
Always respect the existing environment variables and dual-auth structure (Supabase + local proxy).
**Mandatory Continuous Deployment:** Every time code changes or fixes are made and verified, you MUST push to GitHub (`git add .`, `git commit -m "..."`, `git push origin main`) and deploy to Vercel via CLI (`npx vercel --prod --yes`).
**End of Report.**