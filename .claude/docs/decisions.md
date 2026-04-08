# Decisions Log

History of architecture, logic, and business decisions agreed upon during implementation.

---

## 2026-04-07: Git Branching Strategy

**Decision:** Every task gets its own feature branch off `main`. Always pull `main` before branching.

**Branch naming convention:**
- Bug fixes use `bugfix/` prefix: `bugfix/task-4a-unitcost-parseint`
- Features use `feature/` prefix: `feature/task-2-stock-transfers`, `feature/task-3-alerts-reorder`, `feature/task-1-dashboard-redesign`
- Docs/non-code use `feature/`: `feature/task-4b-scaling-writeup`

**Commit strategy:** One commit = one goal. Never bundle unrelated changes. Each commit should be independently revertable and reviewable.

**Workflow:** `git checkout main && git pull` -> `git checkout -b bugfix/<task>` or `feature/<task>` -> implement with atomic commits -> user reviews -> merge

---

## 2026-04-07: Implementation Order

**Decision:** Execute tasks in order: 4A (bug fix) -> 4B (scaling write-up) -> 2 (transfers) -> 3 (alerts) -> 1 (dashboard redesign)

**Rationale:**
- Bug fix first because all calculations depend on correct `unitCost` values
- Scaling write-up second because architecture understanding is fresh from bug investigation
- Transfers before alerts because alert system needs transfer velocity data
- Dashboard last because it's pure UI with no downstream dependencies, and benefits from having all features to display

---

## 2026-04-07: Security Scope

**Decision:** Focus on practical security baked into core work. Skip auth, rate limiting, CSRF, security headers, file locking.

**What we WILL do:**
- Input validation on all API endpoints (new and existing)
- Error handling (try-catch) in all API routes
- Referential integrity checks on deletes
- Atomic transfer operations

**What we WON'T do (and why):**
- Authentication/login -- not needed for assessment scope
- Rate limiting -- single-user context
- CSRF tokens -- assessment context
- Security headers -- deployment concern
- File locking -- single-user, mention in scaling write-up instead

---

## 2026-04-08: Dependencies -- Core Adoptions

**Decision:** Adopt Axios, Zod, dayjs, and Recharts as core dependencies.

**Axios (`src/lib/api.js`):**
- Centralize all API calls through a single Axios instance
- 25 raw `fetch()` calls exist with zero shared error handling -- this is unsustainable as we add transfers + alerts + dashboard
- Refactor existing fetch calls as we touch each file (not a separate pass)
- Provides: interceptors for error handling, base URL config, cleaner syntax

**Zod (`src/lib/schemas/<resource>.js`):**
- One schema file per resource (products, warehouses, stock, transfers, alerts)
- Shared validation logic across API endpoints instead of hand-rolled if-checks

**dayjs:**
- UTC-consistent timestamps for all new records (transfers, alerts)
- Date math for velocity calculation (30-day window)
- Display formatting

**Recharts:**
- Dashboard charts (pie, bar, line)

---

## 2026-04-08: Table Strategy

**Decision:** Use MUI `Table` for all current tables. Switch to `@mui/x-data-grid` only when a table needs to render 500+ rows.

**Rationale:** Our current data is 5 products, 3 warehouses, 10 stock records. Even at moderate growth, we won't hit 500 rows soon. MUI Table is simpler, lighter, and already used throughout the codebase. Document x-data-grid as a scale-up consideration.

---

## 2026-04-08: UI/UX Design Principles

**Decision:** Design for non-technical warehouse managers who may have minimal computer experience. Clean, clear, impossible to misuse.

**Target user profile:**
- Warehouse floor managers, not developers
- May use desktop in office or tablet on warehouse floor
- Need to glance at a screen and immediately know what needs attention
- Should never wonder "what does this button do?" or "did that work?"

**Core UX principles:**

1. **Big, obvious actions** -- Primary buttons are large, high-contrast, and labeled with verbs ("Transfer Stock", "Create Alert", not "Submit"). Destructive actions (Delete) are red and require confirmation dialogs with plain-language warnings ("This will permanently remove this product. Are you sure?")

2. **Color-coded status everywhere** -- Don't rely on text alone. Use consistent color language across ALL pages:
   - Red = Critical / Error / Destructive
   - Orange/Amber = Warning / Low stock
   - Green = Healthy / Success / In stock
   - Blue = Informational / Neutral

3. **Plain language, no jargon** -- Labels say "Reorder Point" not "ROP". Error messages say "Not enough stock in Newark warehouse (available: 50, requested: 100)" not "Insufficient source quantity". Success messages say "Transfer complete! 50 units moved from Newark to Los Angeles."

4. **Visual feedback for every action** -- Snackbar confirmation after every create/update/delete/transfer. Loading spinners during API calls. Disabled buttons while processing (prevent double-clicks). Never leave the user wondering "did it work?"

5. **Guided forms** -- Dropdowns instead of free-text where possible (warehouse selection, product selection, category). Show helper text on fields ("How many units to transfer"). Show available stock next to quantity input so they know the limit.

6. **Clear navigation** -- Active page highlighted in nav bar. Breadcrumb-style awareness of where they are. Consistent back/cancel buttons that go where expected.

7. **Scannable data** -- Tables are clean with good spacing. Important numbers (stock count, value) are bold and large. Low stock rows are visually distinct (background color + icon). No information overload -- progressive disclosure where needed.

8. **Eco-friendly theme** -- No brand guidelines provided in requirements. README only says "modern, professional UI appropriate for a sustainable/eco-friendly company." Our design decision:
   - Clean white backgrounds with green accents (not heavy green -- readability first)
   - Natural, calming feel appropriate for a sustainability brand
   - Color palette defined in `src/theme.js` (see session handover for hex values)

9. **Mobile-first responsive** -- Design for mobile FIRST, then enhance for larger screens. This means:
   - Start with single-column layouts, stack cards vertically
   - Charts must be readable and touch-friendly on phone screens (no tiny labels, no hover-only tooltips)
   - Tables: horizontal scroll on mobile, NOT cramped columns
   - Forms: full-width inputs, large touch targets (min 44px tap areas)
   - Test at 375px width (iPhone SE) as the baseline
   - Scale up: 2-column at `sm` (600px), 3-4 column at `md`/`lg`

10. **Dashboard prioritizes actionables** -- The dashboard is NOT a data dump. It answers one question: "What needs my attention right now?"
   - **Top priority**: Alert/action cards (critical stock, pending actions) -- these are the first thing visible
   - **Second**: Key metrics (inventory value, warehouse count) -- quick health check
   - **Third**: Charts and detailed tables -- only for users who want to dig deeper
   - Design principle: if a card doesn't drive an action, it goes lower on the page

11. **Forgiveness** -- Confirmation before destructive actions. Clear undo path where possible. Validation errors shown inline next to the field, not as a generic toast.

---

## 2026-04-08: Modularity & Shared Schema Strategy

**Decision:** Prioritize modularity and maintainability. Zod schemas are shared between frontend and backend.

**Schema reuse pattern:**
- Define schemas in `src/lib/schemas/<resource>.js`
- Backend: import schema in API route, call `schema.parse(req.body)` or `schema.safeParse(req.body)`
- Frontend: import same schema in form page, validate before submit, show inline field errors
- One source of truth for field rules (required, type, min, max) -- no drift between FE and BE

**Modular structure:**
```
src/
├── lib/
│   ├── api.js               # Axios instance (centralized API client)
│   └── schemas/
│       ├── products.js       # Product validation rules
│       ├── warehouses.js     # Warehouse validation rules
│       ├── stock.js          # Stock validation rules
│       ├── transfers.js      # Transfer validation rules
│       └── alerts.js         # Alert validation rules
├── components/
│   └── Layout.js             # Shared AppBar + navigation
├── theme.js                  # MUI theme (eco palette)
└── pages/                    # Pages and API routes (unchanged structure)
```

**Why this matters:**
- Adding a new required field means changing ONE schema file -- both FE and BE pick it up
- Axios client means error handling is defined once, not 25+ times
- Layout component means nav changes happen in one place
- Theme file means design tokens are centralized

---

## 2026-04-09: Alerts — Computed vs Persisted Design

**Decision:** Alerts are fully computed on every GET from live stock data. Only manager actions (acknowledge/resolve) are persisted in `alerts.json`.

**Rationale:** Storing pre-computed alert state would require keeping it in sync with stock changes. Computing on the fly guarantees accuracy — severity always reflects current stock. The only thing worth persisting is human intent (did someone act on this?).

**Tradeoff:** A "Resolved" status does not auto-reset if stock drops again. Manager must re-resolve. This mirrors real alert system behaviour — silent auto-reset would hide recurring problems.

**Acknowledge vs Resolve:** Both are status labels only — no automated side effects. Acknowledge = "I've seen this", Resolve = "I've acted on this". Future work could trigger purchase orders or supplier emails on Resolve.

---

## 2026-04-09: Reorder Formula

**Decision:** `recommendedQty = max(0, (reorderPoint * 1.5) - currentStock + (dailyVelocity * leadTimeDays))`

- Safety multiplier 1.5: restock to 150% of reorder point as buffer above minimum
- dailyVelocity: outbound transfer units over last 30 days ÷ 30 (new products default to 0)
- leadTimeDays: configurable per session via UI input (default 7), not persisted
- Velocity is based on transfers between warehouses, not external sales — acknowledged limitation

---

## 2026-04-07: Code Standards

**Decision:** Follow YAGNI, DRY, KISS principles. No over-engineering.

**Specifics agreed:**
- Extract duplicated AppBar into shared Layout component (DRY)
- Add comments explaining *why*, document formulas and business logic
- Server-side validation on all endpoints
- Try-catch in all API handlers
- No features beyond what's explicitly required
