package com.selfmall.gateway;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** 网关跨域配置，前缀 mall.gateway.cors。来源禁止使用 * 通配。 */
@Validated
@ConfigurationProperties(prefix = "mall.gateway.cors")
public class GatewayCorsProperties {
    @NotEmpty
    private List<String> allowedOrigins = new ArrayList<>(List.of("http://localhost:5173", "http://127.0.0.1:5173"));
    @NotEmpty
    private List<String> allowedMethods = new ArrayList<>(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    @NotEmpty
    private List<String> allowedHeaders = new ArrayList<>(List.of("Authorization", "Content-Type", "Idempotency-Key"));
    private List<String> exposedHeaders = new ArrayList<>(List.of("Retry-After"));
    @NotNull
    private Duration maxAge = Duration.ofMinutes(30);
    private boolean allowCredentials = false;

    @AssertTrue(message = "mall.gateway.cors.allowed-origins 不能包含空字符串或空白项")
    public boolean isOriginsNotBlank() {
        return allowedOrigins == null || allowedOrigins.stream().allMatch(o -> o != null && !o.isBlank());
    }

    @AssertTrue(message = "mall.gateway.cors.allowed-origins 不允许包含 * 通配（含 https://*.example.com 这类模式），必须列出完整来源")
    public boolean isOriginsWithoutWildcard() {
        return !anyContainsWildcard(allowedOrigins);
    }

    @AssertTrue(message = "mall.gateway.cors.allowed-methods 不允许包含 *，请逐个列出方法")
    public boolean isMethodsWithoutWildcard() {
        return !anyContainsWildcard(allowedMethods);
    }

    @AssertTrue(message = "mall.gateway.cors.allowed-headers 不允许包含 *，请逐个列出请求头")
    public boolean isHeadersWithoutWildcard() {
        return !anyContainsWildcard(allowedHeaders);
    }

    @AssertTrue(message = "mall.gateway.cors.exposed-headers 不允许包含 *，请逐个列出暴露头")
    public boolean isExposedHeadersWithoutWildcard() {
        return !anyContainsWildcard(exposedHeaders);
    }

    @AssertTrue(message = "mall.gateway.cors.allow-credentials=true 时，allowed-origins、allowed-methods、allowed-headers、exposed-headers 均不得包含 *")
    public boolean isCredentialsWithoutWildcard() {
        return !allowCredentials || !(anyContainsWildcard(allowedOrigins) || anyContainsWildcard(allowedMethods)
            || anyContainsWildcard(allowedHeaders) || anyContainsWildcard(exposedHeaders));
    }

    private static boolean anyContainsWildcard(List<String> values) {
        return values != null && values.stream().anyMatch(v -> v != null && v.contains("*"));
    }

    public List<String> getAllowedOrigins() { return allowedOrigins; }
    public void setAllowedOrigins(List<String> v) { this.allowedOrigins = v; }
    public List<String> getAllowedMethods() { return allowedMethods; }
    public void setAllowedMethods(List<String> v) { this.allowedMethods = v; }
    public List<String> getAllowedHeaders() { return allowedHeaders; }
    public void setAllowedHeaders(List<String> v) { this.allowedHeaders = v; }
    public List<String> getExposedHeaders() { return exposedHeaders; }
    public void setExposedHeaders(List<String> v) { this.exposedHeaders = v; }
    public Duration getMaxAge() { return maxAge; }
    public void setMaxAge(Duration v) { this.maxAge = v; }
    public boolean isAllowCredentials() { return allowCredentials; }
    public void setAllowCredentials(boolean v) { this.allowCredentials = v; }
}
