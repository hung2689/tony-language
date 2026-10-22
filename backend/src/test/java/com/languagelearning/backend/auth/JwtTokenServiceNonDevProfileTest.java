package com.languagelearning.backend.auth;

import com.languagelearning.backend.auth.service.JwtTokenService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtTokenServiceNonDevProfileTest {

    @Test
    @DisplayName("Startup fails in non-dev profile when JWT_SECRET is missing")
    void nonDevProfile_MissingJwtSecret_ThrowsIllegalStateException() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        JwtTokenService service = new JwtTokenService("", "language-learning-app", 900L, env);

        IllegalStateException ex = assertThrows(IllegalStateException.class, service::init);
        assertTrue(ex.getMessage().contains("JWT_SECRET must be configured in non-dev profiles"));
    }

    @Test
    @DisplayName("Startup fails in non-dev profile when JWT_SECRET is shorter than 32 bytes")
    void nonDevProfile_ShortJwtSecret_ThrowsIllegalStateException() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        JwtTokenService service = new JwtTokenService("short_secret_under_32_bytes!", "language-learning-app", 900L, env);

        IllegalStateException ex = assertThrows(IllegalStateException.class, service::init);
        assertTrue(ex.getMessage().contains("at least 256 bits (32 bytes)"));
    }

    @Test
    @DisplayName("Startup succeeds in dev profile even with empty JWT_SECRET using fallback dev secret")
    void devProfile_EmptyJwtSecret_UsesFallback() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        JwtTokenService service = new JwtTokenService("", "language-learning-app", 900L, env);

        service.init();
        org.junit.jupiter.api.Assertions.assertNotNull(service.getSecretKey());
    }
}
