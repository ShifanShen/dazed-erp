package com.example.dazederp.repo;

import com.example.dazederp.domain.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    List<ProductCategory> findByEnabledTrueOrderByName();
    Optional<ProductCategory> findByCode(String code);
}
