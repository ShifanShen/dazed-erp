-- Bar ERP minimal schema (multi-store stocktake + RBAC)

CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE store (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which stores a user can operate on (ADMIN can operate all stores by convention in code)
CREATE TABLE user_store (
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    store_id BIGINT NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, store_id)
);

CREATE TABLE product (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'bottle',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Current on-hand stock per store & product (for quick queries)
CREATE TABLE inventory_stock (
    store_id BIGINT NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (store_id, product_id)
);

CREATE TABLE stocktake (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES store(id),
    status VARCHAR(20) NOT NULL, -- DRAFT / SUBMITTED
    created_by BIGINT NOT NULL REFERENCES app_user(id),
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

CREATE TABLE stocktake_item (
    id BIGSERIAL PRIMARY KEY,
    stocktake_id BIGINT NOT NULL REFERENCES stocktake(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES product(id),
    system_qty NUMERIC(14,3) NOT NULL,
    counted_qty NUMERIC(14,3) NOT NULL,
    diff_qty NUMERIC(14,3) NOT NULL
);

CREATE INDEX idx_stocktake_store ON stocktake(store_id);
CREATE INDEX idx_stocktake_created_by ON stocktake(created_by);
CREATE INDEX idx_stocktake_item_stocktake ON stocktake_item(stocktake_id);

-- Seed data (demo)
INSERT INTO store(code, name) VALUES
('S001', 'Dazed Bar - Downtown'),
('S002', 'Dazed Bar - Riverside');

INSERT INTO product(sku, name, unit) VALUES
('SKU-TEQ-001', 'Tequila', 'bottle'),
('SKU-VOD-001', 'Vodka', 'bottle'),
('SKU-BER-001', 'Beer', 'can');

-- Passwords are stored using DelegatingPasswordEncoder format for learning/demo.
-- admin / admin123
-- manager1 / manager123
-- clerk1 / clerk123
INSERT INTO app_user(username, password, display_name, role) VALUES
('admin', '{noop}admin123', 'Administrator', 'ADMIN'),
('manager1', '{noop}manager123', 'Store Manager 1', 'MANAGER'),
('clerk1', '{noop}clerk123', 'Clerk 1', 'CLERK');

-- Assign manager1 and clerk1 to store S001
INSERT INTO user_store(user_id, store_id)
SELECT u.id, s.id
FROM app_user u
JOIN store s ON s.code = 'S001'
WHERE u.username IN ('manager1', 'clerk1');

-- Initial inventory for each store
INSERT INTO inventory_stock(store_id, product_id, quantity)
SELECT s.id, p.id,
       CASE
           WHEN s.code = 'S001' AND p.sku = 'SKU-TEQ-001' THEN 12
           WHEN s.code = 'S001' AND p.sku = 'SKU-VOD-001' THEN 8
           WHEN s.code = 'S001' AND p.sku = 'SKU-BER-001' THEN 48
           WHEN s.code = 'S002' AND p.sku = 'SKU-TEQ-001' THEN 6
           WHEN s.code = 'S002' AND p.sku = 'SKU-VOD-001' THEN 10
           WHEN s.code = 'S002' AND p.sku = 'SKU-BER-001' THEN 60
           ELSE 0
       END
FROM store s
CROSS JOIN product p;

