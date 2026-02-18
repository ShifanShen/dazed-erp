package com.example.dazederp.repo;

import com.example.dazederp.domain.StockIn;
import com.example.dazederp.domain.StockInStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockInRepository extends JpaRepository<StockIn, Long> {
    List<StockIn> findByStoreIdOrderByCreatedAtDesc(Long storeId);
    List<StockIn> findByStoreIdAndStatusOrderByCreatedAtDesc(Long storeId, StockInStatus status);
}
