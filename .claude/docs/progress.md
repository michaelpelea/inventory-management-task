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
- **Status:** Done
- **Scope:** `data/alerts.json`, API endpoints, `/alerts` page, reorder formula, dashboard integration
- **Branch:** `feature/task-3-alerts-reorder` — merged via PR michaelpelea/inventory-management-task#5
- **What was built:**
  - `data/alerts.json` — seed file; persists only manager actions (acknowledge/resolve), not stock state
  - `src/lib/schemas/alerts.js` — Zod schema for PUT status updates
  - `src/pages/api/alerts/index.js` — GET: computes alerts live from stock/products/transfers; severity thresholds (critical ≤25%, low ≤100%, adequate ≤300%, overstocked >300% of reorderPoint); reorder formula with 30-day velocity window and configurable lead time
  - `src/pages/api/alerts/[id].js` — PUT: persists acknowledge/resolve to alerts.json
  - `src/pages/alerts/index.js` — 4 summary cards, lead time input (default 7 days, live recalc), color-coded table, action buttons
  - `src/components/Layout.js` — added Alerts nav link
  - `src/pages/index.js` — alert summary card at top of dashboard (red if critical, green if healthy, links to /alerts)

### Task 1: Dashboard Redesign
- **Status:** Done
- **Scope:** Charts, metrics cards, responsive layout, loading states, eco theme, uniform spacing/typography
- **Branch:** `feature/task-1-dashboard-redesign` — merged via PR michaelpelea/inventory-management-task#6
- **What was built:**
  - 4 metric cards (Stock Alerts, Inventory Value, Products, Warehouses) — Alerts card red/orange/green, links to /alerts
  - Recharts donut chart (stock by category) + horizontal bar chart (stock by warehouse)
  - Recent Transfers section (5 most recent, "View All →" link to /transfers)
  - Enhanced inventory table: search bar, status chips (Critical/Low/In Stock/Overstocked), colored left border on problem rows, bold stock numbers with reorder point context
  - Loading skeletons for all sections while data fetches
  - Error state with Retry button if any API call fails
  - Mobile-first: stacked single column on xs, charts side-by-side at md+
  - Mobile table: SKU hidden xs (shows sm+), Category hidden xs/sm (shows md+) — Name/Stock/Status always visible
  - Fixed PieChart blank render: px radii instead of %, isAnimationActive=false
  - Responsive nav: hamburger + Drawer on mobile (< md), horizontal links on desktop
  - Responsive buttons: `flexWrap + ml:auto` pattern for header action buttons on all list pages
  - Uniform spacing/typography across all 12 pages:
    - All `variant="h4"` page headings: `fontWeight={700} gutterBottom`
    - All section headings: `variant="h6" fontWeight={600} gutterBottom`
    - Container margins: `mt: 4, mb: 4` everywhere
    - List tables: `overflowX: 'auto'` + `px: { xs: 1, sm: 2 }` cell padding
    - Form card: responsive padding `p: { xs: 2, sm: 3, md: 4 }` on Transfers
- **Decisions made:**
  - Alert as 4th metric card (not banner) — confirmed by user
  - Mobile-first layout — confirmed by user

---

## Cross-Cutting Work (Shared Foundations -- Do Before New Features)

### Axios API Client (`src/lib/api.js`)
- **Status:** Done (delivered as part of Task 2)
- **Scope:** Centralized Axios instance, replaced all 25 raw `fetch()` calls across existing pages

### Shared Layout Component (`src/components/Layout.js`)
- **Status:** Done (delivered as part of Task 2)
- **Scope:** Shared AppBar with active-route highlighting; all 10 existing pages migrated

### Zod Validation Schemas (`src/lib/schemas/`)
- **Status:** Done
- **Scope:** All 5 resource schemas complete: `transfers.js`, `alerts.js`, `products.js`, `warehouses.js`, `stock.js`

### Custom MUI Theme (`src/theme.js`)
- **Status:** Done (delivered as part of Task 2)
- **Scope:** Forest green primary, consistent error/warning/success/info tokens, touch-friendly button sizing

### Input Validation & Error Handling
- **Status:** Done
- **Scope:** All API files have try-catch + Zod validation + FK checks + referential integrity
- **Branch:** `feature/polish-validation-error-handling` — in progress
- **What was done:**
  - `products/index.js` — try-catch, Zod validation, duplicate SKU check (409)
  - `products/[id].js` — DELETE referential integrity: blocks delete if stock records exist (409)
  - `warehouses/index.js` — try-catch, Zod validation, duplicate code check (409)
  - `warehouses/[id].js` — try-catch, ID validation, Zod on PUT, duplicate code check, DELETE referential integrity (409)
  - `stock/index.js` — try-catch, Zod validation, FK checks (product + warehouse), duplicate pair check (409)
  - `stock/[id].js` — try-catch, ID validation, Zod on PUT, FK checks, duplicate pair check (excludes self)

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
- [2026-04-09] Task 3 complete: low stock alert & reorder system — merged via PR #5
- [2026-04-09] Task 1 complete: dashboard redesign, responsive nav/buttons, uniform spacing/typography across all 12 pages — merged via PR #6
- [2026-04-09] All core tasks complete — main branch is fully up to date
- [2026-04-09] Polish: Zod schemas + validation + error handling + referential integrity across all API routes — branch feature/polish-validation-error-handling
