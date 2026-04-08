# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-Warehouse Inventory Management System for GreenSupply Co (eco-friendly product distributor). Next.js 15 + Material-UI 6 + JSON file storage. No database -- all persistence is via `fs.readFileSync`/`fs.writeFileSync` to `data/*.json` files.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint (Next.js config)
```

No test framework is configured. No CI/CD pipeline exists.

## Architecture

```
Frontend (React Pages)  -->  API Routes (src/pages/api/*)  -->  JSON Files (data/*.json)
```

- **Pages Router** (not App Router): All routes live in `src/pages/`
- **API Routes**: `src/pages/api/[resource]/index.js` for list/create, `[id].js` for get/update/delete
- **Data Layer**: Direct `fs` calls in every API handler -- no shared data access layer
- **No shared layout**: AppBar is duplicated in every page file
- **Path alias**: `@/*` maps to `./src/*` (see `jsconfig.json`)

### Data Model

Three JSON files in `data/`:
- **products.json**: `{ id, sku, name, category, unitCost (decimal), reorderPoint (int) }`
- **warehouses.json**: `{ id, name, location, code }`
- **stock.json**: `{ id, productId, warehouseId, quantity }` -- junction table, no FK enforcement

ID generation: `Math.max(...existingIds) + 1`

### Known Architectural Limitations

- Read-modify-write on JSON files is NOT atomic and NOT thread-safe
- No referential integrity -- deleting a product leaves orphaned stock records
- No input validation on any API endpoint
- No error handling (try-catch) in API routes
- `unitCost` is a decimal but was being truncated by `parseInt` (planted bug in `src/pages/api/products/[id].js:26` -- see `.claude/docs/02-planted-bug.md`)

## Mandatory Workflow Rules

**These rules apply to every task, every session. Non-negotiable.**

1. **Read `.claude/docs/` before any feature or bugfix.** Start with `06-session-handover.md` for implementation context, then the relevant doc for the current task.

2. **Read `.claude/docs/decisions.md`, `progress.md`, and `learnings.md` before starting any task** and during blockers. These are the living project memory.

3. **Nothing is complete until the user manually tests and approves.** Do not mark tasks as done. Implement, then hand off for user testing.

4. **Always ask questions for clarification** -- even mid-implementation. Do not make assumptions about business logic, UI behavior, or architectural decisions.

5. **Git branching per task.** Before starting any task:
   - Ensure `main` is up to date: `git checkout main && git pull`
   - Create a branch from `main` with the appropriate prefix:
     - Bug fixes: `bugfix/task-4a-unitcost-parseint`
     - Features: `feature/task-2-stock-transfers`
   - Never work directly on `main`

6. **Atomic commits.** One commit = one goal. Never bundle unrelated changes into a single commit. This makes it easy to revert, review, and trace implementations. Examples:
   - `fix: use parseFloat for unitCost in product update API`
   - `feat: add shared Layout component with navigation`
   - `feat: add Zod product validation schema`
   - NOT: `fix bug, add layout, update validation, refactor forms` (too many things)

7. **Update these docs at end of every session or task completion:**
   - `.claude/docs/progress.md` -- What was implemented, what's pending, open issues
   - `.claude/docs/decisions.md` -- Any architecture, logic, or business decisions agreed upon
   - `.claude/docs/learnings.md` -- Solutions to tricky issues, gotchas, patterns that worked

## UI/UX Principles

Designing for non-technical warehouse managers. See `.claude/docs/decisions.md` for full rules.

- **Big, obvious actions** -- Large buttons with verb labels ("Transfer Stock", not "Submit"). Destructive actions are red with confirmation dialogs.
- **Color-coded status** -- Red = critical/error, Orange = warning/low, Green = healthy/success, Blue = info. Consistent across every page.
- **Plain language** -- No jargon. Error messages explain what happened and what to do. ("Not enough stock in Newark warehouse. Available: 50, requested: 100.")
- **Visual feedback for every action** -- Snackbar after every operation. Loading spinners during API calls. Disabled buttons while processing.
- **Guided forms** -- Dropdowns over free-text. Helper text on fields. Show available stock next to quantity inputs.
- **Scannable data** -- Bold numbers, colored status chips, highlighted problem rows. Manager answers "what needs attention?" in 3 seconds.
- **Mobile-first** -- Design for phone/tablet first (375px baseline), enhance for desktop. Charts readable without zoom. Touch targets min 44px. Tables scroll horizontally, never cramped.
- **Actionables first** -- Dashboard top section shows what needs attention (alerts, critical stock). Health metrics second. Charts and detail tables below. If it doesn't drive an action, it goes lower.
- **Clean eco theme** -- White backgrounds with green accents (no brand spec provided, our design decision). Not heavy green. Professional, readable, calming.

## Code Standards

- **YAGNI**: Don't build what isn't needed yet
- **DRY**: Extract shared patterns (e.g., the duplicated AppBar should become a Layout component)
- **KISS**: Simplest solution that works. No abstractions for single-use logic
- **Comments**: Add comments explaining *why*, not *what*. Document business logic, formulas, and non-obvious decisions
- **Validation**: All new API endpoints must validate input server-side (required fields, types, FK references)
- **Error handling**: All API routes must have try-catch with proper error responses

## Implementation Order

See `.claude/docs/05-implementation-order.md` for the full dependency graph. Summary:

1. **Task 4A**: Bug fix (`parseInt` -> `parseFloat` for `unitCost`)
2. **Task 4B**: Scaling write-up in README
3. **Task 2**: Stock transfer system (API + page + atomicity)
4. **Task 3**: Low stock alert & reorder system (formula + API + page)
5. **Task 1**: Dashboard redesign (charts + responsive + metrics) -- last because it benefits from all other features being in place

## Key Documentation

All detailed analysis and implementation plans live in `.claude/docs/`:

| File | Purpose |
|------|---------|
| `01-codebase-analysis.md` | Architecture, file structure, data model |
| `02-planted-bug.md` | Bug trace, impact, fix |
| `03-security-issues.md` | What to fix vs skip, with rationale |
| `04-core-vs-bonus.md` | Required tasks vs optional enhancements |
| `05-implementation-order.md` | Task sequence with dependency graph |
| `06-session-handover.md` | Step-by-step implementation guide with code |
| `07-scaleup-considerations.md` | Future plugins with adoption triggers, complexity, trade-offs |
| `decisions.md` | Architecture/logic/business decisions log |
| `progress.md` | Implementation tracker with status and open items |
| `learnings.md` | Solutions to tricky issues, reusable patterns |
