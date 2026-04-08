# Implementation Order

## Execution Sequence

| Order | Task | Complexity | Effort | Why This Order |
|-------|------|-----------|--------|----------------|
| 1st | 4A: Bug Fix | Low | ~30 min | Foundation -- all calculations depend on correct unitCost |
| 2nd | 4B: Scaling Write-up | Low | ~30 min | Architecture is fresh in mind from bug investigation |
| 3rd | 2: Stock Transfers | High | ~5-6 hrs | Task 3 needs transfer history for velocity calculations |
| 4th | 3: Alerts/Reorder | High | ~5-6 hrs | Depends on bug fix + transfer velocity data |
| 5th | 1: Dashboard Redesign | Medium | ~4-5 hrs | Pure UI -- benefits from having all features to display |

**Total estimated effort: ~12-14 hours**

## Dependency Graph

```
Task 4A (Bug Fix)
    |
    +---> Task 4B (Scaling Write-up)  [architecture understanding]
    |
    +---> Task 2 (Transfers)          [correct unitCost values]
              |
              +---> Task 3 (Alerts)   [transfer velocity from Task 2]
                        |
                        +---> Task 1 (Dashboard)  [all data available to visualize]
```

## Why Dashboard Is Last
- NOT a blocker for anything
- Benefits from being last: transfers + alerts data available to display
- Charts and metrics are richer with all features in place
- Pure UI work -- no downstream dependencies
