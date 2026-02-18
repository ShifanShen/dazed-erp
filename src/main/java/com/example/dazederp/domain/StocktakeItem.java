package com.example.dazederp.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "stocktake_item")
public class StocktakeItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stocktake_id")
    private Stocktake stocktake;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "system_qty", nullable = false, precision = 14, scale = 3)
    private BigDecimal systemQty;

    @Column(name = "counted_qty", nullable = false, precision = 14, scale = 3)
    private BigDecimal countedQty;

    @Column(name = "diff_qty", nullable = false, precision = 14, scale = 3)
    private BigDecimal diffQty;

    public Long getId() {
        return id;
    }

    public Stocktake getStocktake() {
        return stocktake;
    }

    public void setStocktake(Stocktake stocktake) {
        this.stocktake = stocktake;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public BigDecimal getSystemQty() {
        return systemQty;
    }

    public void setSystemQty(BigDecimal systemQty) {
        this.systemQty = systemQty;
    }

    public BigDecimal getCountedQty() {
        return countedQty;
    }

    public void setCountedQty(BigDecimal countedQty) {
        this.countedQty = countedQty;
    }

    public BigDecimal getDiffQty() {
        return diffQty;
    }

    public void setDiffQty(BigDecimal diffQty) {
        this.diffQty = diffQty;
    }
}

