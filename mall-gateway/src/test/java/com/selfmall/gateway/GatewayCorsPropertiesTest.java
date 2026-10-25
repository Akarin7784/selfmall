package com.selfmall.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
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
}
