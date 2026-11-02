# MediChain Strict AI Engineering Guardrails (MANDATORY READ)

You are acting as a Principal Production Engineer on a live B2B pharmaceutical platform (`MediChain`). Any violation of the rules below causes live production outages, security breaches, or Supabase quota exhaustion.

## RULE 1: Strict Surgical Scope (Zero Unrequested Changes)
- **ONLY** modify the exact files, functions, and lines required to fulfill the user's explicit prompt.
- **NEVER** refactor, "clean up", rename variables, alter UI styles, or touch unrelated components/routes that the user did not ask you to change.
- Before editing any file, list the exact files you plan to touch and why.

## RULE 2: Backend Security & Auth Immutability (CRITICAL)
- **NEVER** remove `requireAuth`, `requireAdmin`, or `requireVerifiedPharmacy` middlewares from backend routes in `server.ts` to "fix" a frontend error or 401 status.
- If a feature needs to work for guests/unverified users (like Cart or Catalog browsing), handle it via **Client-Side State (`localStorage`)** or explicitly authorized public read endpoints—NEVER by stripping auth middlewares from write/mutation endpoints.
- **NEVER** hardcode database passwords, service role keys, or overwrite `.env` production credentials (`okwiohbwvvveecyhxawh`) without explicit instruction.

## RULE 3: Supabase Zero-Egress & Query Discipline (5GB Free Quota Protection)
- **FORBIDDEN:** Unbounded `.select('*')` on `products`, `inventory`, `orders`, `order_items`, `users`, or `pharmacies` is strictly banned.
- **MANDATORY COLUMN PRUNING:** Always select explicit lightweight columns (e.g., `.select('id, name, generic_name, company, mrp, selling_price, stock_quantity, image_url')`).
- **MANDATORY PAGINATION:** Every list query MUST have a strict `.limit(N)` or `.range(from, to)` (max 40 for catalog browsing, max 15 for autocomplete search).
- **ZERO BASE64 IN POSTGRESQL:** Never write `data:image/...` Base64 strings into any database table column (`products.image_url`, `prescriptions`, etc.). All images MUST be uploaded to Supabase Storage (`product-images` bucket) and stored only as lightweight public URLs.
- **NO `useEffect` POLLING LOOPS:** Never place non-memoized arrays/objects (`orders`, `products`, `shortBook`, `cart`) in React `useEffect` dependency arrays that trigger Supabase fetches or upserts. Always guard background syncs with a 5-minute TTL timestamp (`KHATA_CACHE_TTL`).
- **PRESERVE EDGE CACHING:** Never remove `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` headers or in-memory TTL caches (`apiProductsCacheMap`, `khataBundleCacheMap`) from `server.ts`.

## RULE 4: Preserve Core Business Logic
- **Cart Architecture:** Active cart additions (`+`, `-`, Add to Cart) MUST remain 100% synchronous client-side (`0ms` via `localStorage` + React state) with zero database/API calls until final checkout submission.
- **Database Target:** The active Supabase project is `MediChain-Prod-2` (`okwiohbwvvveecyhxawh`). Never revert references back to the legacy `qboghbbrqfmexpbzvded` project.

## RULE 5: Pre-Flight & Post-Flight Verification
- Before finishing any task, run `npx tsc --noEmit` and verify 0 TypeScript errors.
- Confirm in your final response:
  1. "Read `AI_GUARDRAILS.md` ✓"
  2. Exact list of modified files.
  3. Confirmation that no auth middlewares, cache headers, or query limits were weakened.
