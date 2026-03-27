package com.example.dazederp.repo;

import com.example.dazederp.domain.StockIn;
import com.example.dazederp.domain.StockInStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockInRepository extends JpaRepository<StockIn, Long> {
    @Query("""
            select distinct si
            from StockIn si
            left join fetch si.createdBy cb
            left join fetch si.items items
            left join fetch items.product product
            where si.store.id = :storeId
            order by si.createdAt desc
            """)
    List<StockIn> findByStoreIdOrderByCreatedAtDesc(@Param("storeId") Long storeId);

    @Query("""
            select distinct si
            from StockIn si
            left join fetch si.createdBy cb
            left join fetch si.items items
            left join fetch items.product product
            where si.store.id = :storeId
            and si.status = :status
            order by si.createdAt desc
            """)
    List<StockIn> findByStoreIdAndStatusOrderByCreatedAtDesc(@Param("storeId") Long storeId,
                                                             @Param("status") StockInStatus status);
}
