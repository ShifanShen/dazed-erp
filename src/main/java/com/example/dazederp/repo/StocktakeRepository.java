package com.example.dazederp.repo;

import com.example.dazederp.domain.Stocktake;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StocktakeRepository extends JpaRepository<Stocktake, Long> {
    @Query("""
            select distinct s
            from Stocktake s
            left join fetch s.items items
            left join fetch items.product product
            where s.store.id = :storeId
            order by s.id desc
            """)
    List<Stocktake> findByStoreId(@Param("storeId") Long storeId);
}

