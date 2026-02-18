package com.example.dazederp.repo;

import com.example.dazederp.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StoreRepository extends JpaRepository<Store, Long> {
    @Query("""
            select s
            from Store s
            where s.enabled = true
            order by s.id
            """)
    List<Store> findAllEnabled();

    @Query("""
            select s
            from Store s
            join UserStore us on us.store = s
            where us.user.id = :userId and s.enabled = true
            order by s.id
            """)
    List<Store> findEnabledByUserId(@Param("userId") Long userId);
}

