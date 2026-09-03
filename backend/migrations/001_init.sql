-- =============================================================
-- BizGuard AI — Initial Schema (Phase 3)
-- Target: MySQL 8.0+ (Alibaba Cloud RDS compatible)
--
-- Run this once after creating the database:
--   mysql -h <host> -u <user> -p bizguard_ai < migrations/001_init.sql
-- =============================================================

-- -----------------------------------------------------------
-- 1. businesses — one row per tenant / business profile
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS businesses (
    id              VARCHAR(36)     NOT NULL DEFAULT 'default',
    name            VARCHAR(200)    NOT NULL DEFAULT 'My Business',
    category        VARCHAR(100)    NOT NULL DEFAULT 'General',
    sales           DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    expenses        DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    profit          DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    employees       INT UNSIGNED    NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 2. inventory_items — items belonging to a business
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id     VARCHAR(36)     NOT NULL DEFAULT 'default',
    name            VARCHAR(200)    NOT NULL,
    quantity        INT UNSIGNED    NOT NULL DEFAULT 0,
    min_stock       INT UNSIGNED    NOT NULL DEFAULT 0,
    price           DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    category        VARCHAR(100)    NOT NULL DEFAULT 'General',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_business_id (business_id),
    INDEX idx_low_stock (business_id, quantity, min_stock),

    CONSTRAINT fk_inventory_business
        FOREIGN KEY (business_id) REFERENCES businesses (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
