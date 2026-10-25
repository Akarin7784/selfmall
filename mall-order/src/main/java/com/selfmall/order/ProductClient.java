package com.selfmall.order;

import com.selfmall.core.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
@FeignClient(name="mall-product", url="${mall-clients.product-url:}")
public interface ProductClient {
    @GetMapping("/api/products/{id}")
    ApiResponse<ProductView> detail(@PathVariable("id") long id);
}
