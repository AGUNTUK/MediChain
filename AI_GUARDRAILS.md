# MediChain AI Engineering Guardrails (Strict Rules)

## 1. Scope Discipline (No Over-Correction)
- ONLY modify the specific files explicitly requested by the user. 
- NEVER touch unrelated files, hooks, or backend routes unless it is a direct dependency of the current task.
- If a fix requires changing a core file (like `server.ts` or `App.tsx`), ask for explicit confirmation first.

## 2. Zero Egress & Cost Policy
- NEVER re-introduce unpaginated `.select('*')` queries on large tables (`products`, `orders`). Always use explicit lightweight column selections and `.limit()`.
- NEVER trigger heavy database queries inside React `useEffect` loops or frequent event handlers.

## 3. Tech Stack Compliance
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion.
- Backend: Vercel Serverless Functions (`api/index.ts` / Express).
- Database: Supabase PostgreSQL (always use targeted columns, zero Base64 in `image_url`).