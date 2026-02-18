package com.example.dazederp.repo;

import com.example.dazederp.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    
    @Query("""
            select distinct p
            from Product p
            left join fetch p.category
            where p.id = :id
            """)
    Optional<Product> findByIdWithCategory(@Param("id") Long id);
    
    @Query("""
            select distinct p
            from Product p
            left join fetch p.category
            where p.enabled = true
            and (:categoryId is null or p.category.id = :categoryId)
            order by p.name
            """)
    List<Product> findByCategoryId(@Param("categoryId") Long categoryId);
    
    @Query("""
            select distinct p
            from Product p
            left join fetch p.category
            where p.enabled = true
            order by p.name
            """)
    List<Product> findByEnabledTrueOrderByName();
    
    @Query("""
            select distinct p
            from Product p
            left join fetch p.category
            where p.enabled = true
            and (lower(p.name) like lower(concat('%', :keyword, '%'))
            or lower(p.sku) like lower(concat('%', :keyword, '%')))
            order by p.name
            """)
    List<Product> search(@Param("keyword") String keyword);
    
    @Query("""
            select p
            from Product p
            where p.category.id = :categoryId
            and p.sku like :prefixPattern
            order by p.sku desc
            """)
    List<Product> findByCategoryIdAndSkuPrefix(@Param("categoryId") Long categoryId, 
                                                 @Param("prefixPattern") String prefixPattern);
}
