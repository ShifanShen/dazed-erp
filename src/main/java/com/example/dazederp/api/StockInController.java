package com.example.dazederp.api;

import com.example.dazederp.domain.*;
import com.example.dazederp.repo.*;
import com.example.dazederp.security.StoreAccessService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/stock-in")
public class StockInController {
    private final StoreAccessService storeAccess;
    private final StoreRepository stores;
    private final ProductRepository products;
    private final StockInRepository stockIns;
    private final InventoryStockRepository stockRepo;

    public StockInController(StoreAccessService storeAccess,
                            StoreRepository stores,
                            ProductRepository products,
                            StockInRepository stockIns,
                            InventoryStockRepository stockRepo) {
        this.storeAccess = storeAccess;
        this.stores = stores;
        this.products = products;
        this.stockIns = stockIns;
        this.stockRepo = stockRepo;
    }

    @GetMapping
    public List<StockInDto> list(@PathVariable Long storeId, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        return stockIns.findByStoreIdOrderByCreatedAtDesc(storeId)
                .stream().map(StockInDto::from).toList();
    }

    @GetMapping("/{id}")
    public StockInDto get(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        StockIn si = stockIns.findById(id).orElseThrow();
        if (!si.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Stock-in does not belong to this store");
        }
        return StockInDto.from(si);
    }

    @PostMapping
    @Transactional
    public StockInDto create(@PathVariable Long storeId,
                            @RequestBody @Valid CreateStockInRequest req,
                            Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);
        Store store = stores.findById(storeId).orElseThrow();

        StockIn si = new StockIn();
        si.setStore(store);
        si.setCreatedBy(user);
        si.setSupplier(req.supplier());
        si.setNote(req.note());
        si.setStatus(StockInStatus.DRAFT);

        List<StockInItem> items = new ArrayList<>();
        for (StockInItemRequest itemReq : req.items()) {
            Product product = products.findById(itemReq.productId()).orElseThrow();
            StockInItem item = new StockInItem();
            item.setStockIn(si);
            item.setProduct(product);
            item.setQuantity(itemReq.quantity());
            item.setUnitPrice(itemReq.unitPrice());
            items.add(item);
        }
        si.getItems().addAll(items);

        if (req.submit()) {
            si.setStatus(StockInStatus.SUBMITTED);
            si.setSubmittedAt(Instant.now());
            // Update inventory
            for (StockInItem item : items) {
                InventoryStock stock = stockRepo.findOne(storeId, item.getProduct().getId())
                        .orElseGet(() -> {
                            InventoryStock s = new InventoryStock();
                            s.setId(new InventoryStockId(storeId, item.getProduct().getId()));
                            s.setStore(store);
                            s.setProduct(item.getProduct());
                            s.setQuantity(BigDecimal.ZERO);
                            return s;
                        });
                stock.setQuantity(stock.getQuantity().add(item.getQuantity()));
                stockRepo.save(stock);
            }
        }

        StockIn saved = stockIns.save(si);
        return StockInDto.from(saved);
    }

    @PostMapping("/{id}/submit")
    @Transactional
    public StockInDto submit(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        StockIn si = stockIns.findById(id).orElseThrow();
        if (!si.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Stock-in does not belong to this store");
        }
        if (si.getStatus() != StockInStatus.DRAFT) {
            throw new IllegalStateException("Stock-in is already submitted");
        }

        si.setStatus(StockInStatus.SUBMITTED);
        si.setSubmittedAt(Instant.now());

        // Update inventory
        Store store = si.getStore();
        for (StockInItem item : si.getItems()) {
            InventoryStock stock = stockRepo.findOne(storeId, item.getProduct().getId())
                    .orElseGet(() -> {
                        InventoryStock s = new InventoryStock();
                        s.setId(new InventoryStockId(storeId, item.getProduct().getId()));
                        s.setStore(store);
                        s.setProduct(item.getProduct());
                        s.setQuantity(BigDecimal.ZERO);
                        return s;
                    });
            stock.setQuantity(stock.getQuantity().add(item.getQuantity()));
            stockRepo.save(stock);
        }

        StockIn saved = stockIns.save(si);
        return StockInDto.from(saved);
    }

    public record StockInDto(
            Long id,
            Long storeId,
            String status,
            String supplier,
            String note,
            Instant createdAt,
            Instant submittedAt,
            List<StockInItemDto> items
    ) {
        static StockInDto from(StockIn si) {
            List<StockInItemDto> items = si.getItems().stream()
                    .map(StockInItemDto::from)
                    .toList();
            return new StockInDto(
                    si.getId(),
                    si.getStore().getId(),
                    si.getStatus().name(),
                    si.getSupplier(),
                    si.getNote(),
                    si.getCreatedAt(),
                    si.getSubmittedAt(),
                    items
            );
        }
    }

    public record StockInItemDto(
            Long id,
            Long productId,
            String productName,
            String productSku,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal totalPrice
    ) {
        static StockInItemDto from(StockInItem item) {
            Product p = item.getProduct();
            return new StockInItemDto(
                    item.getId(),
                    p.getId(),
                    p.getName(),
                    p.getSku(),
                    item.getQuantity(),
                    item.getUnitPrice(),
                    item.getTotalPrice()
            );
        }
    }

    public record CreateStockInRequest(
            String supplier,
            String note,
            boolean submit,
            @NotNull List<StockInItemRequest> items
    ) {}

    public record StockInItemRequest(
            @NotNull Long productId,
            @NotNull BigDecimal quantity,
            BigDecimal unitPrice
    ) {}
}
