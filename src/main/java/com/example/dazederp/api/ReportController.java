package com.example.dazederp.api;

import com.example.dazederp.domain.SaleOrder;
import com.example.dazederp.repo.*;
import com.example.dazederp.security.StoreAccessService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/reports")
public class ReportController {
    private final StoreAccessService storeAccess;
    private final SaleOrderRepository saleOrders;
    private final InventoryStockRepository stockRepo;

    public ReportController(StoreAccessService storeAccess,
                           SaleOrderRepository saleOrders,
                           InventoryStockRepository stockRepo) {
        this.storeAccess = storeAccess;
        this.saleOrders = saleOrders;
        this.stockRepo = stockRepo;
    }

    @GetMapping("/sales")
    public SalesReportDto getSalesReport(@PathVariable Long storeId,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                        Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        
        Instant startInstant = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endInstant = endDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        
        List<SaleOrder> orders = saleOrders.findSubmittedByStoreAndDateRange(
                storeId, startInstant, endInstant);
        
        BigDecimal totalAmount = orders.stream()
                .map(SaleOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        long orderCount = orders.size();
        BigDecimal avgOrderAmount = orderCount > 0 
                ? totalAmount.divide(BigDecimal.valueOf(orderCount), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        
        return new SalesReportDto(
                startDate.toString(),
                endDate.toString(),
                orderCount,
                totalAmount,
                avgOrderAmount
        );
    }

    @GetMapping("/inventory")
    public InventoryReportDto getInventoryReport(@PathVariable Long storeId, Authentication auth) {
        storeAccess.assertCanAccessStore(auth, storeId);
        
        var stocks = stockRepo.findByStoreIdWithProduct(storeId);
        
        long totalProducts = stocks.size();
        long lowStockProducts = stocks.stream()
                .filter(stock -> {
                    BigDecimal threshold = stock.getProduct().getLowStockThreshold();
                    return threshold != null && stock.getQuantity().compareTo(threshold) < 0;
                })
                .count();
        
        long outOfStockProducts = stocks.stream()
                .filter(stock -> stock.getQuantity().compareTo(BigDecimal.ZERO) <= 0)
                .count();
        
        BigDecimal totalValue = stocks.stream()
                .map(stock -> {
                    BigDecimal price = BigDecimal.valueOf(100); // Default price
                    return stock.getQuantity().multiply(price);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        return new InventoryReportDto(
                totalProducts,
                lowStockProducts,
                outOfStockProducts,
                totalValue
        );
    }

    public record SalesReportDto(
            String startDate,
            String endDate,
            long orderCount,
            BigDecimal totalAmount,
            BigDecimal avgOrderAmount
    ) {}

    public record InventoryReportDto(
            long totalProducts,
            long lowStockProducts,
            long outOfStockProducts,
            BigDecimal totalValue
    ) {}
}
