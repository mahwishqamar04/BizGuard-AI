-- =============================================================
-- BizGuard AI — Sample / Seed Data
-- =============================================================
-- This file inserts the default sample business and inventory data
-- that the MVP uses for demonstration and development.
--
-- IMPORTANT:
--   - This file is OPTIONAL. Run it only if you want sample data.
--   - The application will auto-seed via dbService.getOrCreateDefault()
--     if the businesses table is empty on first request.
--   - Running this file manually is useful for development/testing
--     without waiting for the first API call.
--
-- USAGE:
--   mysql -h <host> -u <user> -p bizguard_ai < database/seed.sql
--
-- PREREQUISITES:
--   - schema.sql must be run first (tables must exist).
--   - If a business with id='default' already exists, the INSERT
--     will fail with a duplicate key error. Use DELETE first if needed.
-- =============================================================

-- =============================================================
-- 1. Sample Business
-- =============================================================
-- This matches the data from businessService.getOrCreateDefault()
-- Financial summary: sales=45000, expenses=18000, profit=27000

INSERT INTO businesses (id, name, category, sales, expenses, profit, employees)
VALUES (
    'default',
    'Sample Business',
    'Retail',
    45000.00,
    18000.00,
    27000.00,
    5
);

-- =============================================================
-- 2. Sample Inventory Items
-- =============================================================
-- 6 items across 3 categories (Electronics, Accessories, Components)
-- Includes low-stock items for testing alerts:
--   - Widget B: quantity=8, min_stock=15 → LOW STOCK
--   - Gadget Y: quantity=3, min_stock=10 → LOW STOCK
--   - Part W:   quantity=12, min_stock=25 → LOW STOCK

INSERT INTO inventory_items (business_id, name, quantity, min_stock, price, category) VALUES
    ('default', 'Widget A',  150, 20,  25.00, 'Electronics'),
    ('default', 'Widget B',    8, 15,  45.00, 'Electronics'),
    ('default', 'Gadget X',   75, 10, 120.00, 'Accessories'),
    ('default', 'Gadget Y',    3, 10,  89.99, 'Accessories'),
    ('default', 'Part Z',    200, 50,   8.50, 'Components'),
    ('default', 'Part W',     12, 25,  15.00, 'Components');

-- =============================================================
-- SEED COMPLETE
-- =============================================================
-- Verify with:
--   SELECT * FROM businesses WHERE id = 'default';
--   SELECT * FROM inventory_items WHERE business_id = 'default';
--
-- Expected: 1 business, 6 inventory items (3 low-stock)
-- =============================================================
