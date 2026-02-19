package com.example.dazederp.repo;

import com.example.dazederp.domain.SaleOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface SaleOrderItemRepository extends JpaRepository<SaleOrderItem, Long> {
    List<SaleOrderItem> findBySaleOrderId(Long saleOrderId);
    
    @Query("""
            select sum(soi.totalPrice)
            from SaleOrderItem soi
            join soi.saleOrder so
            where so.store.id = :storeId
            and so.createdAt >= :startDate
            and so.createdAt < :endDate
            and so.status = 'SUBMITTED'
            """)
    java.math.BigDecimal sumTotalAmountByStoreAndDateRange(
            @Param("storeId") Long storeId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );
    
    @Query("""
            select soi.product.id, sum(soi.quantity), sum(soi.totalPrice)
            from SaleOrderItem soi
            join soi.saleOrder so
            where so.store.id = :storeId
            and so.createdAt >= :startDate
            and so.createdAt < :endDate
            and so.status = 'SUBMITTED'
            group by soi.product.id
            order by sum(soi.quantity) desc
            """)
    List<Object[]> findTopProductsByStoreAndDateRange(
            @Param("storeId") Long storeId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );
}
