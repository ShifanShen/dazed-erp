package com.example.dazederp.api;

import com.example.dazederp.domain.ProductCategory;
import com.example.dazederp.repo.ProductCategoryRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class ProductCategoryController {
    private final ProductCategoryRepository categories;

    public ProductCategoryController(ProductCategoryRepository categories) {
        this.categories = categories;
    }

    @GetMapping
    public List<CategoryDto> list() {
        return categories.findByEnabledTrueOrderByName().stream()
                .map(CategoryDto::from)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public CategoryDto create(@RequestBody @Valid CreateCategoryRequest req) {
        // Check if code already exists
        if (categories.findByCode(req.code()).isPresent()) {
            throw new IllegalArgumentException("Category code already exists: " + req.code());
        }
        ProductCategory cat = new ProductCategory();
        cat.setCode(req.code());
        cat.setName(req.name());
        cat.setDescription(req.description());
        ProductCategory saved = categories.save(cat);
        return CategoryDto.from(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public CategoryDto update(@PathVariable Long id, @RequestBody @Valid UpdateCategoryRequest req) {
        ProductCategory cat = categories.findById(id).orElseThrow();
        if (req.name() != null) cat.setName(req.name());
        if (req.description() != null) cat.setDescription(req.description());
        if (req.enabled() != null) cat.setEnabled(req.enabled());
        ProductCategory saved = categories.save(cat);
        return CategoryDto.from(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        ProductCategory cat = categories.findById(id).orElseThrow();
        cat.setEnabled(false);
        categories.save(cat);
    }

    public record CategoryDto(Long id, String code, String name, String description) {
        static CategoryDto from(ProductCategory cat) {
            return new CategoryDto(
                    cat.getId(),
                    cat.getCode(),
                    cat.getName(),
                    cat.getDescription()
            );
        }
    }

    public record CreateCategoryRequest(
            @NotBlank String code,
            @NotBlank String name,
            String description
    ) {}

    public record UpdateCategoryRequest(
            String name,
            String description,
            Boolean enabled
    ) {}
}
