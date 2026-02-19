package com.example.dazederp.repo;

import com.example.dazederp.domain.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByOrderByCreatedAtDesc(Pageable pageable);
    
    Page<AuditLog> findByStoreIdOrderByCreatedAtDesc(Long storeId, Pageable pageable);
    
    Page<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
            String entityType, Long entityId, Pageable pageable
    );
    
    @Query("""
            select al
            from AuditLog al
            where al.createdAt >= :startDate
            and al.createdAt < :endDate
            order by al.createdAt desc
            """)
    List<AuditLog> findByDateRange(
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );
}
