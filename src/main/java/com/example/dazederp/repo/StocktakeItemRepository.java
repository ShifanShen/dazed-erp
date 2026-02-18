package com.example.dazederp.repo;

import com.example.dazederp.domain.StocktakeItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StocktakeItemRepository extends JpaRepository<StocktakeItem, Long> {
}

