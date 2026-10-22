package com.languagelearning.backend.auth;

import com.languagelearning.backend.auth.service.BruteForceLimiter;
import com.languagelearning.backend.common.exception.TooManyRequestsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BruteForceLimiterTest {

    private BruteForceLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new BruteForceLimiter();
    }

    @Test
    @DisplayName("Allows up to 4 failed attempts without blocking")
    void allowsUnderMaxAttempts() {
        String key = limiter.buildKey("user@test.com", "127.0.0.1");

        for (int i = 0; i < 4; i++) {
            limiter.checkBlocked(key);
            limiter.recordFailure(key);
        }

        assertDoesNotThrow(() -> limiter.checkBlocked(key));
    }

    @Test
    @DisplayName("Blocks on 5th failed attempt with 429 TooManyRequestsException")
    void blocksOnFifthFailedAttempt() {
        String key = limiter.buildKey("user@test.com", "127.0.0.1");

        for (int i = 0; i < 5; i++) {
            limiter.recordFailure(key);
        }

        assertThrows(TooManyRequestsException.class, () -> limiter.checkBlocked(key));
    }

    @Test
    @DisplayName("Reset clears failure count and unblocks")
    void reset_UnblocksKey() {
        String key = limiter.buildKey("user@test.com", "127.0.0.1");

        for (int i = 0; i < 5; i++) {
            limiter.recordFailure(key);
        }

        assertThrows(TooManyRequestsException.class, () -> limiter.checkBlocked(key));

        limiter.reset(key);

        assertDoesNotThrow(() -> limiter.checkBlocked(key));
        assertEquals(0, limiter.getAttempts(key));
    }
}
