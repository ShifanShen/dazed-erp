package com.example.dazederp.api;

import com.example.dazederp.domain.AppUser;
import com.example.dazederp.domain.Product;
import com.example.dazederp.domain.StockIn;
import com.example.dazederp.domain.StockInItem;
import com.example.dazederp.domain.StockInStatus;
import com.example.dazederp.domain.Store;
import com.example.dazederp.repo.ProductRepository;
import com.example.dazederp.repo.StockInRepository;
import com.example.dazederp.repo.StoreRepository;
import com.example.dazederp.security.StoreAccessService;
import com.example.dazederp.service.AuditLogService;
import com.example.dazederp.service.InventoryFlowService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/stores/{storeId}/stock-in")
public class StockInController {
    private final StoreAccessService storeAccess;
    private final StoreRepository stores;
    private final ProductRepository products;
    private final StockInRepository stockIns;
    private final InventoryFlowService inventoryFlow;
    private final AuditLogService auditLog;

    public StockInController(StoreAccessService storeAccess,
                             StoreRepository stores,
                             ProductRepository products,
                             StockInRepository stockIns,
                             InventoryFlowService inventoryFlow,
                             AuditLogService auditLog) {
        this.storeAccess = storeAccess;
        this.stores = stores;
        this.products = products;
        this.stockIns = stockIns;
        this.inventoryFlow = inventoryFlow;
        this.auditLog = auditLog;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<StockInDto> list(@PathVariable Long storeId,
                                 @RequestParam(required = false) String status,
                                 Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);

        List<StockIn> documents;
        if (status != null && !status.isBlank()) {
            try {
                StockInStatus stockInStatus = StockInStatus.valueOf(status.toUpperCase());
                documents = stockIns.findByStoreIdAndStatusOrderByCreatedAtDesc(storeId, stockInStatus);
            } catch (IllegalArgumentException ex) {
                documents = stockIns.findByStoreIdOrderByCreatedAtDesc(storeId);
            }
        } else {
            documents = stockIns.findByStoreIdOrderByCreatedAtDesc(storeId);
        }

        return documents.stream().map(StockInDto::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public StockInDto get(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        StockIn stockIn = stockIns.findById(id).orElseThrow(() -> new IllegalArgumentException("Stock-in not found: " + id));
        assertBelongsToStore(stockIn, storeId);
        return StockInDto.from(stockIn);
    }

    @PostMapping
    @Transactional
    public StockInDto create(@PathVariable Long storeId,
                             @RequestBody @Valid SaveStockInRequest req,
                             Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);
        Store store = stores.findById(storeId).orElseThrow();

        StockIn stockIn = new StockIn();
        stockIn.setStore(store);
        stockIn.setCreatedBy(user);

        applyDraftValues(stockIn, req);
        if (req.submit()) {
            markSubmitted(stockIn);
        }

        StockIn saved = stockIns.save(stockIn);
        if (saved.getStatus() == StockInStatus.SUBMITTED) {
            inventoryFlow.applyStockIn(saved, user);
        }

        auditLog.log(saved.getStatus() == StockInStatus.SUBMITTED ? "CREATE_AND_SUBMIT" : "CREATE",
                "STOCK_IN", saved.getId(), "Created stock-in document", user, store);

        return StockInDto.from(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public StockInDto update(@PathVariable Long storeId,
                             @PathVariable Long id,
                             @RequestBody @Valid SaveStockInRequest req,
                             Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);

        StockIn stockIn = stockIns.findById(id).orElseThrow(() -> new IllegalArgumentException("Stock-in not found: " + id));
        assertBelongsToStore(stockIn, storeId);
        requireDraft(stockIn);

        applyDraftValues(stockIn, req);
        if (req.submit()) {
            markSubmitted(stockIn);
            inventoryFlow.applyStockIn(stockIn, user);
        }

        StockIn saved = stockIns.save(stockIn);
        auditLog.log(saved.getStatus() == StockInStatus.SUBMITTED ? "UPDATE_AND_SUBMIT" : "UPDATE",
                "STOCK_IN", saved.getId(), "Updated stock-in document", user, saved.getStore());

        return StockInDto.from(saved);
    }

    @PostMapping("/{id}/submit")
    @Transactional
    public StockInDto submit(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);

        StockIn stockIn = stockIns.findById(id).orElseThrow(() -> new IllegalArgumentException("Stock-in not found: " + id));
        assertBelongsToStore(stockIn, storeId);
        requireDraft(stockIn);

        markSubmitted(stockIn);
        inventoryFlow.applyStockIn(stockIn, user);

        StockIn saved = stockIns.save(stockIn);
        auditLog.log("SUBMIT", "STOCK_IN", saved.getId(), "Submitted stock-in document", user, saved.getStore());

        return StockInDto.from(saved);
    }

    private void applyDraftValues(StockIn stockIn, SaveStockInRequest req) {
        stockIn.setSupplier(normalize(req.supplier()));
        stockIn.setNote(normalize(req.note()));
        stockIn.setStatus(StockInStatus.DRAFT);
        stockIn.setSubmittedAt(null);

        stockIn.getItems().clear();
        stockIn.getItems().addAll(buildItems(stockIn, req.items()));
    }

    private List<StockInItem> buildItems(StockIn stockIn, List<StockInItemRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Please add at least one stock-in item");
        }

        List<StockInItem> items = new ArrayList<>();
        Set<Long> seenProducts = new HashSet<>();

        for (StockInItemRequest request : requests) {
            if (request.productId() == null) {
                throw new IllegalArgumentException("Stock-in item is missing productId");
            }
            if (!seenProducts.add(request.productId())) {
                throw new IllegalArgumentException("Duplicate product in stock-in items: " + request.productId());
            }
            if (request.quantity() == null || request.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Stock-in quantity must be greater than 0");
            }
            if (request.unitPrice() != null && request.unitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Stock-in unit price cannot be negative");
            }

            Product product = products.findById(request.productId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + request.productId()));
            if (!product.isEnabled()) {
                throw new IllegalArgumentException("Product is disabled: " + product.getName());
            }

            StockInItem item = new StockInItem();
            item.setStockIn(stockIn);
            item.setProduct(product);
            item.setQuantity(request.quantity());
            item.setUnitPrice(request.unitPrice());
            items.add(item);
        }

        return items;
    }

    private void markSubmitted(StockIn stockIn) {
        stockIn.setStatus(StockInStatus.SUBMITTED);
        stockIn.setSubmittedAt(Instant.now());
    }

    private void assertBelongsToStore(StockIn stockIn, Long storeId) {
        if (!stockIn.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Stock-in does not belong to this store");
        }
    }

    private void requireDraft(StockIn stockIn) {
        if (stockIn.getStatus() != StockInStatus.DRAFT) {
            throw new IllegalStateException("Only draft stock-in documents can be changed");
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record StockInDto(
            Long id,
            Long storeId,
            String status,
            String supplier,
            String note,
            Instant createdAt,
            Instant submittedAt,
            String createdBy,
            int itemCount,
            BigDecimal totalQuantity,
            BigDecimal totalAmount,
            List<StockInItemDto> items
    ) {
        static StockInDto from(StockIn stockIn) {
            List<StockInItemDto> items = stockIn.getItems().stream()
                    .map(StockInItemDto::from)
                    .toList();

            BigDecimal totalQuantity = items.stream()
                    .map(StockInItemDto::quantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalAmount = items.stream()
                    .map(StockInItemDto::totalPrice)
                    .map(value -> value != null ? value : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            return new StockInDto(
                    stockIn.getId(),
                    stockIn.getStore().getId(),
                    stockIn.getStatus().name(),
                    stockIn.getSupplier(),
                    stockIn.getNote(),
                    stockIn.getCreatedAt(),
                    stockIn.getSubmittedAt(),
                    stockIn.getCreatedBy() != null ? stockIn.getCreatedBy().getDisplayName() : null,
                    items.size(),
                    totalQuantity,
                    totalAmount,
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
            Product product = item.getProduct();
            return new StockInItemDto(
                    item.getId(),
                    product.getId(),
                    product.getName(),
                    product.getSku(),
                    item.getQuantity(),
                    item.getUnitPrice(),
                    item.getTotalPrice()
            );
        }
    }

    public record SaveStockInRequest(
            String supplier,
            String note,
            boolean submit,
            @NotNull List<StockInItemRequest> items
    ) {
    }

    public record StockInItemRequest(
            @NotNull Long productId,
            @NotNull BigDecimal quantity,
            BigDecimal unitPrice
    ) {
    }
}
