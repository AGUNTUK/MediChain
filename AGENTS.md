# Permanent Project Context & Rules

## 1. Project Context & Source of Truth
Always use `DEVELOPER_HANDOVER_REPORT.md` as the permanent project context and source of truth. Before generating any code or suggestions, you MUST review this report. If future code differs from this report, identify the differences and update the report first, then generate code.

## 2. Mandatory Automatic Git Push & Vercel CLI Deployment
Every time changes, fixes, or new features are implemented and verified:
1. Stage, commit, and push all changes to GitHub `main` branch (`git add .`, `git commit -m "..."`, `git push origin main`).
2. Immediately deploy to Vercel production using the Vercel CLI (`npx vercel --prod --yes`).
