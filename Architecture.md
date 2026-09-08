# Architecture & Technical Design Document — MediChain

## 1. System Architecture Overview

MediChain utilizes a modern full-stack monolith architecture designed for high availability, low latency, and zero deployment friction. The application serves both the single-page React frontend and the Express REST / WebSocket API from a unified Node.js runtime.

```
+-----------------------------------------------------------------------------------+
|                                  Client Layer                                     |
|  - React 19 + TypeScript + Vite SPA                                               |
|  - PWA Service Worker (Workbox offline cache)                                     |
|  - Tailwind CSS v4 + Lucide Icons + Framer Motion                                 |
+----------------------------------------+------------------------------------------+
                                         |
                                         | HTTPS (JSON) & WSS (Socket.io)
                                         v
+-----------------------------------------------------------------------------------+
|                             Nginx Proxy (Port 3000)                              |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                         Express.js Application (server.ts)                        |
|  +---------------------+ +----------------------+ +----------------------------+  |
|  | Authentication &    | | Order Processing &   | | Real-time Broadcast Hub    |  |
|  | RBAC Middleware     | | Inventory / WMS      | | (Socket.io Multi-Room)     |  |
|  +---------------------+ +----------------------+ +----------------------------+  |
|  +---------------------+ +----------------------+ +----------------------------+  |
|  | Gemini Vision OCR   | | Telegram Bot Alert   | | Web Push Manager &         |  |
|  | & AI Processing     | | Service              | | Service Worker API         |  |
|  +---------------------+ +----------------------+ +----------------------------+  |
+----------------------------------------+------------------------------------------+
                                         |
                      +------------------+------------------+
                      |                                     |
                      v                                     v
+---------------------------------------+ +-----------------------------------------+
|     Supabase PostgreSQL Database      | |            External Services            |
|  - Relational Schema with RLS         | |  - Google Gemini 2.5/Flash API          |
|  - Products, Orders, Inventory (FEFO) | |  - Telegram Bot API (Alerts)            |
|  - Users, Pharmacies, Invoices        | |  - Supabase Storage (Prescriptions)     |
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
├── server.ts                 # Express backend entry point & REST API routes
├── tsconfig.json             # TypeScript compiler configuration
├── vite.config.ts            # Vite bundler configuration & plugins
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
│   ├── components/           # UI Views & Functional Components
│   │   ├── Account.tsx       # Pharmacy profile & account details
│   │   ├── AdminCharts.tsx   # Revenue & order analytics charts
│   │   ├── AdminPanel.tsx    # Comprehensive compliance & catalog manager
│   │   ├── Cart.tsx          # Main wholesale checkout cart
│   │   ├── CartDrawer.tsx    # Slide-over fly-to-cart drawer
│   │   ├── Checkout.tsx      # COD order confirmation screen
│   │   ├── DeliveryDashboard.tsx # Rider delivery management app
│   │   ├── DepotDashboard.tsx# Depot warehouse overview & KPIs
│   │   ├── Home.tsx          # Homepage product feed & category selector
│   │   ├── ModernInvoiceModal.tsx # Printable official VAT invoice modal
│   │   ├── OrderHistory.tsx  # Past customer orders & invoice downloads
│   │   ├── OrderTracking.tsx # Real-time delivery timeline with OTP
│   │   ├── ProductCard.tsx   # Horizontal and vertical product cards
│   │   ├── SearchSystem.tsx  # Multi-token search modal & filter drawer
│   │   ├── SmartOrderModal.tsx # Prescription AI OCR scanner & cart builder
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
│   │   ├── apiCache.ts       # LRU memory cache for fast API reads
│   │   ├── apiFetch.ts       # Authenticated fetch wrapper with Bearer token
│   │   ├── dbService.ts      # Database query abstraction layer
│   │   ├── pushNotificationService.ts # Web Push API integration
│   │   ├── socketClient.ts   # Socket.io client connector
│   │   ├── supabaseAdmin.ts  # Service-role Supabase client
│   │   └── supabaseClient.ts # Public Supabase client
│   │
│   └── services/             # Specialized Frontend API Services
│       ├── auth.ts           # Authentication service
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
| **Motion & Graphics** | Framer Motion (`motion/react`), Three.js |
| **Charts & Data Viz** | Recharts, D3 |
| **Backend Framework** | Node.js, Express.js (v4.21.2), TypeScript |
| **Real-time Engine** | Socket.io (WebSocket rooms: `role_Admin`, `role_Depot Staff`, `role_Delivery Staff`, `order_[id]`) |
| **Database** | PostgreSQL via Supabase with Row Level Security (RLS) policies |
| **AI / Machine Learning** | Google Gemini 2.5 Flash / Vision via `@google/genai` SDK |
| **Document Generation** | PDFKit (Invoices), Custom Monospace Formatter (80mm Thermal Slips) |
| **External Integration** | Telegram Bot API, Web Push API (VAPID) |

---

## 4. Key Data Models & Relations

- **Users:** `id`, `email`, `role` (Pharmacy Owner | Depot Staff | Delivery Staff | Admin), `created_at`
- **Pharmacies:** `id`, `user_id`, `name`, `license_no`, `drug_license_no`, `owner_name`, `phone`, `address`, `verified`
- **Products:** `id`, `name`, `generic_name`, `dosage_form`, `strength`, `company`, `mrp`, `selling_price`, `discount_percentage`, `stock`, `image_url`
- **Orders:** `id`, `readable_id`, `pharmacy_id`, `status` (Pending | Confirmed | Processing | Packed | Out for Delivery | Delivered | Cancelled), `payment_method` (COD), `total_amount`, `total_savings`, `handover_otp`, `assigned_rider_id`, `created_at`
- **Order Items:** `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `total_price`
- **Inventory Batches:** `id`, `product_id`, `batch_number`, `expiry_date`, `rack_location`, `quantity_available`
