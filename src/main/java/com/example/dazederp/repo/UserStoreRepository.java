package com.example.dazederp.repo;

import com.example.dazederp.domain.UserStore;
import com.example.dazederp.domain.UserStoreId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserStoreRepository extends JpaRepository<UserStore, UserStoreId> {
    @Query("""
            select count(us) > 0
            from UserStore us
            where us.user.id = :userId and us.store.id = :storeId
            """)
    boolean existsByUserIdAndStoreId(@Param("userId") Long userId, @Param("storeId") Long storeId);
}

