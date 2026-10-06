# MediChain — Prioritized Remaining Issues Tracking Log

Consolidated tracker of deferred items and operational recommendations following the completion of Phases 6–15 Production Hardening.

---

## Prioritized Issues & Observations

| # | File:Line | Severity | Issue Description | Recommendation & Reason Deferred |
|---|---|---|---|---|
| 1 | `src/components/ThreeDMedicineViewer.tsx:1-212` | Low (Perf) | 3D medicine viewer pulls `three`, `@react-three/fiber`, `@react-three/drei`, `@splinetool/runtime` (~580 kB uncompressed / 155 kB gzip, ~75% of main chunk). | **Pending User Approval**: Bundle measurement completed per J4. Feature retained until user confirms removal in final review. |
| 2 | `supabase-migrations/08_rls_hardening.sql` to `11_schema_repairs.sql` | Medium (Ops) | Database-level RLS, foreign keys, triggers, and sequences reside in versioned migration files in `supabase-migrations/` and `supabase/migrations/`. | **Manual Execution in Dashboard**: Code implements dual-writes and graceful fallbacks so the app operates continuously both before and after running in Supabase SQL editor. |
| 3 | `playwright.config.ts:18` | Low (Tooling) | Full visual regression and Axe accessibility tests require Chromium browser binary download (`npx playwright install chromium`). | **Environment Dependency**: All 39 API, auth, egress, order integrity, and unit test suites run and pass without the browser binary. |
| 4 | `vercel.json:12-24` | Low (Egress) | Vercel `/api/*` reverse-proxy rewrite is retained alongside `VITE_API_BASE_URL` direct Render connectivity in `apiFetch.ts`. | **Graceful Migration**: Kept during transition to ensure zero downtime before frontend DNS updates are finalized. |

---

## Status Summary
- **Critical Security (Phases 6, 7, 8)**: 100% Resolved. Zero header spoofing, zero IDOR, zero PIN leakage, Cash on Delivery exclusive.
- **Egress & Stability (Phases 9, 10, 11, 12, 13, 14)**: 100% Resolved. Bounded queries, dedicated notification/cart schemas, sequence order numbers, cryptographic OTP, dynamic PORT, error handler placement, and hardened SWR/TTL caching.
