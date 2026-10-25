package com.selfmall.gateway;

import com.selfmall.security.JwtSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;

@Configuration
public class GatewaySecurityConfiguration {
    @Bean
    ReactiveJwtDecoder jwtDecoder(@Value("${mall.security.jwt-secret}") String secret,
                                  @Value("${mall.security.issuer:selfmall}") String issuer) {
        NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder.withSecretKey(JwtSupport.key(secret)).build();
        decoder.setJwtValidator(JwtSupport.validator(issuer));
        return decoder;
    }
    @Bean
    SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http.csrf(ServerHttpSecurity.CsrfSpec::disable)
            .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
            .authorizeExchange(a -> a
                .pathMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .pathMatchers(HttpMethod.POST, "/api/auth/token").permitAll()
                .pathMatchers(HttpMethod.GET, "/api/products", "/api/products/*").permitAll()
                .anyExchange().authenticated())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())).build();
    }
}
