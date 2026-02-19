package com.example.dazederp.api;

import com.example.dazederp.domain.*;
import com.example.dazederp.repo.*;
import com.example.dazederp.security.StoreAccessService;
import com.example.dazederp.service.AuditLogService;
import com.example.dazederp.service.OrderNoGenerator;
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
@RequestMapping("/api/stores/{storeId}/sales")
public class SaleOrderController {
    private final StoreAccessService storeAccess;
    private final StoreRepository stores;
    private final ProductRepository products;
    private final SaleOrderRepository saleOrders;
    private final InventoryStockRepository stockRepo;
    private final OrderNoGenerator orderNoGenerator;
    private final AuditLogService auditLog;

    public SaleOrderController(StoreAccessService storeAccess,
                               StoreRepository stores,
                               ProductRepository products,
                               SaleOrderRepository saleOrders,
                               InventoryStockRepository stockRepo,
                               OrderNoGenerator orderNoGenerator,
                               AuditLogService auditLog) {
        this.storeAccess = storeAccess;
        this.stores = stores;
        this.products = products;
        this.saleOrders = saleOrders;
        this.stockRepo = stockRepo;
        this.orderNoGenerator = orderNoGenerator;
        this.auditLog = auditLog;
    }

    @GetMapping
    public List<SaleOrderDto> list(@PathVariable Long storeId,
                                   @RequestParam(required = false) String status,
                                   Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        List<SaleOrder> orders;
        if (status != null && !status.isEmpty()) {
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
    public SaleOrderDto get(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        SaleOrder order = saleOrders.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Sale order not found: " + id));
        if (!order.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Sale order does not belong to this store");
        }
        return SaleOrderDto.from(order);
    }

    @PostMapping
    @Transactional
    public SaleOrderDto create(@PathVariable Long storeId,
                              @RequestBody @Valid CreateSaleOrderRequest req,
                              Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);
        Store store = stores.findById(storeId).orElseThrow();

        SaleOrder order = new SaleOrder();
        order.setStore(store);
        order.setCreatedBy(user);
        order.setOrderNo(orderNoGenerator.generate());
        order.setCustomerName(req.customerName());
        order.setNote(req.note());
        order.setStatus(SaleOrderStatus.DRAFT);

        List<SaleOrderItem> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (SaleOrderItemRequest itemReq : req.items()) {
            Product product = products.findById(itemReq.productId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemReq.productId()));
            
            SaleOrderItem item = new SaleOrderItem();
            item.setSaleOrder(order);
            item.setProduct(product);
            item.setQuantity(itemReq.quantity());
            item.setUnitPrice(itemReq.unitPrice());
            
            BigDecimal itemTotal = itemReq.quantity().multiply(
                    itemReq.unitPrice() != null ? itemReq.unitPrice() : BigDecimal.ZERO
            );
            item.setTotalPrice(itemTotal);
            totalAmount = totalAmount.add(itemTotal);
            items.add(item);
        }

        order.setTotalAmount(totalAmount);
        order.getItems().addAll(items);

        if (req.submit()) {
            order.setStatus(SaleOrderStatus.SUBMITTED);
            order.setSubmittedAt(Instant.now());
            // Update inventory (decrease stock)
            for (SaleOrderItem item : items) {
                InventoryStock stock = stockRepo.findOne(storeId, item.getProduct().getId())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Insufficient stock for product: " + item.getProduct().getName()));
                
                BigDecimal newQuantity = stock.getQuantity().subtract(item.getQuantity());
                if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
                    throw new IllegalStateException(
                            "Insufficient stock for product: " + item.getProduct().getName() +
                            ". Available: " + stock.getQuantity() + ", Required: " + item.getQuantity());
                }
                
                stock.setQuantity(newQuantity);
                stockRepo.save(stock);
            }
        }

        SaleOrder saved = saleOrders.save(order);
        auditLog.log("CREATE", "SALE_ORDER", saved.getId(),
                "Created sale order: " + saved.getOrderNo(), user, store);
        
        return SaleOrderDto.from(saved);
    }

    @PostMapping("/{id}/submit")
    @Transactional
    public SaleOrderDto submit(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);
        SaleOrder order = saleOrders.findById(id).orElseThrow();
        
        if (!order.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Sale order does not belong to this store");
        }
        if (order.getStatus() != SaleOrderStatus.DRAFT) {
            throw new IllegalStateException("Sale order is already submitted or cancelled");
        }

        order.setStatus(SaleOrderStatus.SUBMITTED);
        order.setSubmittedAt(Instant.now());

        // Update inventory (decrease stock)
        for (SaleOrderItem item : order.getItems()) {
            InventoryStock stock = stockRepo.findOne(storeId, item.getProduct().getId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Insufficient stock for product: " + item.getProduct().getName()));
            
            BigDecimal newQuantity = stock.getQuantity().subtract(item.getQuantity());
            if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalStateException(
                        "Insufficient stock for product: " + item.getProduct().getName() +
                        ". Available: " + stock.getQuantity() + ", Required: " + item.getQuantity());
            }
            
            stock.setQuantity(newQuantity);
            stockRepo.save(stock);
        }

        SaleOrder saved = saleOrders.save(order);
        auditLog.log("SUBMIT", "SALE_ORDER", saved.getId(),
                "Submitted sale order: " + saved.getOrderNo(), user, order.getStore());
        
        return SaleOrderDto.from(saved);
    }

    @PostMapping("/{id}/cancel")
    @Transactional
    public SaleOrderDto cancel(@PathVariable Long storeId, @PathVariable Long id, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        AppUser user = storeAccess.requireCurrentUser(auth);
        SaleOrder order = saleOrders.findById(id).orElseThrow();
        
        if (!order.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Sale order does not belong to this store");
        }
        if (order.getStatus() != SaleOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft orders can be cancelled");
        }

        order.setStatus(SaleOrderStatus.CANCELLED);
        SaleOrder saved = saleOrders.save(order);
        
        auditLog.log("CANCEL", "SALE_ORDER", saved.getId(),
                "Cancelled sale order: " + saved.getOrderNo(), user, order.getStore());
        
        return SaleOrderDto.from(saved);
    }

    public record SaleOrderDto(
            Long id,
            Long storeId,
            String orderNo,
            String status,
            String customerName,
            String note,
            BigDecimal totalAmount,
            Instant createdAt,
            Instant submittedAt,
            String createdBy,
            List<SaleOrderItemDto> items
    ) {
        static SaleOrderDto from(SaleOrder order) {
            List<SaleOrderItemDto> items = order.getItems().stream()
                    .map(SaleOrderItemDto::from)
                    .toList();
            return new SaleOrderDto(
                    order.getId(),
                    order.getStore().getId(),
                    order.getOrderNo(),
                    order.getStatus().name(),
                    order.getCustomerName(),
                    order.getNote(),
                    order.getTotalAmount(),
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
            Product p = item.getProduct();
            return new SaleOrderItemDto(
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

    public record CreateSaleOrderRequest(
            String customerName,
            String note,
            boolean submit,
            @NotNull List<SaleOrderItemRequest> items
    ) {}

    public record SaleOrderItemRequest(
            @NotNull Long productId,
            @NotNull BigDecimal quantity,
            BigDecimal unitPrice
    ) {}
}
