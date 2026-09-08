# Rules & Guidelines — MediChain AI Agent

This document defines the strict operational boundaries, coding patterns, forbidden practices, and architecture rules for all AI agents and engineers working on MediChain.

---

## 1. Absolute Golden Directives

1. **Production Safeguards:**
   - MediChain is an active B2B system processing real pharmacy orders.
   - **NEVER** introduce breaking changes to checkout, cart, authentication, pharmacy onboarding, or order fulfillment workflows.
   - **NEVER** drop or alter database tables, columns, or foreign keys destructively.

2. **Source of Truth:**
   - Always refer to `DEVELOPER_HANDOVER_REPORT.md` and `Architecture.md` before making architectural decisions.

3. **Strict Scope Discipline:**
   - Build **only** what the user explicitly requests.
   - **DO NOT** invent unsolicited features, tabs, demo dashboards, or background workers.

4. **Git Operations:**
   - **NEVER** commit or push to Git automatically.
   - Push to Git **ONLY** upon direct user request (e.g. "Push to git").

---

## 2. Technology & Library Rules

### Allowed & Required
- **Icons:** **ONLY** `lucide-react`. Custom SVGs are forbidden.
- **Styling:** **ONLY** Tailwind CSS utility classes. Avoid inline `style={{}}` attributes and custom external CSS files.
- **Animations:** Use `motion/react` (Framer Motion).
- **Charts:** Use `recharts` or `d3`.
- **API Fetching:** Always use the authenticated `apiFetch()` helper from `/src/lib/apiFetch.ts` to ensure `Authorization: Bearer <token>` and session cookies are sent.
- **AI SDK:** Use the modern `@google/genai` TypeScript SDK (server-side only).

### Strictly Forbidden
- ❌ **NO React Router:** The application uses a robust state-based router managed in `App.tsx` (`appStep` & `activeTab`). Do NOT import `react-router-dom`.
- ❌ **NO Client-Side Secret Keys:** Never expose `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `TELEGRAM_BOT_TOKEN` in the browser or prefix with `VITE_`.
- ❌ **NO Digital Payment Gateways:** MediChain is 100% Cash on Delivery (COD) exclusive. Do NOT add bKash, Nagad, SSLCommerz, or Stripe gateways.
- ❌ **NO AI Web Scraping / Crawler Engines:** Autonomous background web scrapers have been deprecated to prevent server egress saturation.
- ❌ **NO `window.alert` / `window.open` in iFrames:** Use custom modals or in-app toasts for state feedback.

---

## 3. Coding & Syntax Standards

1. **TypeScript Safety:**
   - Top-level named imports only (`import { ... } from "..."`).
   - Standard `enum` syntax only; do NOT use `const enum`.
   - Never use `any` when explicit types in `/src/types.ts` exist.

2. **React 19 & Hook Rules:**
   - Never update state directly in the component body.
   - Guard `useEffect` dependencies: avoid objects and array literals as dependencies to prevent infinite re-renders.
   - Memoize costly calculations with `useMemo` or `useCallback`.

3. **Port & Host Constraints:**
   - Port `3000` and host `0.0.0.0` are hardcoded by Cloud Run infrastructure. Never override or attempt to bind other ports (e.g. 5173, 3001).

4. **Responsive & Mobile-First:**
   - Minimum touch target size: 44px on mobile devices.
   - Use Tailwind's `sm:`, `md:`, `lg:` prefixes for adaptive desktop-density layouts.

---

## 4. Error Handling & Verification Checklist

- **API Route Handlers:** Always wrap in `try/catch` blocks and return structured JSON: `{ error: string }` or `{ success: true, ... }`.
- **Database Transactions:** In multi-step operations (e.g., order creation + stock deduction), implement atomic rollbacks to prevent orphaned records.
- **Mandatory Quality Gates:**
  1. `lint_applet` (must pass `tsc --noEmit` with 0 errors).
  2. `compile_applet` (must pass production build `vite build` cleanly).
