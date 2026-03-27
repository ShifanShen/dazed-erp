package com.example.dazederp.api;

import com.example.dazederp.domain.AppUser;
import com.example.dazederp.domain.Product;
import com.example.dazederp.domain.SaleOrder;
import com.example.dazederp.domain.SaleOrderItem;
import com.example.dazederp.domain.SaleOrderStatus;
import com.example.dazederp.domain.Store;
import com.example.dazederp.repo.ProductRepository;
import com.example.dazederp.repo.SaleOrderRepository;
import com.example.dazederp.repo.StoreRepository;
import com.example.dazederp.security.StoreAccessService;
import com.example.dazederp.service.AuditLogService;
import com.example.dazederp.service.InventoryFlowService;
import com.example.dazederp.service.OrderNoGenerator;
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
@RequestMapping("/api/stores/{storeId}/sales")
public class SaleOrderController {
    private final StoreAccessService storeAccess;
    private final StoreRepository stores;
    private final ProductRepository products;
    private final SaleOrderRepository saleOrders;
    private final InventoryFlowService inventoryFlow;
    private final OrderNoGenerator orderNoGenerator;
    private final AuditLogService auditLog;

    public SaleOrderController(StoreAccessService storeAccess,
                               StoreRepository stores,
                               ProductRepository products,
                               SaleOrderRepository saleOrders,
                               InventoryFlowService inventoryFlow,
                               OrderNoGenerator orderNoGenerator,
                               AuditLogService auditLog) {
        this.storeAccess = storeAccess;
        this.stores = stores;
        this.products = products;
        this.saleOrders = saleOrders;
        this.inventoryFlow = inventoryFlow;
        this.orderNoGenerator = orderNoGenerator;
        this.auditLog = auditLog;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<SaleOrderDto> list(@PathVariable Long storeId,
                                   @RequestParam(required = false) String status,
                                   Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        List<SaleOrder> orders;
        if (status != null && !status.isBlank()) {
            try {
                SaleOrderStatus orderStatus = SaleOrderStatus.valueOf(status.toUpperCase());
                orders = saleOrders.findByStoreIdAndStatusOrderByCreatedAtDesc(storeId, orderStatus);
            } catch (IllegalArgumentException e) {
                orders = saleOrders.findByStoreIdOrderByCreatedAtDesc(storeId);
            }
        } else {
            orders = saleOrders.findByStoreIdOrderByCreatedAtDesc(storeId);
        }
        return orders.stream().map(SaleOrderDto::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public SaleOrderDto get(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        SaleOrder order = saleOrders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sale order not found: " + id));
        assertBelongsToStore(order, storeId);
        return SaleOrderDto.from(order);
    }

    @PostMapping
    @Transactional
    public SaleOrderDto create(@PathVariable Long storeId,
                               @RequestBody @Valid SaveSaleOrderRequest req,
                               Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);
        Store store = stores.findById(storeId).orElseThrow();

        SaleOrder order = new SaleOrder();
        order.setStore(store);
        order.setCreatedBy(user);
        order.setOrderNo(orderNoGenerator.generate());

        applyDraftValues(order, req);
        if (req.submit()) {
            markSubmitted(order);
        }

        SaleOrder saved = saleOrders.save(order);
        if (saved.getStatus() == SaleOrderStatus.SUBMITTED) {
            inventoryFlow.applySaleOut(saved, user);
        }

        auditLog.log(saved.getStatus() == SaleOrderStatus.SUBMITTED ? "CREATE_AND_SUBMIT" : "CREATE",
                "SALE_ORDER", saved.getId(), "Created sale order: " + saved.getOrderNo(), user, store);

        return SaleOrderDto.from(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public SaleOrderDto update(@PathVariable Long storeId,
                               @PathVariable Long id,
                               @RequestBody @Valid SaveSaleOrderRequest req,
                               Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);

        SaleOrder order = saleOrders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sale order not found: " + id));
        assertBelongsToStore(order, storeId);
        requireDraft(order);

        applyDraftValues(order, req);
        if (req.submit()) {
            markSubmitted(order);
            inventoryFlow.applySaleOut(order, user);
        }

        SaleOrder saved = saleOrders.save(order);
        auditLog.log(saved.getStatus() == SaleOrderStatus.SUBMITTED ? "UPDATE_AND_SUBMIT" : "UPDATE",
                "SALE_ORDER", saved.getId(), "Updated sale order: " + saved.getOrderNo(), user, saved.getStore());

        return SaleOrderDto.from(saved);
    }

    @PostMapping("/{id}/submit")
    @Transactional
    public SaleOrderDto submit(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);
        SaleOrder order = saleOrders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sale order not found: " + id));

        assertBelongsToStore(order, storeId);
        requireDraft(order);

        markSubmitted(order);
        inventoryFlow.applySaleOut(order, user);

        SaleOrder saved = saleOrders.save(order);
        auditLog.log("SUBMIT", "SALE_ORDER", saved.getId(),
                "Submitted sale order: " + saved.getOrderNo(), user, saved.getStore());

        return SaleOrderDto.from(saved);
    }

    @PostMapping("/{id}/cancel")
    @Transactional
    public SaleOrderDto cancel(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);
        SaleOrder order = saleOrders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sale order not found: " + id));

        assertBelongsToStore(order, storeId);
        requireDraft(order);

        order.setStatus(SaleOrderStatus.CANCELLED);
        SaleOrder saved = saleOrders.save(order);

        auditLog.log("CANCEL", "SALE_ORDER", saved.getId(),
                "Cancelled sale order: " + saved.getOrderNo(), user, saved.getStore());

        return SaleOrderDto.from(saved);
    }

    private void applyDraftValues(SaleOrder order, SaveSaleOrderRequest req) {
        order.setCustomerName(normalize(req.customerName()));
        order.setNote(normalize(req.note()));
        order.setStatus(SaleOrderStatus.DRAFT);
        order.setSubmittedAt(null);

        List<SaleOrderItem> items = buildItems(order, req.items());
        order.getItems().clear();
        order.getItems().addAll(items);

        BigDecimal totalAmount = items.stream()
                .map(SaleOrderItem::getTotalPrice)
                .map(value -> value != null ? value : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setTotalAmount(totalAmount);
    }

    private List<SaleOrderItem> buildItems(SaleOrder order, List<SaleOrderItemRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Please add at least one sale item");
        }

        List<SaleOrderItem> items = new ArrayList<>();
        Set<Long> seenProducts = new HashSet<>();

        for (SaleOrderItemRequest request : requests) {
            if (request.productId() == null) {
                throw new IllegalArgumentException("Sale item is missing productId");
            }
            if (!seenProducts.add(request.productId())) {
                throw new IllegalArgumentException("Duplicate product in sale items: " + request.productId());
            }
            if (request.quantity() == null || request.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Sale quantity must be greater than 0");
            }
            if (request.unitPrice() != null && request.unitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Sale unit price cannot be negative");
            }

            Product product = products.findById(request.productId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + request.productId()));
            if (!product.isEnabled()) {
                throw new IllegalArgumentException("Product is disabled: " + product.getName());
            }

            SaleOrderItem item = new SaleOrderItem();
            item.setSaleOrder(order);
            item.setProduct(product);
            item.setQuantity(request.quantity());
            item.setUnitPrice(request.unitPrice());
            item.setTotalPrice(request.quantity().multiply(
                    request.unitPrice() != null ? request.unitPrice() : BigDecimal.ZERO
            ));
            items.add(item);
        }

        return items;
    }

    private void markSubmitted(SaleOrder order) {
        order.setStatus(SaleOrderStatus.SUBMITTED);
        order.setSubmittedAt(Instant.now());
    }

    private void assertBelongsToStore(SaleOrder order, Long storeId) {
        if (!order.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Sale order does not belong to this store");
        }
    }

    private void requireDraft(SaleOrder order) {
        if (order.getStatus() != SaleOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft sale orders can be changed");
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record SaleOrderDto(
            Long id,
            Long storeId,
            String orderNo,
            String status,
            String customerName,
            String note,
            BigDecimal totalAmount,
            BigDecimal totalQuantity,
            int itemCount,
            Instant createdAt,
            Instant submittedAt,
            String createdBy,
            List<SaleOrderItemDto> items
    ) {
        static SaleOrderDto from(SaleOrder order) {
            List<SaleOrderItemDto> items = order.getItems().stream()
                    .map(SaleOrderItemDto::from)
                    .toList();

            BigDecimal totalQuantity = items.stream()
                    .map(SaleOrderItemDto::quantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            return new SaleOrderDto(
                    order.getId(),
                    order.getStore().getId(),
                    order.getOrderNo(),
                    order.getStatus().name(),
                    order.getCustomerName(),
                    order.getNote(),
                    order.getTotalAmount(),
                    totalQuantity,
                    items.size(),
                    order.getCreatedAt(),
                    order.getSubmittedAt(),
                    order.getCreatedBy() != null ? order.getCreatedBy().getDisplayName() : null,
                    items
            );
        }
    }

    public record SaleOrderItemDto(
            Long id,
            Long productId,
            String productName,
            String productSku,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal totalPrice
    ) {
        static SaleOrderItemDto from(SaleOrderItem item) {
            Product product = item.getProduct();
            return new SaleOrderItemDto(
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

    public record SaveSaleOrderRequest(
            String customerName,
            String note,
            boolean submit,
            @NotNull List<SaleOrderItemRequest> items
    ) {
    }

    public record SaleOrderItemRequest(
            @NotNull Long productId,
            @NotNull BigDecimal quantity,
            BigDecimal unitPrice
    ) {
    }
}
