package com.selfmall.order;

import com.selfmall.core.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("local")
class QuoteIntegrationTest {
    @Autowired MockMvc mvc;
    @MockitoBean ProductClient products;
    @Test void quoteUsesServerPriceAndAuthenticatedMember() throws Exception {
        when(products.detail(1)).thenReturn(ApiResponse.ok(new ProductView(1,"SKU","商品",new BigDecimal("99.00"))));
        mvc.perform(post("/api/orders/quote").with(jwt().jwt(j -> j.subject("10001")))
            .contentType("application/json").content("{\"productId\":1,\"quantity\":2}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalAmount").value(198.0))
            .andExpect(jsonPath("$.data.memberId").value("10001"));
    }
    @Test void rejectsZeroQuantity() throws Exception {
        mvc.perform(post("/api/orders/quote").with(jwt()).contentType("application/json").content("{\"productId\":1,\"quantity\":0}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(products);
    }
    @Test void rejectsAnonymousQuote() throws Exception {
        mvc.perform(post("/api/orders/quote").contentType("application/json").content("{\"productId\":1,\"quantity\":2}"))
            .andExpect(status().isUnauthorized());
    }
}
