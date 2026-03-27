package com.example.dazederp.repo;

import com.example.dazederp.domain.SaleOrder;
import com.example.dazederp.domain.SaleOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long> {
    @Query("""
            select distinct so
            from SaleOrder so
            left join fetch so.createdBy cb
            left join fetch so.items items
            left join fetch items.product product
            where so.store.id = :storeId
            order by so.createdAt desc
            """)
    List<SaleOrder> findByStoreIdOrderByCreatedAtDesc(@Param("storeId") Long storeId);

    @Query("""
            select distinct so
            from SaleOrder so
            left join fetch so.createdBy cb
            left join fetch so.items items
            left join fetch items.product product
            where so.store.id = :storeId
            and so.status = :status
            order by so.createdAt desc
            """)
    List<SaleOrder> findByStoreIdAndStatusOrderByCreatedAtDesc(@Param("storeId") Long storeId,
                                                               @Param("status") SaleOrderStatus status);
    
    Optional<SaleOrder> findByOrderNo(String orderNo);
    
    @Query("""
            select distinct so
            from SaleOrder so
            left join fetch so.store
            left join fetch so.createdBy
            where so.id = :id
            """)
    Optional<SaleOrder> findByIdWithDetails(@Param("id") Long id);
    
    @Query("""
            select so
            from SaleOrder so
            where so.store.id = :storeId
            and so.createdAt >= :startDate
            and so.createdAt < :endDate
            and so.status = 'SUBMITTED'
            order by so.createdAt desc
            """)
    List<SaleOrder> findSubmittedByStoreAndDateRange(
            @Param("storeId") Long storeId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );
}
