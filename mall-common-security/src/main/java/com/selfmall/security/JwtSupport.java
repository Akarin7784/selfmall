package com.selfmall.security;

import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;

public final class JwtSupport {
    private JwtSupport() {}
    public static SecretKey key(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) throw new IllegalArgumentException("MALL_JWT_SECRET must contain at least 32 UTF-8 bytes");
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
    public static OAuth2TokenValidator<Jwt> validator(String issuer) {
        OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains("selfmall-api")
            ? OAuth2TokenValidatorResult.success()
            : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid audience", null));
        return new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer), audience);
    }
}
