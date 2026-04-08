# Session Handover: Implementation Guide

## Context
This is a Multi-Warehouse Inventory Management System (Next.js 15 + MUI 6 + JSON file storage) that needs 4 enhancement tasks completed. The codebase has been fully analyzed. All documentation is in `.claude/docs/`.

## Pre-Implementation Checklist
- [ ] Read all docs in `.claude/docs/` (01 through 05)
- [ ] Run `npm install && npm run dev` to verify the app starts
- [ ] Open `http://localhost:3000` and click through all pages to understand current UI
- [ ] Edit a product (e.g., Bamboo Spork Set) and observe the unitCost corruption on the dashboard

---

## Step 1: Task 4A -- Fix the Bug (~30 min)

### What to Do
1. Open `src/pages/api/products/[id].js`
2. Line 26: Change `parseInt` to `parseFloat` for `unitCost`

### Recommended Fix
Replace lines 21-28:
```javascript
// Before (buggy):
const numericFields = ['unitCost', 'reorderPoint'];
const sanitizedData = { ...req.body };
numericFields.forEach(field => {
  if (sanitizedData[field] !== undefined) {
    sanitizedData[field] = parseInt(sanitizedData[field]);
  }
});

// After (fixed):
const sanitizedData = { ...req.body };
if (sanitizedData.unitCost !== undefined) {
  sanitizedData.unitCost = parseFloat(sanitizedData.unitCost);
}
if (sanitizedData.reorderPoint !== undefined) {
  sanitizedData.reorderPoint = parseInt(sanitizedData.reorderPoint);
}
```

### Verify
1. Check `data/products.json` -- note current unitCost values (2.50, 0.85, 0.30, 0.45, 0.60)
2. Edit any product via the UI, change the name, save
3. Check `data/products.json` -- unitCost should be preserved as decimal
4. Dashboard total inventory value should remain correct

### Also Fix: Add validation to the same endpoint
While in this file, add try-catch and basic validation:
```javascript
export default function handler(req, res) {
  try {
    // ... existing logic with the parseInt fix ...
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}
```

---

## Step 2: Task 4B -- Scaling Write-up (~30 min)

### What to Write
Add to the bottom of `README.md`:

**Topics to cover:**
1. **What breaks first:** JSON file storage -- `fs.readFileSync`/`fs.writeFileSync` blocks the event loop, no concurrent access, entire file read/written for every operation. At 10k products, each request reads/parses the full file. Race conditions cause data loss with 50 concurrent users.

2. **How to evolve:**
   - Replace JSON files with PostgreSQL (or similar RDBMS) -- transactions, concurrent access, indexes, referential integrity
   - Add connection pooling (pg-pool)
   - Add Redis for caching frequently-accessed data (product lookups, dashboard metrics)
   - Move to proper ORM (Prisma) for type safety and migrations
   - Add authentication (NextAuth.js) and role-based access
   - Consider message queue (Bull/BullMQ) for transfer operations at scale
   - Horizontal scaling with stateless API + shared database

---

## Step 3: Task 2 -- Stock Transfer System (~5-6 hrs)

### 3A: Design the Data Schema

Create `data/transfers.json`:
```json
[]
```

Transfer record structure:
```json
{
  "id": 1,
  "productId": 1,
  "sourceWarehouseId": 1,
  "destinationWarehouseId": 2,
  "quantity": 50,
  "status": "completed",
  "notes": "Restocking West Coast",
  "createdAt": "2026-04-07T10:30:00.000Z"
}
```

### 3B: Build API Endpoints

**File: `src/pages/api/transfers/index.js`**

`GET /api/transfers` -- Return all transfers (sorted by date, newest first)

`POST /api/transfers` -- Create a transfer:
1. Validate required fields: `productId`, `sourceWarehouseId`, `destinationWarehouseId`, `quantity`
2. Validate `sourceWarehouseId !== destinationWarehouseId`
3. Validate `quantity > 0`
4. Validate product exists (read `products.json`)
5. Validate both warehouses exist (read `warehouses.json`)
6. **Atomic operation:**
   a. Read `stock.json` once
   b. Find source stock record (productId + sourceWarehouseId)
   c. Verify source has enough quantity
   d. Deduct from source in memory
   e. Find or create destination stock record (productId + destinationWarehouseId)
   f. Add to destination in memory
   g. Write `stock.json` once (single atomic write)
7. Record transfer in `transfers.json`
8. Return the transfer record

**File: `src/pages/api/transfers/[id].js`** (optional -- GET single transfer)

### 3C: Build the Transfer Page

**File: `src/pages/transfers/index.js`**

**UX goals:** A warehouse manager should be able to complete a transfer in under 30 seconds. The form guides them step-by-step. Errors are impossible to miss.

Layout:
- Shared Layout (via `src/components/Layout.js`)
- **Transfer Form** (Card with clear heading "Transfer Stock Between Warehouses"):
  - Product dropdown (fetched from `/api/products`) -- show product name + SKU
  - Source Warehouse dropdown (fetched from `/api/warehouses`) -- show name + location
  - Destination Warehouse dropdown (filtered to exclude selected source -- prevents same-to-same mistake)
  - **Available stock helper**: after selecting product + source, show "Available: 250 units" next to quantity field so they know the limit
  - Quantity input (number, min 1) -- helper text: "How many units to transfer"
  - Notes input (optional text) -- helper text: "Optional: reason for transfer"
  - **"Transfer Stock" button** (large, primary green, verb-labeled)
  - Inline Zod validation errors per field (red text below field)
  - Snackbar on success: "Transfer complete! 50 units moved from Newark to Los Angeles."
  - Snackbar on error: plain-language message (e.g., "Not enough stock. Newark only has 30 units available.")
- **Transfer History Table** (below form, separate section):
  - Heading: "Transfer History"
  - Columns: Date, Product, From → To, Quantity, Status, Notes
  - Sorted by date (newest first)
  - Resolve product/warehouse names from IDs (never show raw IDs to the user)
  - Status chip: green "Completed"
  - Empty state: "No transfers yet. Use the form above to move stock between warehouses."

### 3D: Update Navigation
Add "Transfers" link to the AppBar in all existing pages. Files to update:
- `src/pages/index.js`
- `src/pages/products/index.js`, `add.js`, `edit/[id].js`
- `src/pages/warehouses/index.js`, `add.js`, `edit/[id].js`
- `src/pages/stock/index.js`, `add.js`, `edit/[id].js`

**Consider:** Extract AppBar into a shared layout component to avoid updating 9+ files every time navigation changes.

### 3E: Atomicity Documentation
Add code comments explaining the atomic approach:
```javascript
// ATOMICITY: Both stock changes (deduct source, credit destination) are made
// in memory before a single write to stock.json. If validation fails at any
// point, we return an error without writing -- no partial updates possible.
// The transfer record is written to transfers.json only after stock.json
// is successfully updated.
```

---

## Step 4: Task 3 -- Low Stock Alert & Reorder System (~5-6 hrs)

### 4A: Design Alert Data Schema

Create `data/alerts.json`:
```json
[]
```

Alert record structure:
```json
{
  "id": 1,
  "productId": 1,
  "status": "active",
  "severity": "low",
  "totalStock": 400,
  "reorderPoint": 100,
  "recommendedQuantity": 150,
  "createdAt": "2026-04-07T10:30:00.000Z",
  "updatedAt": "2026-04-07T10:30:00.000Z",
  "acknowledgedAt": null,
  "resolvedAt": null
}
```

### 4B: Define Stock Status Categories

| Category | Condition |
|----------|-----------|
| Critical | totalStock <= reorderPoint * 0.25 |
| Low | totalStock <= reorderPoint |
| Adequate | totalStock > reorderPoint AND totalStock <= reorderPoint * 3 |
| Overstocked | totalStock > reorderPoint * 3 |

These thresholds are reasonable defaults. Document them and make them easy to adjust.

### 4C: Reorder Quantity Formula

```
recommendedQuantity = max(0, (reorderPoint * safetyMultiplier) - currentStock + (dailyVelocity * leadTimeDays))
```

Where:
- `currentStock` = sum of quantity across all warehouses for this product
- `reorderPoint` = product's reorderPoint field
- `safetyMultiplier` = 1.5 (bring stock to 150% of reorder point)
- `dailyVelocity` = total units transferred out per day (from transfer history)
  - Calculate: sum of transfer quantities for this product / number of days in history window
  - Default window: 30 days
  - Edge case: new products with no history -> velocity = 0, formula still works
  - Edge case: zero velocity -> just restock to safety level
- `leadTimeDays` = configurable, default 7 days

**Document assumptions in code comments.**

### 4D: Build API Endpoints

**File: `src/pages/api/alerts/index.js`**

`GET /api/alerts` -- Calculate and return current alerts:
1. Read products, stock, and transfers
2. For each product:
   a. Calculate total stock across all warehouses
   b. Determine severity category
   c. If low or critical, calculate recommended reorder quantity
3. Return alerts sorted by severity (critical first)

`POST /api/alerts` -- Create/update alert status (acknowledge, resolve, etc.)

**File: `src/pages/api/alerts/[id].js`**

`PUT /api/alerts/[id]` -- Update alert (change status, acknowledge, resolve)

### 4E: Build the Alerts Page

**File: `src/pages/alerts/index.js`**

**UX goals:** Manager opens this page to answer: "What's running low and what should I order?" Everything is color-coded so critical items scream for attention. Recommended reorder quantities are shown so the manager doesn't have to calculate anything.

Layout:
- Shared Layout
- **Summary cards at top** (4 cards, same style as dashboard):
  - Red card: "X Critical" (count of critical alerts)
  - Orange card: "X Low Stock" (count of low alerts)
  - Green card: "X Adequate" (count of healthy products)
  - Blue card: "X Overstocked" (count of overstocked)
  - These give an instant pulse check before looking at the table
- **Controls row:**
  - Lead time input: "Reorder Lead Time (days)" with number field, default 7 -- helper text: "How many days until a new order arrives"
  - Severity filter: Tabs or chip toggles (All | Critical | Low | Adequate | Overstocked)
- **Alert table:**
  - Columns: Product Name, SKU, Total Stock, Reorder Point, Severity, Recommended Order Qty, Status, Actions
  - **Severity chip**: red "Critical", orange "Low", green "Adequate", blue "Overstocked"
  - **Recommended Order Qty**: bold number -- this is the actionable insight ("Order 1,500 units")
  - **Status**: Active / Acknowledged / Resolved
  - **Action buttons**: "Acknowledge" (I've seen this), "Resolve" (order placed)
  - Sort by severity by default (critical first)
  - Rows with critical status have subtle red left border or tinted background
- **Empty state**: "All products are adequately stocked. No action needed."

### 4F: Integrate Alerts into Dashboard
On the dashboard (src/pages/index.js):
- Alert metric card shows count of critical + low items
- If any critical alerts: card background turns red/pink, text says "X items need attention"
- If no alerts: card background stays green, text says "All stock healthy"
- Card is clickable -- links to /alerts page
- This is the "call to action" card -- most prominent position on the dashboard

### 4G: Update Navigation
Add "Alerts" link to AppBar in all pages.

---

## Step 5: Task 1 -- Dashboard Redesign (~4-5 hrs)

### 5A: Install Charting Library
```bash
npm install recharts
```
(Recharts is the most popular React charting library, works well with MUI)

### 5B: Design the Dashboard Layout

**Design for non-techy warehouse managers. See `decisions.md` "UI/UX Design Principles" for full rules.**

**Key UX goals for dashboard:**
- Manager opens this every morning -- must answer "what needs my attention?" in 3 seconds
- Big, scannable numbers on metrics cards (bold, large font)
- Color-coded everything: red = problem, green = healthy, orange = warning
- Alert card is the attention-grabber: red background if critical alerts exist, links directly to /alerts
- Charts are visual summaries, not data dumps -- clean labels, tooltips on hover
- Inventory table highlights problem rows visually (colored left border or background)

**Mobile-first responsive layout (design mobile first, enhance for desktop):**

```
Mobile (xs/sm) -- THE BASELINE:
┌───────────────────────┐
│ ⚠ Stock Alerts        │  ← Actionable FIRST
│   2 items need        │
│   attention           │
│   [View Alerts →]     │
├───────────────────────┤
│ Inventory  │ Products │  ← Quick health check
│ Value      │ Count    │
│ $4,377     │   5      │
├───────────────────────┤
│ Warehouses │          │
│ Count      │          │
│   3        │          │
├───────────────────────┤
│ Stock by Category     │  ← Visual summary
│ (Donut Chart)         │
│ Touch-friendly,       │
│ large labels          │
├───────────────────────┤
│ Stock by Warehouse    │
│ (Horizontal Bar)      │
│ Full-width bars,      │
│ readable labels       │
├───────────────────────┤
│ Recent Transfers      │  ← Activity feed
│ (3-5 most recent)     │
│ [View All →]          │
├───────────────────────┤
│ Inventory Overview    │  ← Detailed dig-in
│ 🔍 [Search...]        │
│ (Horizontal scroll)   │
│ Colored status chips  │
└───────────────────────┘

Desktop (lg) -- ENHANCED:
┌──────────┬──────────┬──────────┬──────────┐
│ ⚠ Stock  │ Inventory│ Total    │ Active   │
│ Alerts   │ Value    │ Products │Warehouses│
│ [View →] │ $4,377   │   5      │   3      │
├──────────┴──────────┼──────────┴──────────┤
│ Stock by Category   │ Stock by Warehouse  │
│ (Donut Chart)       │ (Bar Chart)         │
├─────────────────────┴─────────────────────┤
│ Recent Transfers (5 most recent)           │
│ Date | Product | From → To | Qty | Status │
│ [View All Transfers →]                     │
├───────────────────────────────────────────┤
│ Inventory Overview                         │
│ 🔍 [Search products...]                   │
│ Sortable columns, colored status chips    │
└───────────────────────────────────────────┘
```

**Key mobile-first rules:**
- Charts: min-height so they're not squished, labels large enough to read without zooming
- Tables: horizontal scroll wrapper, NOT cramped columns. Key columns (Name, Stock, Status) visible first
- Touch targets: all buttons/links min 44px height
- Cards: full-width stacked, generous padding
- Test at 375px width (iPhone SE) as baseline

### 5C: Key Metrics Cards
Design: Large number, descriptive label below, subtle icon. Clean white card with slight elevation.
1. **Total Products** -- count, CategoryIcon
2. **Active Warehouses** -- count, WarehouseIcon
3. **Total Inventory Value** -- formatted currency ($4,377.50), InventoryIcon
4. **Stock Alerts** -- count of critical + low, colored background if any exist, links to /alerts page. This is the "attention card" -- visually distinct when there are problems.

### 5D: Charts
1. **Stock Distribution by Category** (Donut chart)
   - Group products by category, sum quantities
   - Clean legend below chart with category colors
   - Center label: total units
2. **Stock by Warehouse** (Horizontal bar chart)
   - Warehouse names as y-axis labels (readable, no truncation)
   - Total units per warehouse as bars
   - Consistent green tones

### 5E: Enhanced Inventory Table
- **Search bar** at top: "Search by product name or SKU..." (placeholder text guides the user)
- **Sortable columns**: click header to sort, arrow indicator shows direction
- **Status chips** instead of plain text: MUI Chip with color + label
  - Green chip: "In Stock"
  - Orange chip: "Low Stock"
  - Red chip: "Critical"
- **Bold stock numbers** so they're scannable
- **Reorder point** shown next to stock for context ("250 / 100" = quantity / reorder point)

### 5F: Loading States & Error Handling
- MUI Skeleton components for every card and chart while data loads
- If API call fails: friendly error message ("Unable to load dashboard data. Please refresh the page.") with a Retry button
- Never show a blank screen or technical error to the user

### 5G: Eco/Sustainable Theme (`src/theme.js`)
- **Primary**: Forest green (#2E7D32 or similar) -- buttons, active nav, links
- **Secondary**: Warm earth tone (#8D6E63 or similar) -- accents
- **Background**: Clean white (#FAFAFA) -- not heavy green, which kills readability
- **Surface**: White cards with subtle shadow
- **Error**: Red (#D32F2F), Warning: Amber (#F57C00), Success: Green (#388E3C), Info: Blue (#1976D2)
- **Typography**: Clean sans-serif, generous line height, readable at arm's length
- **Spacing**: Generous padding in cards and table cells -- no cramped layouts
- **Border radius**: Slightly rounded (8px) -- modern, approachable feel

---

## Shared Foundations (Do Early, Before New Features)

### 1. Axios API Client
**File: `src/lib/api.js`** (new)
```javascript
// Centralized Axios instance with base config and error interceptors
// All frontend API calls go through this instead of raw fetch()
// Provides consistent error handling across every page
```
- Create Axios instance with base URL
- Add response interceptor for error handling
- Export helper methods: `api.get()`, `api.post()`, `api.put()`, `api.delete()`
- Refactor existing 25 `fetch()` calls as we touch each page file

### 2. Shared Layout Component
**File: `src/components/Layout.js`** (new)
```jsx
// Shared layout with AppBar + navigation
// Used by all pages to avoid duplicating the nav bar
// Include links: Dashboard, Products, Warehouses, Stock, Transfers, Alerts
```
Then wrap each page with this layout. This avoids updating 9+ files every time you add a nav link.

### 3. Validation Schemas (One Per Resource, Shared FE + BE)
```
src/lib/schemas/
├── products.js      # productSchema, productUpdateSchema
├── warehouses.js    # warehouseSchema, warehouseUpdateSchema
├── stock.js         # stockSchema, stockUpdateSchema
├── transfers.js     # transferSchema
└── alerts.js        # alertUpdateSchema
```

**Key pattern -- single schema, two enforcement points:**
```javascript
// src/lib/schemas/products.js
import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  unitCost: z.number().positive('Unit cost must be positive'),
  reorderPoint: z.number().int().nonnegative('Reorder point must be 0 or greater'),
});

// Backend usage (API route):
// const result = productSchema.safeParse(req.body);
// if (!result.success) return res.status(400).json({ errors: result.error.flatten().fieldErrors });

// Frontend usage (form page):
// const result = productSchema.safeParse(formData);
// if (!result.success) setFieldErrors(result.error.flatten().fieldErrors);
```

### 4. Custom MUI Theme
**File: `src/theme.js`** (new)
- Eco-friendly green palette
- Consistent typography and spacing
- Wrap app with `ThemeProvider` in `_app.js`

---

## Files to Create (New)

| File | Purpose |
|------|---------|
| `src/lib/api.js` | Centralized Axios instance for all API calls |
| `src/lib/schemas/products.js` | Zod schema for product validation |
| `src/lib/schemas/warehouses.js` | Zod schema for warehouse validation |
| `src/lib/schemas/stock.js` | Zod schema for stock validation |
| `src/lib/schemas/transfers.js` | Zod schema for transfer validation |
| `src/lib/schemas/alerts.js` | Zod schema for alert validation |
| `src/theme.js` | Custom MUI theme (eco-friendly palette) |
| `src/components/Layout.js` | Shared layout with AppBar |
| `data/transfers.json` | Transfer history records |
| `data/alerts.json` | Alert tracking records |
| `src/pages/api/transfers/index.js` | GET/POST transfers API |
| `src/pages/api/transfers/[id].js` | GET single transfer API |
| `src/pages/api/alerts/index.js` | GET/POST alerts API |
| `src/pages/api/alerts/[id].js` | PUT alert status API |
| `src/pages/transfers/index.js` | Transfers page (form + history) |
| `src/pages/alerts/index.js` | Alerts page (table + management) |

## Files to Modify (Existing)

| File | Change |
|------|--------|
| `src/pages/api/products/[id].js` | Fix parseInt bug, add try-catch, Zod validation |
| `src/pages/api/products/index.js` | Add try-catch, Zod validation |
| `src/pages/api/warehouses/index.js` | Add try-catch, Zod validation |
| `src/pages/api/warehouses/[id].js` | Add try-catch, referential integrity on delete, Zod validation |
| `src/pages/api/stock/index.js` | Add try-catch, Zod validation, FK reference checks |
| `src/pages/api/stock/[id].js` | Add try-catch, Zod validation |
| `src/pages/index.js` | Complete redesign (Task 1) |
| `src/pages/_app.js` | Wrap with ThemeProvider |
| All page files | Wrap with shared Layout, replace fetch() with Axios api client |
| `package.json` | Add recharts, zod, dayjs, axios |
| `README.md` | Add scaling write-up + implementation notes |

---

## Verification Checklist

After each task, verify:

### After Bug Fix (Task 4A)
- [ ] Edit a product with decimal unitCost (e.g., Bamboo Spork Set @ $2.50)
- [ ] Verify `data/products.json` preserves decimal value
- [ ] Verify dashboard total inventory value is correct

### After Scaling Write-up (Task 4B)
- [ ] README has 1-2 paragraphs addressing: what breaks first, how to evolve, specific technologies

### After Transfers (Task 2)
- [ ] Create a transfer: 50 units of Bamboo Spork Set from Newark to LA
- [ ] Verify source stock decreased by 50
- [ ] Verify destination stock increased by 50
- [ ] Verify transfer appears in history
- [ ] Test error: transfer more than available stock -> should fail gracefully
- [ ] Test error: same source and destination -> should be rejected
- [ ] Test error: invalid product/warehouse ID -> should return 400

### After Alerts (Task 3)
- [ ] Visit /alerts page -- products below reorder point show as critical/low
- [ ] Verify reorder quantity formula produces reasonable values
- [ ] Change lead time -- recommended quantities should change
- [ ] Acknowledge an alert -- status should update
- [ ] Dashboard shows alert count/summary

### After Dashboard Redesign (Task 1)
- [ ] Charts render with real data
- [ ] Responsive: resize browser to mobile width -- layout adapts
- [ ] Loading skeletons appear briefly on page load
- [ ] All metrics cards show correct values
- [ ] Alert widget links to /alerts page
- [ ] Transfer activity visible (if implemented)
