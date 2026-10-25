package com.selfmall.product;

import com.selfmall.core.*;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final JdbcClient jdbc;
    public ProductController(JdbcClient jdbc) { this.jdbc = jdbc; }
    @GetMapping
    public ApiResponse<List<ProductView>> list(@RequestParam(defaultValue="0") int page,
                                                @RequestParam(defaultValue="20") int size) {
        if (page < 0 || page > 10000 || size < 1 || size > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "分页参数超出范围");
        return ApiResponse.ok(jdbc.sql("SELECT id, sku_code, name, price FROM product WHERE enabled = TRUE ORDER BY id LIMIT :size OFFSET :offset")
            .param("size", size).param("offset", page * size).query(ProductView.class).list());
    }
    @GetMapping("/{id}")
    public ApiResponse<ProductView> detail(@PathVariable long id) {
        return ApiResponse.ok(jdbc.sql("SELECT id, sku_code, name, price FROM product WHERE id = :id AND enabled = TRUE")
            .param("id", id).query(ProductView.class).optional()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "商品不存在")));
    }
}
