package com.selfmall.web;

import com.selfmall.security.JwtSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;

@AutoConfiguration
@Import(ApiExceptionHandler.class)
public class MallWebConfiguration {
    @Bean
    JwtDecoder jwtDecoder(@Value("${mall.security.jwt-secret}") String secret,
                          @Value("${mall.security.issuer:selfmall}") String issuer) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(JwtSupport.key(secret)).build();
        decoder.setJwtValidator(JwtSupport.validator(issuer));
        return decoder;
    }
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/token").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/*").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())).build();
    }
}
