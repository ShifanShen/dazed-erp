package com.example.dazederp.security;

import com.example.dazederp.domain.AppUser;
import com.example.dazederp.repo.AppUserRepository;
import com.example.dazederp.repo.UserStoreRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class StoreAccessService {
    private final AppUserRepository users;
    private final UserStoreRepository userStores;

    public StoreAccessService(AppUserRepository users, UserStoreRepository userStores) {
        this.users = users;
        this.userStores = userStores;
    }

    public AppUser requireCurrentUser(Authentication auth) {
        if (auth == null || auth.getName() == null) throw new AccessDeniedException("Unauthenticated");
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("User not found"));
    }

    public void assertCanAccessStore(Authentication auth, Long storeId) {
        AppUser u = requireCurrentUser(auth);
        if (u.getRole() == UserRole.ADMIN) return;
        boolean ok = userStores.existsByUserIdAndStoreId(u.getId(), storeId);
        if (!ok) throw new AccessDeniedException("No access to store " + storeId);
    }
}

