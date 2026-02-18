package com.example.dazederp.repo;

import com.example.dazederp.domain.StockInItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockInItemRepository extends JpaRepository<StockInItem, Long> {
    List<StockInItem> findByStockInId(Long stockInId);
}
