package com.selfmall.order;

import com.selfmall.core.*;
import feign.FeignException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** A price quote only: does not create an order or reserve inventory. */
@RestController
@RequestMapping("/api/orders")
public class QuoteController {
    private final ProductClient products;
    public QuoteController(ProductClient products) { this.products = products; }
    public record QuoteRequest(@Positive long productId, @Min(1) @Max(99) int quantity) {}
    public record Quote(String memberId, long productId, int quantity, BigDecimal unitPrice, BigDecimal totalAmount) {}
    @PostMapping("/quote")
    public ApiResponse<Quote> quote(@Valid @RequestBody QuoteRequest request, @AuthenticationPrincipal Jwt jwt) {
        ProductView product;
        try { product = products.detail(request.productId()).data(); }
        catch (FeignException.NotFound e) { throw new ResponseStatusException(HttpStatus.NOT_FOUND, "商品不存在"); }
        catch (FeignException e) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "商品服务暂时不可用"); }
        if (product == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "商品服务返回异常");
        return ApiResponse.ok(new Quote(jwt.getSubject(), product.id(), request.quantity(), product.price(),
            product.price().multiply(BigDecimal.valueOf(request.quantity()))));
    }
}
