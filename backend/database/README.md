# BizGuard AI — Database Documentation

## Overview

| Property | Value |
|---|---|
| Database name | `bizguard_ai` |
| Engine | InnoDB |
| Character set | `utf8mb4` / `utf8mb4_unicode_ci` |
| Target | MySQL 8.0+ (Alibaba Cloud RDS compatible) |
| Schema file | `backend/database/schema.sql` |
| Seed file | `backend/database/seed.sql` (optional) |

---

## Tables

### 1. `businesses`

Stores business profiles and financial summary data. Each row represents one business tenant. The MVP uses a single row with `id = 'default'`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | `'default'` | Primary key. MVP uses `'default'`; future versions may use UUIDs for multi-tenancy. |
| `name` | VARCHAR(200) | NO | `'My Business'` | Business display name. |
| `category` | VARCHAR(100) | NO | `'General'` | Business category (Retail, Services, Manufacturing, Technology, Other). |
| `sales` | DECIMAL(15,2) | NO | `0.00` | Monthly sales/revenue. Allows negative values for refunds/credits. |
| `expenses` | DECIMAL(15,2) | NO | `0.00` | Monthly expenses/costs. Allows negative values for adjustments. |
| `profit` | DECIMAL(15,2) | NO | `0.00` | Monthly profit. Can be negative (operating at a loss). See design note below. |
| `employees` | INT UNSIGNED | NO | `0` | Number of employees. Must be non-negative. |
| `created_at` | DATETIME | NO | `CURRENT_TIMESTAMP` | Row creation timestamp. |
| `updated_at` | DATETIME | NO | `CURRENT_TIMESTAMP ON UPDATE` | Auto-updated on every modification. |

**Primary key:** `id`

**Constraints:**
- `chk_employees_max`: `employees <= 1000000`

**Design note — why `profit` is stored:**
Profit is stored rather than computed as `sales - expenses` because:
1. The MVP accepts explicit profit values from CSV uploads that may differ from the calculated value.
2. Removing it would break backward compatibility with existing API contracts.
3. The application layer (`dbService.js`) calculates `profit = sales - expenses` when not explicitly provided.
4. A future version could use `GENERATED ALWAYS AS (sales - expenses)` if strict calculation is desired.

---

### 2. `inventory_items`

Stores inventory items belonging to a business. Each business can have many items (one-to-many relationship).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | `AUTO_INCREMENT` | Primary key. Unique across all businesses. |
| `business_id` | VARCHAR(36) | NO | `'default'` | Foreign key → `businesses(id)`. |
| `name` | VARCHAR(200) | NO | — | Item/product name. Required. |
| `category` | VARCHAR(100) | NO | `'General'` | Item category (Electronics, Accessories, Components, etc.). |
| `quantity` | INT UNSIGNED | NO | `0` | Current stock level. Cannot be negative. |
| `min_stock` | INT UNSIGNED | NO | `0` | Minimum stock threshold (reorder point). Cannot be negative. |
| `price` | DECIMAL(10,2) | NO | `0.00` | Unit price. Cannot be negative. |
| `created_at` | DATETIME | NO | `CURRENT_TIMESTAMP` | Row creation timestamp. |
| `updated_at` | DATETIME | NO | `CURRENT_TIMESTAMP ON UPDATE` | Auto-updated on every modification. |

**Primary key:** `id`

**Foreign key:** `fk_inventory_business` → `businesses(id)` ON DELETE CASCADE ON UPDATE CASCADE

---

## Relationships

```
businesses (1) ──────── (N) inventory_items
     │                          │
     │  id (PK)                 │  business_id (FK)
     └──────────────────────────┘
        ON DELETE CASCADE
        ON UPDATE CASCADE
```

- One business has many inventory items.
- Deleting a business automatically deletes all its inventory items (CASCADE).
- Updating a business `id` propagates to inventory items (CASCADE).

---

## Indexes

| Table | Index Name | Columns | Purpose |
|---|---|---|---|
| `businesses` | `PRIMARY` | `id` | Primary key lookup |
| `inventory_items` | `PRIMARY` | `id` | Primary key lookup |
| `inventory_items` | `idx_inventory_business` | `business_id` | Fast lookup of items by business |
| `inventory_items` | `idx_low_stock` | `business_id, quantity, min_stock` | Fast low-stock detection (`WHERE quantity <= min_stock`) |
| `inventory_items` | `idx_category` | `business_id, category` | Category-based filtering |

---

## Data Integrity Constraints

| Constraint | Type | Description |
|---|---|---|
| `businesses.id` | PRIMARY KEY | Unique, not null |
| `inventory_items.id` | PRIMARY KEY | Auto-increment, unique |
| `inventory_items.business_id` | FOREIGN KEY | Must reference an existing business |
| `inventory_items.quantity` | UNSIGNED | Cannot be negative (no negative stock) |
| `inventory_items.min_stock` | UNSIGNED | Cannot be negative |
| `inventory_items.price` | UNSIGNED (DECIMAL) | Cannot be negative |
| `businesses.employees` | UNSIGNED + CHECK | Non-negative, max 1,000,000 |
| `ON DELETE CASCADE` | FK action | Deleting business removes its inventory |

---

## How to Execute

### 1. Create the database

```sql
CREATE DATABASE bizguard_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Run the schema

```bash
mysql -h <host> -u <user> -p bizguard_ai < backend/database/schema.sql
```

Or from within the MySQL client:

```sql
USE bizguard_ai;
SOURCE backend/database/schema.sql;
```

### 3. (Optional) Load sample data

```bash
mysql -h <host> -u <user> -p bizguard_ai < backend/database/seed.sql
```

**Note:** The application auto-seeds via `dbService.getOrCreateDefault()` when the `businesses` table is empty. Manual seeding is only needed for development/testing convenience.

### 4. Configure the application

Uncomment and fill in the DB variables in `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=bizguard_user
DB_PASSWORD=your_password_here
DB_NAME=bizguard_ai
```

Restart the server. It will automatically switch from in-memory to MySQL.

---

## Seed Data Details

The seed file (`seed.sql`) inserts:

**Business:**
- id: `default`, name: `Sample Business`, category: `Retail`
- sales: $45,000 | expenses: $18,000 | profit: $27,000 | employees: 5

**Inventory (6 items, 3 low-stock):**

| Item | Qty | Min Stock | Price | Category | Status |
|---|---|---|---|---|---|
| Widget A | 150 | 20 | $25.00 | Electronics | In Stock |
| Widget B | 8 | 15 | $45.00 | Electronics | LOW STOCK |
| Gadget X | 75 | 10 | $120.00 | Accessories | In Stock |
| Gadget Y | 3 | 10 | $89.99 | Accessories | LOW STOCK |
| Part Z | 200 | 50 | $8.50 | Components | In Stock |
| Part W | 12 | 25 | $15.00 | Components | LOW STOCK |

---

## File Locations

| File | Purpose |
|---|---|
| `backend/database/schema.sql` | Table definitions, constraints, indexes |
| `backend/database/seed.sql` | Optional sample data |
| `backend/database/README.md` | This documentation |
| `backend/migrations/001_init.sql` | Earlier migration (Phase 3B, equivalent schema) |
| `backend/config/database.js` | Connection pool module |
| `backend/services/dbService.js` | Data access layer |
| `backend/services/unifiedService.js` | Auto-routing (DB or in-memory) |
| `backend/.env.example` | Environment variable template |
