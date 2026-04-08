# Progress Tracker

Status of all tasks, open items, and blockers.

**Legend:** Not Started | In Progress | Awaiting Review | Done

---

## Core Tasks

### Task 4A: Bug Fix
- **Status:** Done
- **Scope:** Fix `parseInt` -> `parseFloat` for `unitCost` in `src/pages/api/products/[id].js:26`
- **Notes:** Also added try-catch, input validation (negative cost, bad reorderPoint, invalid ID), and split numeric field parsing explicitly per field
- **Branch:** `bugfix/task-4a-unitcost-parseint` — merged via PR michaelpelea/inventory-management-task#1
- **Commits:** `0e65050` (fix), `b1663b5` (data normalization)

### Task 4B: Scaling Write-up
- **Status:** Done
- **Scope:** Add scaling analysis section to README covering what breaks first and how to evolve the architecture
- **Branch:** `feature/task-4b-scaling-writeup` — merged to main
- **Commit:** `318990c`
- **Coverage:** JSON concurrency failures, transaction gaps, latency at scale; PostgreSQL + Prisma, Redis, MUI X DataGrid (targeted), NextAuth.js, audit log, Sentry, Elasticsearch, rate limiting

### Task 2: Stock Transfer System
- **Status:** Done
- **Scope:** `data/transfers.json`, API endpoints, `/transfers` page, atomic operations
- **Branch:** `feature/task-2-stock-transfers` — merged via PR michaelpelea/inventory-management-task#4
- **What was built:**
  - `src/theme.js` — eco MUI theme (forest green primary, consistent status colors)
  - `src/pages/_app.js` — wrapped with ThemeProvider + CssBaseline
  - `src/lib/api.js` — Axios instance with error interceptor
  - `src/lib/schemas/transfers.js` — Zod schema shared between API and form
  - `src/components/Layout.js` — shared AppBar with active-route highlighting
  - All 10 existing page files migrated to Layout + Axios
  - `data/transfers.json` — empty seed file
  - `src/pages/api/transfers/index.js` — GET (sorted newest-first) + POST (atomic, validated)
  - `src/pages/transfers/index.js` — form with available-stock helper + history table

### Task 3: Low Stock Alert & Reorder System
- **Status:** Not Started
- **Scope:** `data/alerts.json`, API endpoints, `/alerts` page, reorder formula, dashboard integration
- **Open items:**
  - Reorder formula proposed in `06-session-handover.md` -- needs user approval
  - Severity thresholds proposed -- needs user approval

### Task 1: Dashboard Redesign
- **Status:** Not Started
- **Scope:** Charts, metrics cards, responsive layout, loading states, eco theme
- **Open items:**
  - Charting library choice (recharts proposed)
  - Layout design proposed in `06-session-handover.md` -- needs user approval

---

## Cross-Cutting Work (Shared Foundations -- Do Before New Features)

### Axios API Client (`src/lib/api.js`)
- **Status:** Done (delivered as part of Task 2)
- **Scope:** Centralized Axios instance, replaced all 25 raw `fetch()` calls across existing pages

### Shared Layout Component (`src/components/Layout.js`)
- **Status:** Done (delivered as part of Task 2)
- **Scope:** Shared AppBar with active-route highlighting; all 10 existing pages migrated

### Zod Validation Schemas (`src/lib/schemas/`)
- **Status:** Partial — `transfers.js` done; products/warehouses/stock/alerts schemas still pending
- **Notes:** Remaining schemas can be added when each resource's API is revisited

### Custom MUI Theme (`src/theme.js`)
- **Status:** Done (delivered as part of Task 2)
- **Scope:** Forest green primary, consistent error/warning/success/info tokens, touch-friendly button sizing

### Input Validation & Error Handling
- **Status:** Not Started
- **Scope:** Add try-catch + Zod validation to all 6 existing API files + all new endpoints
- **Notes:** Do per-endpoint as we touch each file, not as a separate pass

---

## Open Issues
- None yet

---

## Completed Items
- [2026-04-07] Full codebase analysis completed (`.claude/docs/01-06`)
- [2026-04-07] Implementation plan and session handover documented
- [2026-04-07] CLAUDE.md created
- [2026-04-08] Task 4A complete: `parseFloat` fix + try-catch + validation in `src/pages/api/products/[id].js` — merged via PR #1
- [2026-04-08] `.claude/launch.json` created for dev server config (excluded from git via `.git/info/exclude`)
- [2026-04-08] Task 4B complete: scaling analysis added to `README.md` — merged to main (`318990c`)
- [2026-04-08] Task 2 complete: stock transfer system + all shared foundations merged to main via PR #4
