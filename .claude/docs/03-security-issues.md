# Security Issues Catalog

## Scope for This Project
- Authentication/login: **SKIP** (not needed for assessment scope)
- Rate limiting: **SKIP** (assessment context, single user)
- CSRF tokens: **SKIP** (assessment context)
- Security headers/helmet: **SKIP** (deployment concern)
- File locking for concurrency: **SKIP** (single-user assessment)

## What We WILL Fix (Practical Security)

### 1. Input Validation (Bake into all new + existing API routes)

**Current state:** Zero validation anywhere.

| Endpoint | Issue | Example |
|----------|-------|---------|
| `POST /api/products` | `req.body` stored directly, no validation | `{ "__proto__": {...} }` accepted |
| `PUT /api/products/[id]` | Arbitrary fields merged via spread | Can inject any key into product |
| `POST /api/stock` | No check that productId/warehouseId exist | Orphaned references created |
| All POST/PUT | No required field checks | Empty objects accepted |
| All POST/PUT | No type checking | Strings where numbers expected |

**Action:** Add validation to each API endpoint -- check required fields, types, and foreign key references.

### 2. Error Handling (try-catch in all API routes)

**Current state:** Zero try-catch blocks. Any error crashes the request handler.

**Failure scenarios:**
- Corrupted JSON in data file -> `JSON.parse` throws -> 500
- Missing data file -> `fs.readFileSync` throws -> 500
- Disk full -> `fs.writeFileSync` throws -> 500

**Action:** Wrap each handler in try-catch, return proper error responses.

### 3. Referential Integrity on Deletes

**Current state:** Deleting a product/warehouse leaves orphaned stock records.

**Action:** Before deleting a product, check if stock records reference it. Return 400 with message if so. Same for warehouses.

### 4. Atomic Transfers (Required by Task 2 spec)

**Current state:** No transfer system exists yet.

**The challenge:** A transfer must deduct from source AND credit to destination atomically. If it fails between the two, inventory is lost.

**Solution:** Both operations are in the same file (`stock.json`). Read once, make both changes in memory, validate both, write once. If validation fails, don't write.

## Issues We're Aware Of But Not Fixing

### Race Conditions (Data Loss on Concurrent Writes)
- Read-modify-write pattern is not thread-safe
- Two concurrent requests to same file: one overwrites the other
- No file locking
- **Why skip:** Single-user assessment. Mention in scaling write-up.

### CSRF Vulnerability
- No CSRF tokens on forms
- Any site can submit requests to the API
- **Why skip:** Assessment context, no real users.

### Prototype Pollution Risk
- `{ ...existing, ...req.body }` could be exploited with `__proto__` payloads
- **Why skip:** Low risk in assessment. Input validation partially mitigates.

### No Security Headers
- Missing CSP, X-Frame-Options, etc.
- **Why skip:** Deployment concern, not relevant for local dev assessment.

### Client-Side-Only Validation
- Frontend parses numbers before sending
- Server should be the source of truth
- **Action:** We ARE fixing this by adding server-side validation.
