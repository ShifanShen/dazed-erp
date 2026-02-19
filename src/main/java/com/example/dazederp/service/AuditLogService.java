package com.example.dazederp.service;

import com.example.dazederp.domain.AuditLog;
import com.example.dazederp.domain.AppUser;
import com.example.dazederp.domain.Store;
import com.example.dazederp.repo.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
    private final AuditLogRepository auditLogs;

    public AuditLogService(AuditLogRepository auditLogs) {
        this.auditLogs = auditLogs;
    }

    @Transactional
    public void log(String action, String entityType, Long entityId, String description,
                    AppUser user, Store store) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDescription(description);
        log.setUser(user);
        if (user != null) {
            log.setUsername(user.getUsername());
        }
        log.setStore(store);
        auditLogs.save(log);
    }

    @Transactional
    public void log(String action, String entityType, Long entityId, String description,
                    AppUser user) {
        log(action, entityType, entityId, description, user, null);
    }
}
