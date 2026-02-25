package com.example.dazederp.api;

import com.example.dazederp.domain.*;
import com.example.dazederp.repo.*;
import com.example.dazederp.security.StoreAccessService;
import jakarta.validation.constraints.NotNull;
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

    public InventoryController(StoreAccessService storeAccess,
                               StoreRepository stores,
                               ProductRepository products,
                               InventoryStockRepository stockRepo,
                               StocktakeRepository stocktakes) {
        this.storeAccess = storeAccess;
        this.stores = stores;
        this.products = products;
        this.stockRepo = stockRepo;
        this.stocktakes = stocktakes;
    }

    public record InventoryRow(Long productId, String sku, String name, String unit, BigDecimal quantity) {
        static InventoryRow from(InventoryStock s) {
            Product p = s.getProduct();
            return new InventoryRow(p.getId(), p.getSku(), p.getName(), p.getUnit(), s.getQuantity());
        }
    }

    @GetMapping("/inventory")
    public List<InventoryRow> inventory(@PathVariable Long storeId, @RequestParam(required = false) Long categoryId, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        List<InventoryStock> stocks = categoryId != null 
            ? stockRepo.findByStoreIdAndCategory(storeId, categoryId)
            : stockRepo.findByStoreIdWithProduct(storeId);
        return stocks.stream().map(InventoryRow::from).toList();
    }

    public record StocktakeItemReq(@NotNull Long productId, @NotNull BigDecimal countedQty) {
    }

    public record CreateStocktakeReq(String note, @NotNull List<StocktakeItemReq> items, boolean submit) {
    }

    public record StocktakeItemDto(Long productId, String sku, String name, BigDecimal systemQty, BigDecimal countedQty, BigDecimal diffQty) {
        static StocktakeItemDto from(StocktakeItem it) {
            Product p = it.getProduct();
            return new StocktakeItemDto(p.getId(), p.getSku(), p.getName(), it.getSystemQty(), it.getCountedQty(), it.getDiffQty());
        }
    }

    public record StocktakeDto(Long id, String status, String note, Instant createdAt, Instant submittedAt, List<StocktakeItemDto> items) {
        static StocktakeDto from(Stocktake s) {
            List<StocktakeItemDto> items = s.getItems().stream().map(StocktakeItemDto::from).toList();
            return new StocktakeDto(s.getId(), s.getStatus().name(), s.getNote(), s.getCreatedAt(), s.getSubmittedAt(), items);
        }
    }

    @PostMapping("/stocktakes")
    @Transactional
    public StocktakeDto createStocktake(@PathVariable Long storeId, @RequestBody CreateStocktakeReq req, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);

        Store store = stores.findById(storeId).orElseThrow();
        Stocktake st = new Stocktake();
        st.setStore(store);
        st.setCreatedBy(user);
        st.setNote(req.note());

        List<StocktakeItem> items = new ArrayList<>();
        for (StocktakeItemReq itReq : req.items()) {
            Product product = products.findById(itReq.productId()).orElseThrow();
            BigDecimal systemQty = stockRepo.findOne(storeId, product.getId()).map(InventoryStock::getQuantity).orElse(BigDecimal.ZERO);
            BigDecimal countedQty = itReq.countedQty();
            BigDecimal diff = countedQty.subtract(systemQty);

            StocktakeItem it = new StocktakeItem();
            it.setStocktake(st);
            it.setProduct(product);
            it.setSystemQty(systemQty);
            it.setCountedQty(countedQty);
            it.setDiffQty(diff);
            items.add(it);
        }
        st.getItems().addAll(items);

        if (req.submit()) {
            st.setStatus(StocktakeStatus.SUBMITTED);
            st.setSubmittedAt(Instant.now());
            // Apply counted quantities to inventory
            for (StocktakeItem it : items) {
                InventoryStock stock = stockRepo.findOne(storeId, it.getProduct().getId())
                        .orElseGet(() -> {
                            InventoryStock s = new InventoryStock();
                            s.setId(new InventoryStockId(storeId, it.getProduct().getId()));
                            s.setStore(store);
                            s.setProduct(it.getProduct());
                            s.setQuantity(BigDecimal.ZERO);
                            return s;
                        });
                stock.setQuantity(it.getCountedQty());
                stockRepo.save(stock);
            }
        }

        Stocktake saved = stocktakes.save(st);
        return StocktakeDto.from(saved);
    }

    @GetMapping("/stocktakes")
    public List<StocktakeDto> listStocktakes(@PathVariable Long storeId, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        return stocktakes.findByStoreId(storeId).stream().map(StocktakeDto::from).toList();
    }
}

