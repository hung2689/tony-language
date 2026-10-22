package com.languagelearning.backend.auth.service;

import com.languagelearning.backend.account.Role;
import com.languagelearning.backend.account.User;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
public class JwtTokenService {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenService.class);

    private static final String DEV_FALLBACK_SECRET = "dev_only_jwt_secret_key_language_learning_app_minimum_256_bits_length!";

    private final String rawSecret;
    private final String issuer;
    private final long accessTokenExpirationSeconds;
    private final Environment environment;

    private SecretKey secretKey;
    private JwtEncoder jwtEncoder;

    public JwtTokenService(@Value("${app.jwt.secret:}") String rawSecret,
                           @Value("${app.jwt.issuer:language-learning-app}") String issuer,
                           @Value("${app.jwt.access-token-expiration-seconds:900}") long accessTokenExpirationSeconds,
                           Environment environment) {
        this.rawSecret = rawSecret;
        this.issuer = issuer;
        this.accessTokenExpirationSeconds = accessTokenExpirationSeconds;
        this.environment = environment;
    }

    @PostConstruct
    public void init() {
        boolean isDevProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev");

        String effectiveSecret = rawSecret;
        if (effectiveSecret == null || effectiveSecret.isBlank() || effectiveSecret.startsWith("REPLACE_") || effectiveSecret.startsWith("change_me")) {
            if (isDevProfile) {
                log.warn("No JWT_SECRET provided or placeholder used. Using clearly-labeled dev fallback secret under 'dev' profile.");
                effectiveSecret = DEV_FALLBACK_SECRET;
            } else {
                throw new IllegalStateException("JWT_SECRET must be configured in non-dev profiles and cannot be a placeholder.");
            }
        }

        byte[] secretBytes = effectiveSecret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            if (isDevProfile) {
                log.warn("Configured JWT_SECRET is shorter than 32 bytes. Using dev fallback secret under 'dev' profile.");
                secretBytes = DEV_FALLBACK_SECRET.getBytes(StandardCharsets.UTF_8);
            } else {
                throw new IllegalStateException("JWT_SECRET must be at least 256 bits (32 bytes) long. Current length: " + secretBytes.length + " bytes.");
            }
        }

        this.secretKey = new SecretKeySpec(secretBytes, "HmacSHA256");
        this.jwtEncoder = new NimbusJwtEncoder(new ImmutableSecret<>(secretBytes));
    }

    public SecretKey getSecretKey() {
        return secretKey;
    }

    public String getIssuer() {
        return issuer;
    }

    public long getAccessTokenExpirationSeconds() {
        return accessTokenExpirationSeconds;
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(accessTokenExpirationSeconds);

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(user.getId().toString())
                .claim("username", user.getUsername())
                .claim("email", user.getEmail())
                .claim("roles", roles)
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
