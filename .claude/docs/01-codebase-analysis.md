# Codebase Analysis

## Overview

Multi-Warehouse Inventory Management System for GreenSupply Co. Built with Next.js 15 + Material-UI 6. Uses JSON file storage (no database). Take-home assessment with 4 enhancement tasks.

## Architecture

```
Frontend (React/Next.js Pages)
    |
    | fetch() calls
    v
API Routes (src/pages/api/*)
    |
    | fs.readFileSync / fs.writeFileSync
    v
JSON Files (data/*.json)
```

## Current File Structure

```
inventory-management-task/
├── data/
│   ├── products.json        # 5 eco-friendly products
│   ├── warehouses.json      # 3 warehouses (NJ, CA, TX)
│   └── stock.json           # 10 stock records (product-warehouse junction)
├── src/
│   ├── pages/
│   │   ├── _app.js          # App wrapper (imports global styles)
│   │   ├── _document.js     # HTML document wrapper
│   │   ├── index.js         # Dashboard (summary cards + inventory table)
│   │   ├── products/
│   │   │   ├── index.js     # Products list with edit/delete
│   │   │   ├── add.js       # Add product form
│   │   │   └── edit/[id].js # Edit product form
│   │   ├── warehouses/
│   │   │   ├── index.js     # Warehouses list with edit/delete
│   │   │   ├── add.js       # Add warehouse form
│   │   │   └── edit/[id].js # Edit warehouse form
│   │   ├── stock/
│   │   │   ├── index.js     # Stock records list
│   │   │   ├── add.js       # Add stock record form
│   │   │   └── edit/[id].js # Edit stock record form
│   │   └── api/
│   │       ├── products/
│   │       │   ├── index.js     # GET all / POST new product
│   │       │   └── [id].js     # GET/PUT/DELETE single product
│   │       ├── warehouses/
│   │       │   ├── index.js     # GET all / POST new warehouse
│   │       │   └── [id].js     # GET/PUT/DELETE single warehouse
│   │       └── stock/
│   │           ├── index.js     # GET all / POST new stock record
│   │           └── [id].js     # GET/PUT/DELETE single stock record
│   └── styles/
│       └── globals.css      # Basic CSS reset
├── package.json             # Dependencies: next, react, MUI, emotion
├── jsconfig.json            # Path alias: @/* -> ./src/*
└── next.config.mjs          # React strict mode enabled
```

## Data Model

### products.json
```json
{
  "id": 1,
  "sku": "ECO-UTN-001",
  "name": "Bamboo Spork Set",
  "category": "Utensils",
  "unitCost": 2.50,        // DECIMAL - this is important for the bug
  "reorderPoint": 100       // INTEGER - threshold for low stock
}
```
5 products total. Categories: Utensils, Packaging, Cups.

### warehouses.json
```json
{
  "id": 1,
  "name": "Main Distribution Center",
  "location": "Newark, NJ",
  "code": "NDC-01"
}
```
3 warehouses: Newark NJ, Los Angeles CA, Dallas TX.

### stock.json
```json
{
  "id": 1,
  "productId": 1,
  "warehouseId": 1,
  "quantity": 250
}
```
10 records. Not every product exists in every warehouse. No FK enforcement.

## What's Already Implemented
- Products CRUD (list, add, edit, delete)
- Warehouses CRUD (list, add, edit, delete)
- Stock Level CRUD (list, add, edit, delete)
- Basic Dashboard (3 summary cards + inventory overview table)
- Navigation (AppBar duplicated in every page -- not a shared layout)

## What's NOT Implemented (Required)
- Dashboard Redesign (Task 1)
- Stock Transfer System (Task 2)
- Low Stock Alert & Reorder System (Task 3)
- Bug Fix + Scaling Write-up (Task 4)

## Key Code Patterns
- All API routes: `fs.readFileSync` -> `JSON.parse` -> modify -> `fs.writeFileSync`
- ID generation: `Math.max(...ids) + 1`
- Frontend data fetching: `useEffect` + `fetch()` in each page
- No shared components, no state management, no error boundaries
- AppBar copy-pasted in every page (~15 lines each)
