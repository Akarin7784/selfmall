package com.selfmall.product;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("local")
class ProductIntegrationTest {
    @Autowired MockMvc mvc;
    @Test void seededProductIsPublic() throws Exception {
        mvc.perform(get("/api/products/1")).andExpect(status().isOk()).andExpect(jsonPath("$.data.price").value(99.0));
    }
    @Test void missingProductIs404() throws Exception { mvc.perform(get("/api/products/999")).andExpect(status().isNotFound()); }
    @Test void rejectsInvalidPage() throws Exception { mvc.perform(get("/api/products?size=101")).andExpect(status().isBadRequest()); }
    @Test void nonPublicPathRequiresToken() throws Exception { mvc.perform(post("/api/products")).andExpect(status().isUnauthorized()); }
}
