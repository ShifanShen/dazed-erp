package com.example.dazederp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class InventoryStockId implements Serializable {
    @Column(name = "store_id")
    private Long storeId;

    @Column(name = "product_id")
    private Long productId;

    public InventoryStockId() {
    }

    public InventoryStockId(Long storeId, Long productId) {
        this.storeId = storeId;
        this.productId = productId;
    }

    public Long getStoreId() {
        return storeId;
    }

    public Long getProductId() {
        return productId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        InventoryStockId that = (InventoryStockId) o;
        return Objects.equals(storeId, that.storeId) && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(storeId, productId);
    }
}

