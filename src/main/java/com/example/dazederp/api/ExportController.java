package com.example.dazederp.api;

import com.example.dazederp.domain.InventoryStock;
import com.example.dazederp.domain.Product;
import com.example.dazederp.repo.InventoryStockRepository;
import com.example.dazederp.repo.StocktakeRepository;
import com.example.dazederp.security.StoreAccessService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/export")
public class ExportController {
    private final StoreAccessService storeAccess;
    private final InventoryStockRepository stockRepo;
    private final StocktakeRepository stocktakes;

    public ExportController(StoreAccessService storeAccess,
                           InventoryStockRepository stockRepo,
                           StocktakeRepository stocktakes) {
        this.storeAccess = storeAccess;
        this.stockRepo = stockRepo;
        this.stocktakes = stocktakes;
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ByteArrayResource> exportLowStock(@PathVariable Long storeId,
                                                             Authentication auth) throws IOException {
        storeAccess.assertCanAccessStore(auth, storeId);
        List<InventoryStock> stocks = stockRepo.findByStoreIdWithProduct(storeId);
        
        List<LowStockItem> lowStockItems = stocks.stream()
                .filter(s -> {
                    Product p = s.getProduct();
                    if (p.getLowStockThreshold() == null) return false;
                    return s.getQuantity().compareTo(p.getLowStockThreshold()) < 0;
                })
                .map(s -> new LowStockItem(
                        s.getProduct().getSku(),
                        s.getProduct().getName(),
                        s.getProduct().getUnit(),
                        s.getQuantity(),
                        s.getProduct().getLowStockThreshold()
                ))
                .toList();

        return generateCSV(lowStockItems, "low_stock_" + storeId + ".csv");
    }

    @GetMapping("/stocktake/{stocktakeId}/shortage")
    public ResponseEntity<ByteArrayResource> exportStocktakeShortage(
            @PathVariable Long storeId,
            @PathVariable Long stocktakeId,
            Authentication auth) throws IOException {
        storeAccess.assertCanAccessStore(auth, storeId);
        
        var stocktake = stocktakes.findById(stocktakeId).orElseThrow();
        if (!stocktake.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Stocktake does not belong to this store");
        }

        List<ShortageItem> shortageItems = stocktake.getItems().stream()
                .filter(item -> item.getDiffQty().signum() < 0)
                .map(item -> new ShortageItem(
                        item.getProduct().getSku(),
                        item.getProduct().getName(),
                        item.getProduct().getUnit(),
                        item.getSystemQty(),
                        item.getCountedQty(),
                        item.getDiffQty().abs()
                ))
                .toList();

        return generateCSV(shortageItems, "shortage_" + stocktakeId + ".csv");
    }

    private <T> ResponseEntity<ByteArrayResource> generateCSV(List<T> items, String filename) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        OutputStreamWriter writer = new OutputStreamWriter(baos, StandardCharsets.UTF_8);
        
        // BOM for Excel UTF-8 support
        baos.write(0xEF);
        baos.write(0xBB);
        baos.write(0xBF);
        
        if (items.isEmpty()) {
            writer.write("No data\n");
        } else {
            // Write header
            T first = items.get(0);
            if (first instanceof LowStockItem) {
                writer.write("SKU,商品名称,单位,当前库存,低库存阈值\n");
                @SuppressWarnings("unchecked")
                List<LowStockItem> lowStockList = (List<LowStockItem>) items;
                for (LowStockItem item : lowStockList) {
                    writer.write(String.format("%s,%s,%s,%s,%s\n",
                            escapeCSV(item.sku()),
                            escapeCSV(item.name()),
                            escapeCSV(item.unit()),
                            item.currentQty(),
                            item.threshold()));
                }
            } else if (first instanceof ShortageItem) {
                writer.write("SKU,商品名称,单位,系统库存,盘点数量,短缺数量\n");
                @SuppressWarnings("unchecked")
                List<ShortageItem> shortageList = (List<ShortageItem>) items;
                for (ShortageItem item : shortageList) {
                    writer.write(String.format("%s,%s,%s,%s,%s,%s\n",
                            escapeCSV(item.sku()),
                            escapeCSV(item.name()),
                            escapeCSV(item.unit()),
                            item.systemQty(),
                            item.countedQty(),
                            item.shortageQty()));
                }
            }
        }
        
        writer.flush();
        writer.close();
        
        ByteArrayResource resource = new ByteArrayResource(baos.toByteArray());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(resource);
    }

    private String escapeCSV(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    public record LowStockItem(String sku, String name, String unit,
                              java.math.BigDecimal currentQty,
                              java.math.BigDecimal threshold) {}

    public record ShortageItem(String sku, String name, String unit,
                               java.math.BigDecimal systemQty,
                               java.math.BigDecimal countedQty,
                               java.math.BigDecimal shortageQty) {}
}
