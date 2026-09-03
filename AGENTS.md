# Permanent Project Context & Rules

## 1. Project Context & Source of Truth
Always use `DEVELOPER_HANDOVER_REPORT.md` as the permanent project context and source of truth. Before generating any code or suggestions, you MUST review this report. If future code differs from this report, identify the differences and update the report first, then generate code.

## 2. Git Push & Deployment on Explicit Request Only
Do NOT push to Git automatically. Only stage, commit, and push all changes to GitHub (`git add .`, `git commit -m "..."`, `git push origin main`) or deploy when the user explicitly requests it (e.g. by saying "push to git").

## 3. Strict Scope & No Unsolicited Additions
NEVER add any features, options, UI elements, or extra parameters that the user has not explicitly requested or approved. Keep implementations strictly focused and minimal to the user's explicit instructions.

