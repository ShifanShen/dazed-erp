package com.example.dazederp.api;

import com.example.dazederp.domain.Product;
import com.example.dazederp.domain.ProductCategory;
import com.example.dazederp.repo.ProductCategoryRepository;
import com.example.dazederp.repo.ProductRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductRepository products;
    private final ProductCategoryRepository categories;

    public ProductController(ProductRepository products, ProductCategoryRepository categories) {
        this.products = products;
        this.categories = categories;
    }

    @GetMapping
    public List<ProductDto> list(@RequestParam(required = false) Long categoryId,
                                  @RequestParam(required = false) String search) {
        List<Product> list;
        if (search != null && !search.trim().isEmpty()) {
            // 搜索时，如果指定了类目，需要进一步过滤
            list = products.search(search.trim());
            if (categoryId != null) {
                list = list.stream()
                        .filter(p -> p.getCategory() != null && p.getCategory().getId().equals(categoryId))
                        .toList();
            }
        } else if (categoryId != null) {
            list = products.findByCategoryId(categoryId);
        } else {
            list = products.findByEnabledTrueOrderByName();
        }
        return list.stream().map(ProductDto::from).toList();
    }

    @GetMapping("/{id}")
    public ProductDto get(@PathVariable Long id) {
        Product p = products.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
        // Force load category if lazy
        if (p.getCategory() != null) {
            p.getCategory().getName();
        }
        return ProductDto.from(p);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public ProductDto create(@RequestBody @Valid CreateProductRequest req) {
        Product p = new Product();
        
        // 自动生成SKU：如果提供了SKU则使用，否则根据类目自动生成
        String sku;
        if (req.sku() != null && !req.sku().trim().isEmpty()) {
            sku = req.sku().trim();
            // 检查SKU是否已存在
            if (products.findBySku(sku).isPresent()) {
                throw new IllegalArgumentException("SKU已存在: " + sku);
            }
        } else {
            // 自动生成SKU：类目代码 + 自增编号
            if (req.categoryId() == null) {
                throw new IllegalArgumentException("创建商品时必须选择类目，以便自动生成SKU");
            }
            ProductCategory cat = categories.findById(req.categoryId())
                    .orElseThrow(() -> new IllegalArgumentException("类目不存在: " + req.categoryId()));
            
            // 使用类目的code作为前缀（例如：CAT-TEQ -> TEQ）
            String prefix = cat.getCode();
            // 如果code包含CAT-，则去掉前缀
            if (prefix.startsWith("CAT-")) {
                prefix = prefix.substring(4);
            }
            // 查找该类目下已有的最大编号
            String prefixPattern = prefix + "-%";
            List<Product> existingProducts = products.findByCategoryIdAndSkuPrefix(req.categoryId(), prefixPattern);
            
            int nextNumber = 1;
            if (!existingProducts.isEmpty()) {
                // 提取最大的编号
                for (Product existing : existingProducts) {
                    String existingSku = existing.getSku();
                    if (existingSku.startsWith(prefix + "-")) {
                        try {
                            String numberPart = existingSku.substring(prefix.length() + 1);
                            int num = Integer.parseInt(numberPart);
                            if (num >= nextNumber) {
                                nextNumber = num + 1;
                            }
                        } catch (NumberFormatException ignored) {
                            // 忽略格式不正确的SKU
                        }
                    }
                }
            }
            
            // 生成SKU：前缀-编号（例如：TEQ-001）
            sku = String.format("%s-%03d", prefix, nextNumber);
            
            // 确保SKU唯一性（理论上不应该冲突，但保险起见）
            int retryCount = 0;
            while (products.findBySku(sku).isPresent() && retryCount < 100) {
                nextNumber++;
                sku = String.format("%s-%03d", prefix, nextNumber);
                retryCount++;
            }
            if (retryCount >= 100) {
                throw new IllegalArgumentException("无法生成唯一的SKU，请手动指定");
            }
        }
        
        p.setSku(sku);
        p.setName(req.name().trim());
        p.setUnit(req.unit());
        if (req.categoryId() != null) {
            ProductCategory cat = categories.findById(req.categoryId())
                    .orElseThrow(() -> new IllegalArgumentException("类目不存在: " + req.categoryId()));
            p.setCategory(cat);
        }
        if (req.imageUrl() != null && !req.imageUrl().trim().isEmpty()) {
            p.setImageUrl(req.imageUrl().trim());
        }
        if (req.lowStockThreshold() != null && req.lowStockThreshold().compareTo(java.math.BigDecimal.ZERO) > 0) {
            p.setLowStockThreshold(req.lowStockThreshold());
        }
        Product saved = products.save(p);
        // 刷新实体以确保category被加载
        products.flush();
        // 重新查询以获取完整的关联数据（使用JOIN FETCH）
        Product reloaded = products.findByIdWithCategory(saved.getId()).orElse(saved);
        return ProductDto.from(reloaded);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public ProductDto update(@PathVariable Long id, @RequestBody @Valid UpdateProductRequest req) {
        Product p = products.findById(id).orElseThrow();
        if (req.name() != null) p.setName(req.name());
        if (req.unit() != null) p.setUnit(req.unit());
        if (req.categoryId() != null) {
            if (req.categoryId() == 0) {
                // 如果categoryId为0，表示清除类目
                p.setCategory(null);
            } else {
                ProductCategory cat = categories.findById(req.categoryId()).orElseThrow();
                p.setCategory(cat);
            }
        }
        if (req.imageUrl() != null) {
            p.setImageUrl(req.imageUrl());
        }
        if (req.lowStockThreshold() != null) {
            p.setLowStockThreshold(req.lowStockThreshold());
        }
        if (req.enabled() != null) p.setEnabled(req.enabled());
        Product saved = products.save(p);
        // 刷新实体以确保category被加载
        products.flush();
        // 重新查询以获取完整的关联数据（使用JOIN FETCH）
        Product reloaded = products.findByIdWithCategory(saved.getId()).orElse(saved);
        return ProductDto.from(reloaded);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        Product p = products.findById(id).orElseThrow();
        p.setEnabled(false);
        products.save(p);
    }

    public record ProductDto(
            Long id,
            String sku,
            String name,
            String unit,
            Long categoryId,
            String categoryName,
            String imageUrl,
            BigDecimal lowStockThreshold,
            boolean enabled
    ) {
        static ProductDto from(Product p) {
            return new ProductDto(
                    p.getId(),
                    p.getSku(),
                    p.getName(),
                    p.getUnit(),
                    p.getCategory() != null ? p.getCategory().getId() : null,
                    p.getCategory() != null ? p.getCategory().getName() : null,
                    p.getImageUrl(),
                    p.getLowStockThreshold(),
                    p.isEnabled()
            );
        }
    }

    public record CreateProductRequest(
            String sku,  // SKU可选，如果不提供则自动生成
            @NotBlank String name,
            @NotBlank String unit,
            Long categoryId,
            String imageUrl,
            BigDecimal lowStockThreshold
    ) {}

    public record UpdateProductRequest(
            String name,
            String unit,
            Long categoryId,
            String imageUrl,
            BigDecimal lowStockThreshold,
            Boolean enabled
    ) {}
}
