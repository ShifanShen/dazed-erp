package com.example.dazederp.api;

import com.example.dazederp.domain.AppUser;
import com.example.dazederp.domain.Store;
import com.example.dazederp.repo.StoreRepository;
import com.example.dazederp.security.StoreAccessService;
import com.example.dazederp.security.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {
    private final StoreRepository stores;
    private final StoreAccessService storeAccess;

    public StoreController(StoreRepository stores, StoreAccessService storeAccess) {
        this.stores = stores;
        this.storeAccess = storeAccess;
    }

    public record StoreDto(Long id, String code, String name) {
        static StoreDto from(Store s) {
            return new StoreDto(s.getId(), s.getCode(), s.getName());
        }
    }

    @GetMapping
    public List<StoreDto> list(Authentication auth) {
        AppUser u = storeAccess.requireCurrentUser(auth);
        List<Store> list = (u.getRole() == UserRole.ADMIN)
                ? stores.findAllEnabled()
                : stores.findEnabledByUserId(u.getId());
        return list.stream().map(StoreDto::from).toList();
    }
}

