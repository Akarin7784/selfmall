package com.selfmall.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class GatewayCorsPropertiesTest {
    @EnableConfigurationProperties(GatewayCorsProperties.class)
    static class PropsOnly {}

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
        .withUserConfiguration(PropsOnly.class);

    @Test
    void defaultsAllowOnlyLocalFrontend() {
        runner.run(ctx -> {
            assertThat(ctx).hasNotFailed();
            GatewayCorsProperties p = ctx.getBean(GatewayCorsProperties.class);
            assertThat(p.getAllowedOrigins()).containsExactly("http://localhost:5173", "http://127.0.0.1:5173");
            assertThat(p.getExposedHeaders()).contains("Retry-After");
            assertThat(p.isAllowCredentials()).isFalse();
        });
    }

    @Test
    void wildcardOriginRejectedAtStartup() {
        runner.withPropertyValues("mall.gateway.cors.allowed-origins=*")
            .run(ctx -> assertThat(ctx).hasFailed()
                .getFailure().rootCause().hasMessageContaining("allowed-origins"));
    }

    @Test
    void wildcardPatternOriginRejected() {
        runner.withPropertyValues("mall.gateway.cors.allowed-origins=https://*.example.com")
            .run(ctx -> assertThat(ctx).hasFailed());
    }

    @Test
    void productionOriginOverrideAccepted() {
        runner.withPropertyValues("mall.gateway.cors.allowed-origins=https://shop.example.com")
            .run(ctx -> assertThat(ctx.getBean(GatewayCorsProperties.class).getAllowedOrigins())
                .containsExactly("https://shop.example.com"));
    }

    @Test
    void environmentVariableOverridesOrigins() {
        // 模拟真实环境变量（relaxed binding），写法与 docs/api.md 一致
        runner.withInitializer(ctx -> ctx.getEnvironment().getPropertySources().addAfter(
                StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                new SystemEnvironmentPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME + "-test",
                    Map.of("MALL_GATEWAY_CORS_ALLOWED_ORIGINS", "https://shop.example.com,https://admin.example.com"))))
            .run(ctx -> assertThat(ctx.getBean(GatewayCorsProperties.class).getAllowedOrigins())
                .containsExactly("https://shop.example.com", "https://admin.example.com"));
    }

    @Test
    void blankOriginRejectedWithDedicatedMessage() {
        runner.withPropertyValues("mall.gateway.cors.allowed-origins[0]=", "mall.gateway.cors.allowed-origins[1]=http://localhost:5173")
            .run(ctx -> assertThat(ctx).hasFailed()
                .getFailure().rootCause().hasMessageContaining("空字符串"));
    }

    @Test
    void wildcardExposedHeaderRejected() {
        runner.withPropertyValues("mall.gateway.cors.exposed-headers=*")
            .run(ctx -> assertThat(ctx).hasFailed()
                .getFailure().rootCause().hasMessageContaining("exposed-headers"));
    }

    @Test
    void credentialsWithWildcardOriginRejected() {
        runner.withPropertyValues("mall.gateway.cors.allow-credentials=true", "mall.gateway.cors.allowed-origins=*")
            .run(ctx -> assertThat(ctx).hasFailed()
                .getFailure().rootCause().hasMessageContaining("allow-credentials=true"));
    }

    @Test
    void credentialsWithWildcardHeaderRejected() {
        runner.withPropertyValues("mall.gateway.cors.allow-credentials=true", "mall.gateway.cors.allowed-headers=*")
            .run(ctx -> assertThat(ctx).hasFailed()
                .getFailure().rootCause().hasMessageContaining("allow-credentials=true"));
    }

    @Test
    void credentialsWithExplicitValuesAccepted() {
        runner.withPropertyValues("mall.gateway.cors.allow-credentials=true")
            .run(ctx -> assertThat(ctx.getBean(GatewayCorsProperties.class).isAllowCredentials()).isTrue());
    }
}
