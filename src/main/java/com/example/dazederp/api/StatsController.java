package com.example.dazederp.api;

import com.example.dazederp.domain.SaleOrder;
import com.example.dazederp.repo.*;
import com.example.dazederp.security.StoreAccessService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/stats")
public class StatsController {
    private final StoreAccessService storeAccess;
    private final InventoryStockRepository stockRepo;
    private final SaleOrderRepository saleOrders;
    private final SaleOrderItemRepository saleOrderItems;
    private final ProductRepository products;

    public StatsController(StoreAccessService storeAccess,
                          InventoryStockRepository stockRepo,
                          SaleOrderRepository saleOrders,
                          SaleOrderItemRepository saleOrderItems,
                          ProductRepository products) {
        this.storeAccess = storeAccess;
        this.stockRepo = stockRepo;
        this.saleOrders = saleOrders;
        this.saleOrderItems = saleOrderItems;
        this.products = products;
    }

    @GetMapping("/dashboard")
    public DashboardStatsDto getDashboard(@PathVariable Long storeId, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);
        LocalDate monthStart = today.withDayOfMonth(1);
        
        Instant todayStart = today.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant weekStartInstant = weekStart.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant monthStartInstant = monthStart.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant now = Instant.now();

        // Total products count
        long totalProducts = products.count();
        
        // Low stock products count
        long lowStockCount = stockRepo.findByStoreIdWithProduct(storeId).stream()
                .filter(stock -> {
                    BigDecimal threshold = stock.getProduct().getLowStockThreshold();
                    return threshold != null && stock.getQuantity().compareTo(threshold) < 0;
                })
                .count();

        // Total inventory value (simplified - using current stock)
        BigDecimal totalInventoryValue = stockRepo.findByStoreIdWithProduct(storeId).stream()
                .map(stock -> {
                    // Use a default price if not available
                    BigDecimal price = BigDecimal.valueOf(100); // Default price
                    return stock.getQuantity().multiply(price);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Today's sales
        BigDecimal todaySales = saleOrderItems.sumTotalAmountByStoreAndDateRange(
                storeId, todayStart, now);

        // This week's sales
        BigDecimal weekSales = saleOrderItems.sumTotalAmountByStoreAndDateRange(
                storeId, weekStartInstant, now);

        // This month's sales
        BigDecimal monthSales = saleOrderItems.sumTotalAmountByStoreAndDateRange(
                storeId, monthStartInstant, now);

        // Recent orders count
        long recentOrdersCount = saleOrders.findSubmittedByStoreAndDateRange(
                storeId, weekStartInstant, now).size();

        return new DashboardStatsDto(
                totalProducts,
                lowStockCount,
                totalInventoryValue,
                todaySales != null ? todaySales : BigDecimal.ZERO,
                weekSales != null ? weekSales : BigDecimal.ZERO,
                monthSales != null ? monthSales : BigDecimal.ZERO,
                recentOrdersCount
        );
    }

    @GetMapping("/sales-trend")
    public List<SalesTrendDto> getSalesTrend(@PathVariable Long storeId,
                                            @RequestParam(defaultValue = "7") int days,
                                            Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);
        
        Map<LocalDate, BigDecimal> dailySales = new HashMap<>();
        for (int i = 0; i < days; i++) {
            dailySales.put(startDate.plusDays(i), BigDecimal.ZERO);
        }

        Instant startInstant = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endInstant = endDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        
        List<SaleOrder> orders = saleOrders.findSubmittedByStoreAndDateRange(
                storeId, startInstant, endInstant);

        for (SaleOrder order : orders) {
            LocalDate orderDate = LocalDate.ofInstant(order.getCreatedAt(), ZoneId.systemDefault());
            if (orderDate.isAfter(startDate.minusDays(1)) && orderDate.isBefore(endDate.plusDays(1))) {
                BigDecimal current = dailySales.getOrDefault(orderDate, BigDecimal.ZERO);
                dailySales.put(orderDate, current.add(order.getTotalAmount()));
            }
        }

        return dailySales.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new SalesTrendDto(entry.getKey().toString(), entry.getValue()))
                .toList();
    }

    @GetMapping("/top-products")
    public List<TopProductDto> getTopProducts(@PathVariable Long storeId,
                                              @RequestParam(defaultValue = "7") int days,
                                              @RequestParam(defaultValue = "10") int limit,
                                              Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);
        
        Instant startInstant = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endInstant = endDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        
        List<Object[]> results = saleOrderItems.findTopProductsByStoreAndDateRange(
                storeId, startInstant, endInstant);

        return results.stream()
                .limit(limit)
                .map(row -> {
                    Long productId = (Long) row[0];
                    BigDecimal quantity = (BigDecimal) row[1];
                    BigDecimal totalAmount = (BigDecimal) row[2];
                    
                    String productName = products.findById(productId)
                            .map(p -> p.getName())
                            .orElse("Unknown");
                    
                    return new TopProductDto(productId, productName, quantity, totalAmount);
                })
                .toList();
    }

    public record DashboardStatsDto(
            long totalProducts,
            long lowStockCount,
            BigDecimal totalInventoryValue,
            BigDecimal todaySales,
            BigDecimal weekSales,
            BigDecimal monthSales,
            long recentOrdersCount
    ) {}

    public record SalesTrendDto(
            String date,
            BigDecimal amount
    ) {}

    public record TopProductDto(
            Long productId,
            String productName,
            BigDecimal quantity,
            BigDecimal totalAmount
    ) {}
}
