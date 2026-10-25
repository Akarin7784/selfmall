package com.selfmall.gateway;

import com.selfmall.security.JwtSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;

@Configuration
@EnableConfigurationProperties(GatewayCorsProperties.class)
public class GatewaySecurityConfiguration {
    @Bean
    ReactiveJwtDecoder jwtDecoder(@Value("${mall.security.jwt-secret}") String secret,
                                  @Value("${mall.security.issuer:selfmall}") String issuer) {
        NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder.withSecretKey(JwtSupport.key(secret)).build();
        decoder.setJwtValidator(JwtSupport.validator(issuer));
        return decoder;
    }
    @Bean
    CorsConfigurationSource corsConfigurationSource(GatewayCorsProperties properties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.getAllowedOrigins());
        config.setAllowedMethods(properties.getAllowedMethods());
        config.setAllowedHeaders(properties.getAllowedHeaders());
        config.setExposedHeaders(properties.getExposedHeaders());
        config.setMaxAge(properties.getMaxAge());
        config.setAllowCredentials(properties.isAllowCredentials());
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
    @Bean
    SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http, CorsConfigurationSource corsConfigurationSource) {
        // CorsWebFilter 位于鉴权之前：预检请求在此直接返回，不要求令牌
        return http.csrf(ServerHttpSecurity.CsrfSpec::disable)
            .cors(c -> c.configurationSource(corsConfigurationSource))
            .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
            .authorizeExchange(a -> a
                .pathMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .pathMatchers(HttpMethod.POST, "/api/auth/token").permitAll()
                .pathMatchers(HttpMethod.GET, "/api/products", "/api/products/*").permitAll()
                .anyExchange().authenticated())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())).build();
    }
}
