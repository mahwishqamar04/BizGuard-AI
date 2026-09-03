-- =============================================================
-- BizGuard AI — MySQL Database Schema
-- =============================================================
-- Database: bizguard_ai
-- Target:   MySQL 8.0+ (Alibaba Cloud RDS compatible)
-- Phase:    3C — Schema Definition
--
-- USAGE:
--   1. Create the database:
--        CREATE DATABASE bizguard_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--
--   2. Run this schema file:
--        mysql -h <host> -u <user> -p bizguard_ai < database/schema.sql
--
--   3. (Optional) Load sample data:
--        mysql -h <host> -u <user> -p bizguard_ai < database/seed.sql
--
-- NOTES:
--   - This schema uses InnoDB for transaction support and foreign keys.
--   - All monetary values use DECIMAL for precision (no floating-point).
--   - Timestamps use DATETIME with automatic defaults.
-- =============================================================

-- Use strict mode for data integrity
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_MODE = @@SQL_MODE, SQL_MODE = 'TRADITIONAL,NO_ENGINE_SUBSTITUTION';

-- =============================================================
-- TABLE: businesses
-- =============================================================
-- Stores business profile and financial summary data.
-- Each row represents one business tenant (MVP uses id='default').
--
-- DESIGN DECISION — profit column:
--   Profit is stored rather than computed as (sales - expenses) because:
--   1. The current MVP accepts explicit profit values from CSV uploads
--      that may differ from the calculated value (e.g., after adjustments).
--   2. Removing it would break backward compatibility with existing data.
--   3. Future versions could use a GENERATED ALWAYS column if strict
--      calculation is desired: profit DECIMAL(15,2) GENERATED ALWAYS AS (sales - expenses)
--   For now, the application layer (businessService.js / dbService.js)
--   calculates profit = sales - expenses when not explicitly provided.
-- =============================================================

CREATE TABLE IF NOT EXISTS businesses (
    -- Primary identifier (MVP uses 'default'; future: UUID for multi-tenant)
    id              VARCHAR(36)     NOT NULL DEFAULT 'default',

    -- Business profile
    name            VARCHAR(200)    NOT NULL DEFAULT 'My Business',
    category        VARCHAR(100)    NOT NULL DEFAULT 'General',

    -- Financial data (DECIMAL for exact monetary precision)
    -- sales and expenses allow negative values (refunds, credits, adjustments)
    sales           DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    expenses        DECIMAL(15,2)   NOT NULL DEFAULT 0.00,

    -- Profit: stored to preserve MVP behavior (see design note above)
    -- Can be negative (operating at a loss)
    profit          DECIMAL(15,2)   NOT NULL DEFAULT 0.00,

    -- Staff count (must be non-negative)
    employees       INT UNSIGNED    NOT NULL DEFAULT 0,

    -- Audit timestamps
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Constraint: employees already UNSIGNED (non-negative)
    CONSTRAINT chk_employees_max CHECK (employees <= 1000000)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Business profiles and financial summaries';

-- =============================================================
-- TABLE: inventory_items
-- =============================================================
-- Stores inventory/products belonging to a business.
-- Each business can have many inventory items (1:N relationship).
--
-- CONSTRAINTS:
--   - quantity: UNSIGNED (cannot be negative — no negative stock)
--   - min_stock: UNSIGNED (reorder threshold cannot be negative)
--   - price: UNSIGNED (unit price cannot be negative)
--   - business_id: FK to businesses(id) with CASCADE delete
-- =============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
    -- Auto-incrementing primary key
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- Foreign key to parent business
    business_id     VARCHAR(36)     NOT NULL DEFAULT 'default',

    -- Item details
    name            VARCHAR(200)    NOT NULL,
    category        VARCHAR(100)    NOT NULL DEFAULT 'General',

    -- Stock levels (UNSIGNED = non-negative)
    quantity        INT UNSIGNED    NOT NULL DEFAULT 0,
    min_stock       INT UNSIGNED    NOT NULL DEFAULT 0,

    -- Unit price (non-negative DECIMAL for monetary precision)
    price           DECIMAL(10,2)   NOT NULL DEFAULT 0.00,

    -- Audit timestamps
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

    -- Primary key
    PRIMARY KEY (id),

    -- Index: fast lookup of items by business
    INDEX idx_inventory_business (business_id),

    -- Index: fast low-stock detection (WHERE quantity <= min_stock)
    INDEX idx_low_stock (business_id, quantity, min_stock),

    -- Index: category-based queries
    INDEX idx_category (business_id, category),

    -- Foreign key: inventory belongs to a business
    -- CASCADE: deleting a business removes all its inventory
    CONSTRAINT fk_inventory_business
        FOREIGN KEY (business_id) REFERENCES businesses (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Inventory items belonging to businesses';

-- =============================================================
-- Restore previous settings
-- =============================================================
SET SQL_MODE = @OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- =============================================================
-- SCHEMA COMPLETE
-- =============================================================
-- Tables created:
--   1. businesses      (business profiles + financial data)
--   2. inventory_items (products/stock per business)
--
-- Relationships:
--   businesses 1 ──── N inventory_items  (FK: business_id)
--
-- Next step: Run seed.sql to load sample data for development.
-- =============================================================
