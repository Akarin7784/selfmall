package com.selfmall.auth;

import com.selfmall.core.ApiResponse;
import com.selfmall.security.JwtSupport;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Local development only. Replace with a real identity provider before cloud deployment. */
@Profile("local & !cloud")
@RestController
@RequestMapping("/api/auth")
public class LocalTokenController {
    private final JwtEncoder encoder;
    private final String password;
    private final String issuer;
    public LocalTokenController(@Value("${mall.security.jwt-secret}") String secret,
            @Value("${MALL_DEMO_PASSWORD:demo123456}") String password,
            @Value("${mall.security.issuer:selfmall}") String issuer) {
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(JwtSupport.key(secret)));
        this.password = password;
        this.issuer = issuer;
    }
    public record Login(@NotBlank String username, @NotBlank String password) {}
    public record Token(String accessToken, String tokenType, long expiresIn) {}
    @PostMapping("/token")
    public ApiResponse<Token> token(@Valid @RequestBody Login request) {
        if (!"demo".equals(request.username()) || !MessageDigest.isEqual(password.getBytes(StandardCharsets.UTF_8), request.password().getBytes(StandardCharsets.UTF_8)))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject("10001")
            .audience(List.of("selfmall-api")).issuedAt(now).expiresAt(now.plusSeconds(3600))
            .claim("scope", "member").build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return ApiResponse.ok(new Token(token, "Bearer", 3600));
    }
}
