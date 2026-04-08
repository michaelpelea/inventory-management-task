# Planted Bug Analysis (Task 4A)

## Location
`src/pages/api/products/[id].js`, line 26

## The Bug
```javascript
// Lines 21-28 of src/pages/api/products/[id].js
const numericFields = ['unitCost', 'reorderPoint'];
const sanitizedData = { ...req.body };
numericFields.forEach(field => {
  if (sanitizedData[field] !== undefined) {
    sanitizedData[field] = parseInt(sanitizedData[field]);  // <-- BUG
  }
});
```

`parseInt()` is applied to BOTH `unitCost` and `reorderPoint`. The problem: `unitCost` is a decimal value.

## How It Corrupts Data (Full Trace)

1. User opens `/products/edit/1` (Bamboo Spork Set, `unitCost: 2.50`)
2. Frontend `GET /api/products/1` returns `{ unitCost: 2.50, ... }`
3. Value `2.50` displays correctly in the form TextField
4. User changes any field (even just the name) and submits
5. Frontend sends `PUT /api/products/1` with `{ unitCost: 2.5, ... }`
   - Frontend correctly uses `parseFloat(product.unitCost)` at `edit/[id].js:52`
6. Server receives `unitCost: 2.5` (already a float)
7. **Server applies `parseInt(2.5)` = `2`** -- truncates the decimal
8. Server writes `{ unitCost: 2, ... }` to `products.json`
9. Dashboard calculates `totalValue = product.unitCost * quantity`
10. Shows `2 * 250 = $500` instead of `2.50 * 250 = $625`

## Catastrophic Cases

| Product | Original unitCost | After parseInt | Impact |
|---------|------------------|----------------|--------|
| Bamboo Spork Set | 2.50 | 2 | -20% value |
| Compostable Food Container | 0.85 | 0 | -100% value ($1,700 -> $0) |
| Wooden Chopsticks | 0.30 | 0 | -100% value ($1,290 -> $0) |
| Recyclable Paper Bowl | 0.45 | 0 | -100% value ($697.50 -> $0) |
| Biodegradable Coffee Cup | 0.60 | 0 | -100% value ($690 -> $0) |

4 out of 5 products have `unitCost < 1.00` -- after editing, their value becomes $0.

## The Fix
Line 26: Change `parseInt` to `parseFloat` for `unitCost`:

```javascript
const numericFields = { unitCost: parseFloat, reorderPoint: parseInt };
const sanitizedData = { ...req.body };
Object.entries(numericFields).forEach(([field, parser]) => {
  if (sanitizedData[field] !== undefined) {
    sanitizedData[field] = parser(sanitizedData[field]);
  }
});
```

Or simpler:
```javascript
if (sanitizedData.unitCost !== undefined) {
  sanitizedData.unitCost = parseFloat(sanitizedData.unitCost);
}
if (sanitizedData.reorderPoint !== undefined) {
  sanitizedData.reorderPoint = parseInt(sanitizedData.reorderPoint);
}
```

## Git Context
- Commit `f6db8dd`: "Add v2 assessment enhancements: harder screening tasks and planted bug"
- The misleading comment "Sanitize numeric fields for data consistency" makes it look intentional
