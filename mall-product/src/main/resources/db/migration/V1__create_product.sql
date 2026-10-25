CREATE TABLE product (
    id BIGINT PRIMARY KEY,
    sku_code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_product_price CHECK (price >= 0)
);
