-- Sales/Outbound Management (销售/出库管理)
CREATE TABLE sale_order (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES store(id),
    status VARCHAR(20) NOT NULL, -- DRAFT / SUBMITTED / CANCELLED
    order_no VARCHAR(50) NOT NULL UNIQUE,
    created_by BIGINT NOT NULL REFERENCES app_user(id),
    customer_name VARCHAR(200),
    note VARCHAR(500),
    total_amount NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

CREATE TABLE sale_order_item (
    id BIGSERIAL PRIMARY KEY,
    sale_order_id BIGINT NOT NULL REFERENCES sale_order(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES product(id),
    quantity NUMERIC(14,3) NOT NULL,
    unit_price NUMERIC(14,2),
    total_price NUMERIC(14,2)
);

-- Audit Log (操作日志)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES app_user(id),
    username VARCHAR(50),
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, SUBMIT, etc.
    entity_type VARCHAR(50) NOT NULL, -- PRODUCT, STOCK_IN, SALE_ORDER, etc.
    entity_id BIGINT,
    description VARCHAR(500),
    store_id BIGINT REFERENCES store(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_sale_order_store ON sale_order(store_id);
CREATE INDEX idx_sale_order_created_by ON sale_order(created_by);
CREATE INDEX idx_sale_order_status ON sale_order(status);
CREATE INDEX idx_sale_order_created_at ON sale_order(created_at);
CREATE INDEX idx_sale_order_item_sale_order ON sale_order_item(sale_order_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_no() RETURNS TEXT AS $$
DECLARE
    new_no TEXT;
    date_part TEXT;
    seq_part TEXT;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_no FROM 10) AS INTEGER)), 0) + 1
    INTO seq_part
    FROM sale_order
    WHERE order_no LIKE 'SO-' || date_part || '-%';
    new_no := 'SO-' || date_part || '-' || LPAD(seq_part::TEXT, 4, '0');
    RETURN new_no;
END;
$$ LANGUAGE plpgsql;
