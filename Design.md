# Design System & Visual Guidelines — MediChain

## 1. Visual Identity & Archetype

MediChain combines the clinical precision of high-reliability medical infrastructure with the energetic modernism of high-growth B2B fintech.

- **Design Tone:** Trustworthy, crisp, high-contrast, uncluttered, accessible.
- **Color Philosophy:** Sophisticated medical deep indigo/purple paired with high-visibility vibrant lime accents for financial savings and action highlights.
- **Theme Support:** Polished light mode primary theme with full high-contrast dark mode support.

---

## 2. Color Palette & Design Tokens

### Primary Brand Palette
- **Brand Purple (Primary UI & Action):** `#4F3799` (Deep Royal Violet) — Represents authority, precision, and medical security.
  - Hover: `#3D2A7A` | Light Tint: `#F5F3FF`
- **Brand Lime (Savings & Discount Accents):** `#D2F801` (Vibrant Electric Lime) — Used for savings tags, discount pills (`% সাশ্রয়`), and key conversions.
  - Dark Mode Text on Lime: `#0A0D14` (Ultra-high contrast)
- **Clinical Emerald (Success & Verification):** `#10B981` — Used for verified orders, active stock status, and OTP confirmation.
- **Warning Amber:** `#F59E0B` — Low stock alerts and pending KYC states.
- **Alert Rose:** `#EF4444` — Out-of-stock items, delivery failures, and cancellations.

### Sophisticated Neutrals
- **Light Mode Canvas:** `#F8FAFC` (Slate-50)
- **Light Mode Card Surface:** `#FFFFFF` (Pure White) with `#E2E8F0` (Slate-200) borders.
- **Dark Mode Canvas:** `#0A0D14` (Deep Night Slate)
- **Dark Mode Card Surface:** `#14161F` with `#1E2230` borders.

---

## 3. Typography System

MediChain is engineered for bilingual Bengali and English readability, prioritizing font weight hierarchy, baseline alignment, and numerical clarity.

### Font Pairing
- **Primary Bengali & Display Font:** `Li Alinur Banglaborno` (Unicode & ANSI).
  - Loaded locally in `/public/fonts/` with `@font-face` definitions in `src/index.css`.
  - Supports Regular, Italic, Semi-Bold, and Extra-Bold weights.
- **Secondary English / Numerical Font:** Plus Jakarta Sans / Inter / System Fallback.
- **Monospace (Thermal Printer Slips & OTPs):** Courier New / Monospace.

### Typographic Hierarchy
| Role | Font Size | Weight | Tracking / Line Height |
| :--- | :--- | :--- | :--- |
| **Page / Hero Headline** | `24px – 32px` | Extra Bold (`font-black`) | `-0.02em`, `1.2` |
| **Section Header** | `18px – 20px` | Bold (`font-extrabold`) | `normal`, `1.3` |
| **Product Title** | `14px – 16px` | Bold (`font-bold`) | `normal`, `1.4` |
| **Price (৳ Taka Amount)** | `16px – 20px` | Extra Bold (`font-black`) | `-0.01em`, `1.1` |
| **Discount Badge** | `9px – 11px` | Extra Bold (`font-black`) | `0.05em`, `uppercase` |
| **Body / Description** | `13px – 15px` | Medium / Regular (`font-medium`) | `normal`, `1.5` |
| **Micro Caption / Shelf** | `10px – 11px` | Semi-Bold (`font-semibold`) | `0.02em`, `1.2` |

---

## 4. Component Layout & Spacing Rules

1. **Card Architecture:**
   - Standard card border-radius: `12px` to `16px` (`rounded-xl` or `rounded-2xl`).
   - Outer container padding must equal or exceed inner element gap (`p-4` to `p-6`).
   - No nested cards (avoid placing full bordered cards inside other cards).

2. **Buttons & Controls:**
   - Minimum mobile touch target: `44px` height (`h-11` or `h-12`).
   - Horizontal button padding is strictly 2x vertical padding (`px-4 py-2` or `px-6 py-3`).
   - Text inside buttons, chips, and pills sits on a single line (`whitespace-nowrap`).

3. **Product Card Badges:**
   - Savings pill: `bg-brand-lime text-slate-950 font-black px-2 py-0.5 rounded shadow-xs`.
   - Manufacturer & Dosage form: High-contrast subtle slate background.
