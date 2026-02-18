-- Add product categories
CREATE TABLE product_category (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add image_url to product
ALTER TABLE product ADD COLUMN category_id BIGINT REFERENCES product_category(id);
ALTER TABLE product ADD COLUMN image_url VARCHAR(500);
ALTER TABLE product ADD COLUMN low_stock_threshold NUMERIC(14,3) DEFAULT 5;

-- Stock-in (入库单) - separate from stocktake
CREATE TABLE stock_in (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES store(id),
    status VARCHAR(20) NOT NULL, -- DRAFT / SUBMITTED
    created_by BIGINT NOT NULL REFERENCES app_user(id),
    supplier VARCHAR(200),
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

CREATE TABLE stock_in_item (
    id BIGSERIAL PRIMARY KEY,
    stock_in_id BIGINT NOT NULL REFERENCES stock_in(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES product(id),
    quantity NUMERIC(14,3) NOT NULL,
    unit_price NUMERIC(14,2),
    total_price NUMERIC(14,2)
);

-- Add indexes
CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_stock_in_store ON stock_in(store_id);
CREATE INDEX idx_stock_in_created_by ON stock_in(created_by);
CREATE INDEX idx_stock_in_item_stock_in ON stock_in_item(stock_in_id);

-- Seed categories
INSERT INTO product_category(code, name, description) VALUES
('CAT-TEQ', '龙舌兰', 'Tequila category'),
('CAT-WHI', '威士忌', 'Whiskey category'),
('CAT-LIQ', '利口酒', 'Liqueur category'),
('CAT-VOD', '伏特加', 'Vodka category'),
('CAT-RUM', '朗姆酒', 'Rum category'),
('CAT-GIN', '金酒', 'Gin category'),
('CAT-BER', '啤酒', 'Beer category'),
('CAT-WIN', '葡萄酒', 'Wine category'),
('CAT-SUP', '耗材', 'Supplies category');

-- Update existing products with categories
UPDATE product SET category_id = (SELECT id FROM product_category WHERE code = 'CAT-TEQ') WHERE sku = 'SKU-TEQ-001';
UPDATE product SET category_id = (SELECT id FROM product_category WHERE code = 'CAT-VOD') WHERE sku = 'SKU-VOD-001';
UPDATE product SET category_id = (SELECT id FROM product_category WHERE code = 'CAT-BER') WHERE sku = 'SKU-BER-001';
