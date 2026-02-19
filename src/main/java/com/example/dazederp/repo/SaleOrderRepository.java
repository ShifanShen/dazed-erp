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
    List<SaleOrder> findByStoreIdOrderByCreatedAtDesc(Long storeId);
    
    List<SaleOrder> findByStoreIdAndStatusOrderByCreatedAtDesc(Long storeId, SaleOrderStatus status);
    
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
