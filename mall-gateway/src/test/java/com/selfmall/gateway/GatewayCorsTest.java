package com.selfmall.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GatewayCorsTest {
    static final MockWebServer upstream = new MockWebServer();

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) throws IOException {
        upstream.start();
        String url = "http://localhost:" + upstream.getPort();
        String prefix = "spring.cloud.gateway.server.webflux.routes[0].";
        r.add(prefix + "id", () -> "mall-product");
        r.add(prefix + "uri", () -> url);
        r.add(prefix + "predicates[0]", () -> "Path=/api/products,/api/products/**");
    }

    @AfterAll
    static void stop() throws IOException { upstream.shutdown(); }

    @LocalServerPort int port;
    WebTestClient client;

    @BeforeEach
    void setUp() {
        // 绑定真实端口，保证请求带完整 Host，CORS 判断与浏览器一致
        client = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void allowedOriginPreflightReturnsHeadersWithoutToken() {
        client.options().uri("/api/orders/quote")
            .header(HttpHeaders.ORIGIN, "http://localhost:5173")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type,Idempotency-Key")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173")
            .expectHeader().value(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, v -> assertThat(v).contains("POST", "PATCH", "DELETE"))
            .expectHeader().value(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, v -> assertThat(v.toLowerCase()).contains("authorization", "content-type", "idempotency-key"))
            .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_MAX_AGE, "1800");
    }

    @Test
    void loopbackOriginAllowed() {
        client.options().uri("/api/members/me")
            .header(HttpHeaders.ORIGIN, "http://127.0.0.1:5173")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://127.0.0.1:5173");
    }

    @Test
    void disallowedOriginPreflightHasNoAllowOrigin() {
        client.options().uri("/api/orders/quote")
            .header(HttpHeaders.ORIGIN, "http://evil.example.com")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
            .exchange()
            .expectStatus().isForbidden()
            .expectHeader().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN);
    }

    @Test
    void actualRequestWithAllowedOriginCarriesCorsHeaders() {
        upstream.enqueue(new MockResponse().setHeader("Content-Type", "application/json")
            .setBody("{\"code\":\"OK\",\"message\":\"success\",\"data\":[]}"));
        client.get().uri("/api/products?page=0&size=20")
            .header(HttpHeaders.ORIGIN, "http://localhost:5173")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173")
            .expectHeader().value(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, v -> assertThat(v).contains("Retry-After"));
    }

    @Test
    void protectedPathStillRequiresToken() {
        client.get().uri("/api/members/me")
            .header(HttpHeaders.ORIGIN, "http://localhost:5173")
            .exchange()
            .expectStatus().isUnauthorized();
    }
}
