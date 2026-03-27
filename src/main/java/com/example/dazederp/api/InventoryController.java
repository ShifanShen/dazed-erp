package com.example.dazederp.api;

import com.example.dazederp.domain.AppUser;
import com.example.dazederp.domain.InventoryMovement;
import com.example.dazederp.domain.InventoryStock;
import com.example.dazederp.domain.Product;
import com.example.dazederp.domain.Stocktake;
import com.example.dazederp.domain.StocktakeItem;
import com.example.dazederp.domain.StocktakeStatus;
import com.example.dazederp.domain.Store;
import com.example.dazederp.repo.InventoryMovementRepository;
import com.example.dazederp.repo.InventoryStockRepository;
import com.example.dazederp.repo.ProductRepository;
import com.example.dazederp.repo.StocktakeRepository;
import com.example.dazederp.repo.StoreRepository;
import com.example.dazederp.security.StoreAccessService;
import com.example.dazederp.service.InventoryFlowService;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}")
public class InventoryController {
    private final StoreAccessService storeAccess;
    private final StoreRepository stores;
    private final ProductRepository products;
    private final InventoryStockRepository stockRepo;
    private final StocktakeRepository stocktakes;
    private final InventoryMovementRepository movements;
    private final InventoryFlowService inventoryFlow;

    public InventoryController(StoreAccessService storeAccess,
                               StoreRepository stores,
                               ProductRepository products,
                               InventoryStockRepository stockRepo,
                               StocktakeRepository stocktakes,
                               InventoryMovementRepository movements,
                               InventoryFlowService inventoryFlow) {
        this.storeAccess = storeAccess;
        this.stores = stores;
        this.products = products;
        this.stockRepo = stockRepo;
        this.stocktakes = stocktakes;
        this.movements = movements;
        this.inventoryFlow = inventoryFlow;
    }

    public record InventoryRow(
            Long productId,
            String sku,
            String productName,
            String unit,
            String categoryName,
            BigDecimal quantity,
            BigDecimal lowStockThreshold,
            boolean lowStock,
            Instant updatedAt
    ) {
        static InventoryRow from(InventoryStock stock) {
            Product product = stock.getProduct();
            BigDecimal threshold = product.getLowStockThreshold();
            return new InventoryRow(
                    product.getId(),
                    product.getSku(),
                    product.getName(),
                    product.getUnit(),
                    product.getCategory() != null ? product.getCategory().getName() : null,
                    stock.getQuantity(),
                    threshold,
                    threshold != null && stock.getQuantity().compareTo(threshold) < 0,
                    stock.getUpdatedAt()
            );
        }
    }

    @GetMapping("/inventory")
    @Transactional(readOnly = true)
    public List<InventoryRow> inventory(@PathVariable Long storeId,
                                        @RequestParam(required = false) Long categoryId,
                                        Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        List<InventoryStock> stocks = categoryId != null
                ? stockRepo.findByStoreIdAndCategory(storeId, categoryId)
                : stockRepo.findByStoreIdWithProduct(storeId);
        return stocks.stream().map(InventoryRow::from).toList();
    }

    @GetMapping("/inventory/movements")
    @Transactional(readOnly = true)
    public List<InventoryMovementDto> recentMovements(@PathVariable Long storeId,
                                                      @RequestParam(defaultValue = "20") int limit,
                                                      Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        int pageSize = Math.max(1, Math.min(limit, 50));
        return movements.findRecentByStoreId(storeId, PageRequest.of(0, pageSize)).stream()
                .map(InventoryMovementDto::from)
                .toList();
    }

    public record StocktakeItemReq(@NotNull Long productId, @NotNull BigDecimal countedQty) {
    }

    public record CreateStocktakeReq(String note, @NotNull List<StocktakeItemReq> items, boolean submit) {
    }

    public record StocktakeItemDto(
            Long productId,
            String sku,
            String productName,
            BigDecimal systemQty,
            BigDecimal countedQty,
            BigDecimal diffQty
    ) {
        static StocktakeItemDto from(StocktakeItem item) {
            Product product = item.getProduct();
            return new StocktakeItemDto(
                    product.getId(),
                    product.getSku(),
                    product.getName(),
                    item.getSystemQty(),
                    item.getCountedQty(),
                    item.getDiffQty()
            );
        }
    }

    public record StocktakeDto(Long id, String status, String note, Instant createdAt, Instant submittedAt, List<StocktakeItemDto> items) {
        static StocktakeDto from(Stocktake stocktake) {
            List<StocktakeItemDto> items = stocktake.getItems().stream().map(StocktakeItemDto::from).toList();
            return new StocktakeDto(
                    stocktake.getId(),
                    stocktake.getStatus().name(),
                    stocktake.getNote(),
                    stocktake.getCreatedAt(),
                    stocktake.getSubmittedAt(),
                    items
            );
        }
    }

    public record InventoryMovementDto(
            Long id,
            String movementType,
            String referenceType,
            Long referenceId,
            String referenceNo,
            Long productId,
            String productName,
            String productSku,
            BigDecimal quantityChange,
            BigDecimal beforeQuantity,
            BigDecimal afterQuantity,
            String note,
            String operatorName,
            Instant createdAt
    ) {
        static InventoryMovementDto from(InventoryMovement movement) {
            Product product = movement.getProduct();
            return new InventoryMovementDto(
                    movement.getId(),
                    movement.getMovementType().name(),
                    movement.getReferenceType(),
                    movement.getReferenceId(),
                    movement.getReferenceNo(),
                    product.getId(),
                    product.getName(),
                    product.getSku(),
                    movement.getQuantityChange(),
                    movement.getBeforeQuantity(),
                    movement.getAfterQuantity(),
                    movement.getNote(),
                    movement.getOperator() != null ? movement.getOperator().getDisplayName() : null,
                    movement.getCreatedAt()
            );
        }
    }

    @PostMapping("/stocktakes")
    @Transactional
    public StocktakeDto createStocktake(@PathVariable Long storeId,
                                        @RequestBody CreateStocktakeReq req,
                                        Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);

        if (req.items() == null || req.items().isEmpty()) {
            throw new IllegalArgumentException("Please add at least one stocktake item");
        }

        Store store = stores.findById(storeId).orElseThrow();
        Stocktake stocktake = new Stocktake();
        stocktake.setStore(store);
        stocktake.setCreatedBy(user);
        stocktake.setNote(req.note());

        List<StocktakeItem> items = new ArrayList<>();
        for (StocktakeItemReq itemReq : req.items()) {
            if (itemReq.countedQty() == null || itemReq.countedQty().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Counted quantity cannot be negative");
            }
            if (!isWholeNumber(itemReq.countedQty())) {
                throw new IllegalArgumentException("Stocktake quantity must be a whole number");
            }

            Product product = products.findById(itemReq.productId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemReq.productId()));
            BigDecimal systemQty = stockRepo.findOne(storeId, product.getId())
                    .map(InventoryStock::getQuantity)
                    .orElse(BigDecimal.ZERO);
            BigDecimal countedQty = itemReq.countedQty();

            StocktakeItem item = new StocktakeItem();
            item.setStocktake(stocktake);
            item.setProduct(product);
            item.setSystemQty(systemQty);
            item.setCountedQty(countedQty);
            item.setDiffQty(countedQty.subtract(systemQty));
            items.add(item);
        }
        stocktake.getItems().addAll(items);

        if (req.submit()) {
            stocktake.setStatus(StocktakeStatus.SUBMITTED);
            stocktake.setSubmittedAt(Instant.now());
        }

        Stocktake saved = stocktakes.save(stocktake);
        if (saved.getStatus() == StocktakeStatus.SUBMITTED) {
            inventoryFlow.applyStocktake(saved, user);
        }

        return StocktakeDto.from(saved);
    }

    @GetMapping("/stocktakes")
    @Transactional(readOnly = true)
    public List<StocktakeDto> listStocktakes(@PathVariable Long storeId, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        return stocktakes.findByStoreId(storeId).stream().map(StocktakeDto::from).toList();
    }

    private boolean isWholeNumber(BigDecimal value) {
        return value.stripTrailingZeros().scale() <= 0;
    }
}
