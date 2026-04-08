# Learnings

Solutions to tricky issues, gotchas, and patterns that worked. Reference this when hitting similar problems.

---

## parseInt vs parseFloat for Currency/Decimal Values

**Problem:** `parseInt("2.50")` returns `2`, `parseInt("0.85")` returns `0`. Using `parseInt` on decimal currency values silently corrupts data.

**Solution:** Always use `parseFloat()` for fields that can contain decimals (e.g., `unitCost`, prices, percentages). Use `parseInt()` only for strictly integer fields (e.g., `reorderPoint`, `quantity`, IDs).

**Where found:** `src/pages/api/products/[id].js:26` -- the planted bug in this assessment.

**Pattern to follow:**
```javascript
// Explicit per-field parsing -- never batch decimal and integer fields together
sanitizedData.unitCost = parseFloat(sanitizedData.unitCost);
sanitizedData.reorderPoint = parseInt(sanitizedData.reorderPoint);
```

---

## JSON File Atomicity for Multi-Record Updates

**Problem:** Updating two records across separate file writes is not atomic. If the process fails between writes, data is inconsistent.

**Solution:** When both records live in the same JSON file (e.g., source and destination stock in `stock.json`), make all changes in memory first, validate everything, then write the file once. This gives you single-file atomicity.

**Pattern:**
```javascript
// 1. Read once
const stock = JSON.parse(fs.readFileSync(stockPath));
// 2. Modify in memory (both source and destination)
// 3. Validate both changes
// 4. Write once -- if we get here, both changes are committed together
fs.writeFileSync(stockPath, JSON.stringify(stock, null, 2));
```

**Limitation:** This doesn't protect against process crash during `writeFileSync` itself, or concurrent requests. Acceptable for single-user assessment; document in scaling write-up.

---

## Dev Server Launch Config (`.claude/launch.json`)

**Pattern:** Store dev server configs in `.claude/launch.json` for `preview_start`. Exclude it from git via `.git/info/exclude` (not `.gitignore`) so it stays local without polluting the tracked ignore file.

**Key finding on macOS:** `npm` may not be on `$PATH` inside the preview runner. Use the full node binary path + local `.bin/next` to avoid "command not found":
```json
{
  "runtimeExecutable": "/usr/local/bin/node",
  "runtimeArgs": ["node_modules/.bin/next", "dev"],
  "port": 3000
}
```

**Also:** `node_modules` must exist before `preview_start` will succeed. Run `npm install` first if missing.
