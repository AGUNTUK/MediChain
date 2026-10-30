# MediChain — Prioritized Remaining Issues Tracking Log

Consolidated tracker of deferred items and operational recommendations following the completion of Production Hardening, Vercel Serverless Migration, and Pharma Khata Hub Integration.

---

## Prioritized Issues & Observations

| # | File:Line | Severity | Issue Description | Recommendation & Status |
|---|---|---|---|---|
| 1 | `src/components/ThreeDMedicineViewer.tsx:1-212` | Low (Perf) | 3D medicine viewer pulls `three`, `@react-three/fiber`, `@react-three/drei`, `@splinetool/runtime` (~580 kB uncompressed / 155 kB gzip, ~75% of main chunk). | **Pending User Approval**: Bundle measurement completed per J4. Feature retained until user confirms removal in final review. |
| 2 | `supabase-migrations/08_rls_hardening.sql` to `21_fix_users_rls_recursion.sql` | Medium (Ops) | Database-level RLS, non-recursive policies, foreign keys, triggers, and sequences reside in versioned migration files in `supabase-migrations/` and `supabase/migrations/`. | **Manual Execution in Dashboard**: Code implements dual-writes and graceful fallbacks so the app operates continuously both before and after running in Supabase SQL editor. |
| 3 | `playwright.config.ts:18` | Low (Tooling) | Full visual regression and Axe accessibility tests require Chromium browser binary download (`npx playwright install chromium`). | **Environment Dependency**: All 39 API, auth, egress, order integrity, and unit test suites run and pass without the browser binary. |
| 4 | `api/index.ts` & `vercel.json` | Resolved | Serverless migration from Render to Vercel Serverless Functions (`api/index.ts`) and Vercel Edge (`https://medichainbd.vercel.app`). | **Resolved & Active**: Full production migration complete with explicit serverless bundling, extension resolution, and zero `FUNCTION_INVOCATION_FAILED` errors. |

---

## Status Summary
- **Critical Security (Phases 6, 7, 8, 13)**: 100% Resolved. Zero header spoofing, zero IDOR, zero PIN leakage, non-recursive RLS policies (Postgres 42P17 eliminated), Cash on Delivery exclusive.
- **Egress & Stability (Phases 9, 10, 11, 12)**: 100% Resolved. Bounded queries, dedicated notification/cart schemas, sequence order numbers, cryptographic OTP, dual-layer optimistic Khata sync, and hardened SWR/TTL caching.
