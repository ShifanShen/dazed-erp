package com.example.dazederp.repo;

import com.example.dazederp.domain.InventoryStock;
import com.example.dazederp.domain.InventoryStockId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryStockRepository extends JpaRepository<InventoryStock, InventoryStockId> {
    @Query("""
            select st
            from InventoryStock st
            join fetch st.product p
            left join fetch p.category c
            where st.store.id = :storeId
            order by p.id
            """)
    List<InventoryStock> findByStoreIdWithProduct(@Param("storeId") Long storeId);

    @Query("""
            select st
            from InventoryStock st
            where st.store.id = :storeId and st.product.id = :productId
            """)
    Optional<InventoryStock> findOne(@Param("storeId") Long storeId, @Param("productId") Long productId);

    @Query("""
            select st
            from InventoryStock st
            join fetch st.product p
            left join fetch p.category c
            where st.store.id = :storeId
            and (:categoryId is null or c.id = :categoryId)
            order by p.name
            """)
    List<InventoryStock> findByStoreIdAndCategory(@Param("storeId") Long storeId, @Param("categoryId") Long categoryId);
}

