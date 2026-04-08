# Scale-Up Considerations

Plugins and technologies to consider as the system grows beyond the current scope. Each includes what it replaces, when to adopt, complexity of switching, and trade-offs.

---

## Current Core Dependencies

| Package | Purpose | Adopted |
|---------|---------|---------|
| `recharts` | Dashboard charts (pie, bar, line) | Now |
| `zod` | Input validation schemas per resource | Now |
| `dayjs` | UTC timestamps, date math, formatting | Now |
| `axios` | Centralized API client, error interceptors | Now |

---

## Frontend Scale-Up

### @mui/x-data-grid -- Large Table Rendering

**What it does:** Virtualized data grid with built-in sorting, filtering, pagination, column resizing, CSV export.

**When to adopt:** When any table consistently renders **500+ rows**. MUI `Table` renders all rows in the DOM -- at 500+ this causes visible lag on scroll and initial render.

**What it replaces:** MUI `Table` + hand-rolled sort/filter logic.

**Switching complexity:** Medium
- Install `@mui/x-data-grid` (free community version covers most needs)
- Replace `<Table>` with `<DataGrid>` in affected pages
- Redefine columns as a `columns` array config instead of JSX `<TableCell>` elements
- Pagination, sorting, filtering come free -- remove any hand-rolled implementations
- Estimated effort per table: 1-2 hours

**Trade-offs:**
- Adds ~150KB to bundle
- Different API pattern than MUI Table (config-driven vs JSX-driven)
- Pro/Premium features (row grouping, tree data, Excel export) require paid license
- Community version is MIT licensed and sufficient for most use cases

---

### TanStack Query (React Query) -- Data Fetching & Caching

**What it does:** Declarative data fetching with automatic caching, deduplication, background refresh, optimistic updates, and stale-while-revalidate.

**When to adopt:** When you notice:
- Same API called from multiple components (deduplication needed)
- Users navigating back and forth causing redundant fetches
- Need for optimistic UI updates (e.g., transfer completes instantly in UI while API processes)
- Stale data complaints from users who keep dashboard open all day

**What it replaces:** Manual `useEffect` + `useState` + `fetch`/Axios calls in every page.

**Switching complexity:** Medium-High
- Install `@tanstack/react-query`
- Wrap app with `QueryClientProvider` in `_app.js`
- Replace each `useEffect` + `fetch` pattern with `useQuery` hooks
- Replace each mutation (POST/PUT/DELETE) with `useMutation` hooks
- Define query keys for cache invalidation strategy
- Estimated effort: 2-3 hours for full migration

**Trade-offs:**
- Adds ~40KB to bundle
- Learning curve for cache invalidation patterns (`queryClient.invalidateQueries`)
- Overkill for pages that fetch once on mount and never refresh
- Significant DX improvement for complex pages (dashboard, alerts)

---

### Zustand / Redux Toolkit -- Global State Management

**What it does:** Centralized state store for cross-component/cross-page shared state.

**When to adopt:** When you need:
- Shared state across multiple pages (e.g., user preferences, active filters persisted across navigation)
- Complex state interactions (e.g., transfer form state affects alert badges in real-time)
- Undo/redo functionality

**What it replaces:** Prop drilling, duplicated `useState` in each page.

**Switching complexity:** Medium
- Zustand is simpler: ~1KB, hook-based, no boilerplate
- Redux Toolkit is more structured: ~20KB, better for large teams with strict patterns
- Estimated effort: 1-2 hours for initial setup + incremental migration

**Trade-offs:**
- Currently NOT needed -- each page is self-contained with its own data
- Adds architectural complexity
- Only adopt when prop drilling becomes painful or cross-page state is required

---

## Backend Scale-Up

### PostgreSQL + Prisma -- Relational Database

**What it does:** Replaces JSON file storage with a proper RDBMS. Prisma provides type-safe ORM, migrations, and schema management.

**When to adopt:** When ANY of these become true:
- 50+ concurrent users (JSON files have no concurrency control)
- 10,000+ records in any file (read/parse time becomes unacceptable)
- Need for complex queries (joins, aggregations, full-text search)
- Need for transactions across multiple tables
- Data integrity is business-critical (FK constraints, unique constraints)

**What it replaces:** All `fs.readFileSync`/`fs.writeFileSync` + `JSON.parse`/`JSON.stringify` calls.

**Switching complexity:** High
- Install `prisma` + `@prisma/client`
- Design database schema (`prisma/schema.prisma`)
- Create migration scripts to move JSON data to PostgreSQL
- Replace every API handler's file I/O with Prisma queries
- Add connection pooling configuration
- Set up database hosting (Supabase, Neon, AWS RDS, etc.)
- Estimated effort: 8-12 hours for full migration

**Trade-offs:**
- Major architectural change -- touches every API file
- Requires database hosting (cost + ops overhead)
- Prisma has a learning curve but excellent docs
- Massive gain: real transactions, FK enforcement, indexes, concurrent access
- This is the single highest-impact scale-up change

---

### Redis -- Server-Side Caching

**What it does:** In-memory key-value store for caching frequently-read data and reducing database load.

**When to adopt:** When:
- Dashboard loads become slow due to aggregation queries across large tables
- Same expensive queries run repeatedly (e.g., total inventory value, alert counts)
- Need for session storage (if auth is added later)

**What it replaces:** Nothing directly -- it sits between the API layer and the database as a cache.

**Switching complexity:** Medium
- Install `ioredis`
- Set up Redis instance (Redis Cloud, AWS ElastiCache, or local Docker)
- Add cache-aside pattern: check Redis first, fall back to DB, cache result
- Define TTL (time-to-live) per cache key type
- Invalidate cache on writes
- Estimated effort: 4-6 hours

**Trade-offs:**
- Adds infrastructure dependency
- Cache invalidation is notoriously tricky ("only two hard things in CS...")
- Unnecessary until database queries are demonstrably slow
- Only makes sense AFTER migrating to PostgreSQL

---

### Bull / BullMQ -- Job Queues

**What it does:** Background job processing for long-running or retry-able operations.

**When to adopt:** When:
- Transfers need to process asynchronously (e.g., approval workflows, notifications)
- Need for retry logic on failed operations
- Batch operations (e.g., bulk transfers, bulk reorders)
- Email/SMS notifications on alerts

**What it replaces:** Synchronous API processing.

**Switching complexity:** Medium
- Install `bullmq` + Redis (Bull uses Redis as its backing store)
- Create job processor workers
- Convert synchronous transfer/alert operations to queued jobs
- Add job status tracking UI
- Estimated effort: 6-8 hours

**Trade-offs:**
- Requires Redis
- Adds async complexity (job status polling, failure handling)
- Overkill unless operations take >1 second or need retry/approval

---

### NextAuth.js -- Authentication & Authorization

**What it does:** Drop-in auth for Next.js -- supports OAuth, credentials, JWT, session management.

**When to adopt:** When:
- Multiple users need separate accounts
- Role-based access required (admin vs warehouse manager vs viewer)
- Audit trail needed (who did what)

**What it replaces:** Nothing -- currently no auth exists.

**Switching complexity:** Medium
- Install `next-auth`
- Configure auth provider(s) (credentials, Google, etc.)
- Add session middleware to API routes
- Add role checks to protected endpoints
- Add login page
- Estimated effort: 4-6 hours for basic setup

**Trade-offs:**
- Explicitly out of scope for current assessment
- Adds session management complexity
- Essential for any multi-user production system

---

## Adoption Priority (When Scaling)

Order of adoption based on impact-to-effort ratio:

| Priority | Technology | Trigger | Impact |
|----------|-----------|---------|--------|
| 1st | PostgreSQL + Prisma | >50 users OR >10k records | Fixes concurrency, integrity, performance |
| 2nd | NextAuth.js | Multi-user requirement | Fixes security, enables audit trail |
| 3rd | TanStack Query | Complex UI with shared data | Fixes redundant fetches, improves UX |
| 4th | Redis | Slow dashboard/aggregation queries | Fixes read performance |
| 5th | @mui/x-data-grid | Tables with 500+ rows | Fixes rendering performance |
| 6th | Bull/BullMQ | Async workflows, notifications | Enables background processing |
| 7th | Zustand | Cross-page shared state needed | Fixes prop drilling |
