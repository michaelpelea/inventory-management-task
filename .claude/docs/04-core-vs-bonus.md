# Core Requirements vs Bonus Features

## CORE REQUIREMENTS (Must complete -- README says "Complete ALL 4")

### Task 4A: Bug Fix
- Find the planted `parseInt` bug in `src/pages/api/products/[id].js:26`
- Fix it (`parseInt` -> `parseFloat` for `unitCost`)
- Document debugging process

### Task 4B: Scaling Write-up
- 1-2 paragraphs in README
- What breaks first at 500 warehouses, 10k products, 50 concurrent users
- How to evolve the system, what technologies/patterns to introduce

### Task 2: Stock Transfer System
- `data/transfers.json` -- new data file for transfer records
- `POST /api/transfers` -- create transfer with validation
- `GET /api/transfers` -- retrieve transfer history
- Atomic stock updates (deduct source + credit destination in single write)
- `/transfers` page -- form to initiate transfers + history table
- Error handling and user feedback

### Task 3: Low Stock Alert & Reorder System
- `data/alerts.json` -- new data file for alert tracking
- Alert categorization: critical / low / adequate / overstocked
- Reorder quantity formula factoring in:
  - Current total stock across all warehouses
  - Product's reorder point
  - Transfer velocity (from Task 2 transfer history)
  - Configurable lead time (in days)
- `/alerts` page -- view and manage alerts
- API endpoints for alerts CRUD
- Integrate alert summary into dashboard

### Task 1: Dashboard Redesign
- Professional, eco-friendly UI
- Key business metrics (inventory value, stock levels, warehouse counts)
- Data visualizations using a charting library
- Enhanced inventory overview with better usability
- Fully responsive design (all device sizes)
- Loading states and error handling

## PRACTICAL SECURITY (Built into core work)
- Input validation on all API endpoints (new and existing)
- Error handling (try-catch) in all API routes
- Referential integrity checks on deletes
- Atomic transfer operations (required by Task 2)

## BONUS / OPTIONAL (Only if time permits)
From README "Optional Enhancements":
- Dark mode
- Export functionality (CSV/PDF)
- Keyboard shortcuts
- Advanced filtering
- Accessibility features
- Unit tests
- TypeScript migration
- Live deployment (Vercel/Netlify)
- Additional features that add value

**Rule: Complete ALL core tasks before attempting any bonuses. Quality > Quantity.**
