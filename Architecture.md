# Architecture & Technical Design Document — MediChain

## 1. System Architecture Overview

MediChain utilizes a modern full-stack monolith architecture designed for high availability, low latency, and zero deployment friction. In production, the application is deployed on **Vercel** (`https://medichainbd.vercel.app`), serving the single-page React frontend via Vercel Edge and API endpoints via **Vercel Serverless Functions** (`/api/*` wrapped in `api/index.ts`). For local development, Express serves both static frontend assets and REST / WebSocket APIs via `server.ts` on port 3000.

```
+-----------------------------------------------------------------------------------+
|                                  Client Layer                                     |
|  - React 19 + TypeScript + Vite SPA                                               |
|  - PWA Service Worker (Workbox offline cache)                                     |
|  - Tailwind CSS v4 + Lucide Icons + Framer Motion (motion/react)                  |
|  - Dual-Layer Optimistic Pharma Khata Engine (LocalStorage + Remote Bundle Sync)   |
+----------------------------------------+------------------------------------------+
                                         |
                                         | HTTPS (JSON) & WSS (Socket.io)
                                         v
+-----------------------------------------------------------------------------------+
|               Vercel Edge & Serverless Functions (api/index.ts) /                 |
|               Express.js Development Runtime (server.ts - Port 3000)              |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                         Core Express Application Services                         |
|  +---------------------+ +----------------------+ +----------------------------+  |
|  | Authentication &    | | Order Processing &   | | Pharma Khata & Ledger      |  |
|  | RBAC Middleware     | | Inventory / WMS FEFO | | Synchronization Engine     |  |
|  +---------------------+ +----------------------+ +----------------------------+  |
|  +---------------------+ +----------------------+ +----------------------------+  |
|  | Gemini Vision OCR   | | Telegram Bot Alert   | | Real-time Broadcast Hub    |  |
|  | & AI Processing     | | Service              | | & Web Push Manager         |  |
|  +---------------------+ +----------------------+ +----------------------------+  |
+----------------------------------------+------------------------------------------+
                                         |
                      +------------------+------------------+
                      |                                     |
                      v                                     v
+---------------------------------------+ +-----------------------------------------+
|     Supabase PostgreSQL Database      | |            External Services            |
|  - Relational Schema with RLS         | |  - Google Gemini 2.5 Flash / Vision API |
|  - Products, Orders, Inventory (FEFO) | |  - Telegram Bot API (Alerts)            |
|  - Khata Short Book, Parties, Ledgers | |  - Supabase Storage (Prescriptions)     |
|  - Users, Pharmacies, Invoices        | |  - Web Push API (VAPID)                 |
+---------------------------------------+ +-----------------------------------------+
```

---

## 2. Directory & File Structure

```text
/
├── .env.example              # Environment variables template
├── AGENTS.md                 # Rules and persistent project instructions
├── Architecture.md           # System design & architecture blueprint
├── Design.md                 # Typography, tokens, color system & visual identity
├── DEVELOPER_HANDOVER_REPORT.md # Permanent project context & historical record
├── Memory.md                 # AI working memory, completed milestones & state
├── package.json              # Dependencies and scripts (dev, build, start)
├── Phases.md                 # Development roadmap and historical phases
├── PRD.md                    # Product requirements document
├── Rules.md                  # Strict AI guidelines, coding standards & constraints
├── server.ts                 # Express backend entry point & REST API routes (local dev)
├── tsconfig.json             # TypeScript compiler configuration
├── vercel.json               # Vercel serverless routing & build configuration
├── vite.config.ts            # Vite bundler configuration & plugins
│
├── api/                      # Serverless Deployment Handlers
│   └── index.ts              # Vercel serverless entry point wrapping Express
│
├── public/                   # Static public assets
│   ├── favicon.png           # App icon
│   ├── fonts/                # Li Alinur Banglaborno Unicode & ANSI fonts
│   ├── icons/                # PWA icons (192, 512, maskable)
│   ├── manifest.json         # PWA Web App Manifest
│   └── sw.js                 # PWA Service Worker cache script
│
├── src/                      # React Frontend Source
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Primary app controller & state-based router
│   ├── index.css             # Tailwind CSS v4 & custom typography setup
│   ├── types.ts              # Universal TypeScript data contracts
│   │
│   ├── types/                # Specialized Type Contracts
│   │   └── khata.ts          # Khata Customers, Suppliers, Transactions & Shortage Book types
│   │
│   ├── hooks/                # Custom React Hooks
│   │   └── usePharmaKhata.ts # Dual-layer optimistic Khata hook & cross-component event bus
│   │
│   ├── components/           # UI Views & Functional Components
│   │   ├── Account.tsx       # Pharmacy profile & account details
│   │   ├── AccountsModal.tsx # Financial accounts ledger modal
│   │   ├── AdminAccountsManager.tsx # Administrative ledger & closing manager
│   │   ├── AdminCharts.tsx   # Revenue & order analytics charts
│   │   ├── AdminPanel.tsx    # Comprehensive compliance, catalog & deals manager
│   │   ├── Cart.tsx          # Main wholesale checkout cart
│   │   ├── CartDrawer.tsx    # Slide-over fly-to-cart drawer
│   │   ├── Checkout.tsx      # 100% COD order confirmation screen
│   │   ├── CustomerKhataModal.tsx # Retail Customer Credit Ledger (বাকির খাতা)
│   │   ├── DeliveryDashboard.tsx # Courier delivery management cockpit
│   │   ├── DepotDashboard.tsx# Depot warehouse overview, packing & KPIs
│   │   ├── Home.tsx          # Homepage product feed & category selector
│   │   ├── KhataBookModal.tsx# Business Cashbook & Transactions Ledger
│   │   ├── ModernInvoiceModal.tsx # Printable official VAT invoice modal
│   │   ├── OrderHistory.tsx  # Past customer orders & invoice downloads
│   │   ├── OrderTracking.tsx # Real-time delivery timeline with OTP verification
│   │   ├── PharmaKhataHub.tsx# Unified Pharma Khata Hub launcher & overview
│   │   ├── PhysiciansProductSheet.tsx # Direct Telegram request bottom sheet
│   │   ├── ProductCard.tsx   # Horizontal and vertical product cards
│   │   ├── ProfileSetup.tsx  # Pharmacy registration & KYC onboarding wizard
│   │   ├── SearchSystem.tsx  # Multi-token search modal & filter drawer
│   │   ├── ShortBookModal.tsx# Smart Shortage Book (ঘাটতি বই) with 1-tap cart restock
│   │   ├── SmartOrderModal.tsx # Prescription AI OCR scanner & cart builder
│   │   ├── SupplierKhataModal.tsx # Supplier & Company Rep Ledger (পাওনাদার খাতা)
│   │   └── depot/            # WMS Depot sub-components
│   │       ├── BarcodePickScanner.tsx # Barcode picking verification
│   │       ├── BatchPickModal.tsx     # Batch collection modal
│   │       ├── Delivery.tsx           # Rider dispatch & routing assignment
│   │       ├── Inventory.tsx          # Warehouse stock & FEFO batch control
│   │       └── OrderCenter.tsx        # Order picking & thermal slip preview
│   │
│   ├── context/              # React Context Providers
│   │   ├── FlyToCartContext.tsx # Animated add-to-cart particle effects
│   │   └── ThemeContext.tsx     # Light / Dark theme state management
│   │
│   ├── lib/                  # Frontend & Backend Shared Utilities
│   │   ├── accountsService.ts# Unified double-entry ledger & financial reconciliation
│   │   ├── apiCache.ts       # LRU memory cache for fast API reads
│   │   ├── apiFetch.ts       # Authenticated fetch wrapper with Bearer token
│   │   ├── dbService.ts      # Database query abstraction layer
│   │   ├── deliverySchedule.ts # Scheduled delivery cutoff (Mon, Wed, Sat 12 PM)
│   │   ├── pushNotificationService.ts # Web Push API integration
│   │   ├── socketClient.ts   # Socket.io client connector
│   │   ├── supabaseAdmin.ts  # Service-role Supabase client (server-side only)
│   │   └── supabaseClient.ts # Public Supabase client (frontend)
│   │
│   └── services/             # Specialized Frontend API Services
│       ├── auth.ts           # Authentication & session synchronization service
│       ├── bulkDeals.ts      # Volume discounts service
│       ├── heroCarouselService.ts # Homepage banner carousel service
│       ├── notificationService.ts # Alerts and broadcast service
│       ├── order.ts          # Order placement and tracking service
│       └── product.ts        # Product catalog service
```

---

## 3. Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & Design** | Tailwind CSS v4, Lucide React, Li Alinur Banglaborno Bengali Typography |
| **Motion & Micro-interactions** | Motion / Framer Motion (`motion/react`) |
| **Charts & Data Viz** | Recharts, D3 |
| **Backend Framework** | Node.js, Express.js (v4.21.2), TypeScript |
| **Production Serverless** | Vercel Serverless Functions (`api/index.ts`), esbuild compiler |
| **Database** | PostgreSQL via Supabase with non-recursive Row Level Security (RLS) policies |
| **AI / Machine Learning** | Google Gemini 2.5 Flash / Vision via official `@google/genai` SDK |
| **Document Generation** | PDFKit (VAT Invoices), Custom Monospace Formatter (80mm Thermal Slips) |
| **External Integration** | Telegram Bot API, Web Push API (VAPID) |

---

## 4. Key Data Models & Relations

- **Users:** `id`, `email`, `role` (Pharmacy Owner | Depot Staff | Delivery Staff | Admin), `pharmacy_id`, `created_at`
- **Pharmacies:** `id`, `user_id`, `name`, `license_no`, `drug_license_no`, `owner_name`, `phone`, `address`, `verified`
- **Products:** `id`, `name`, `generic_name`, `dosage_form`, `strength`, `company`, `mrp`, `selling_price`, `discount_percentage`, `stock`, `image_url`
- **Orders:** `id`, `readable_id`, `pharmacy_id`, `status` (Pending | Confirmed | Processing | Packed | Out for Delivery | Delivered | Cancelled), `payment_method` (COD), `total_amount`, `total_savings`, `handover_otp`, `assigned_rider_id`, `created_at`
- **Order Items:** `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `total_price`
- **Inventory Batches:** `id`, `product_id`, `batch_number`, `expiry_date`, `rack_location`, `quantity_available`
- **Khata Short Book (`khata_short_book`):** `id`, `pharmacy_id`, `medicine_name`, `generic_name`, `company`, `dosage_form`, `strength`, `quantity_boxes`, `notes`, `status` (`Out of Stock` | `Low Stock` | `In Cart` | `Ordered`), `created_at`
- **Khata Parties (`khata_parties`):** `id`, `pharmacy_id`, `type` (`Customer` | `Supplier`), `name`, `phone`, `address`, `credit_limit`, `balance`, `created_at`
- **Khata Transactions (`khata_transactions`):** `id`, `pharmacy_id`, `party_id`, `type` (`Credit` | `Payment` | `Expense` | `Income`), `amount`, `date`, `notes`, `created_at`
- **Bulk Deal Tiers (`bulk_deal_tiers`):** `id`, `title`, `min_boxes`, `discount_percentage`, `status`
- **Hero Banners (`hero_banners`):** `id`, `title`, `subtitle`, `badge`, `action_text`, `action_tab`, `is_active`, `sort_order`
