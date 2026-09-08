# Permanent Project Context & Rules

## 1. Project Context & Source of Truth
Always use `DEVELOPER_HANDOVER_REPORT.md` as the permanent project context and source of truth. Before generating any code or suggestions, you MUST review this report. If future code differs from this report, identify the differences and update the report first, then generate code.

## 2. Git Push & Deployment on Explicit Request Only
Do NOT push to Git automatically. Only stage, commit, and push all changes to GitHub (`git add .`, `git commit -m "..."`, `git push origin main`) or deploy when the user explicitly requests it (e.g. by saying "push to git").

## 3. Strict Scope & No Unsolicited Additions
NEVER add any features, options, UI elements, or extra parameters that the user has not explicitly requested or approved. Keep implementations strictly focused and minimal to the user's explicit instructions.

## 4. Live Production Safeguards (Active Customer Orders)
This is a live production application actively processing real orders from pharmacies and customers.
- NEVER introduce breaking changes to checkout, order placement, cart, authentication, or pharmacy workflows.
- All modifications must be backward-compatible, non-destructive, and verified against tests, linting, and compilation before completion.
- Database tables, columns, and foreign keys must never be dropped or destructively altered.

## 5. Conversation Memory & Historical Decision Context
Always retain and respect all past conversation context, user preferences, bug reports, and previous architectural decisions. When making changes or offering recommendations, evaluate them against all historical context discussed across previous turns.

