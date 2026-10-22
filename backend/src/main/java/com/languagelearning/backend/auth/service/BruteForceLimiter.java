package com.languagelearning.backend.auth.service;

import com.languagelearning.backend.common.exception.TooManyRequestsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory brute-force rate limiter.
 * Limitation: In-memory store; does not share state across multiple load-balanced application instances.
 */
@Component
public class BruteForceLimiter {

    private static final Logger log = LoggerFactory.getLogger(BruteForceLimiter.class);

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 15 * 60; // 15 minutes

    private static class AttemptTracker {
        int attempts;
        Instant firstAttemptAt;
        Instant lastAttemptAt;

        AttemptTracker(Instant now) {
            this.attempts = 1;
            this.firstAttemptAt = now;
            this.lastAttemptAt = now;
        }
    }

    private final Map<String, AttemptTracker> attemptsMap = new ConcurrentHashMap<>();

    public String buildKey(String email, String clientIp) {
        String cleanEmail = email != null ? email.trim().toLowerCase() : "unknown";
        String cleanIp = clientIp != null ? clientIp.trim() : "unknown";
        return cleanEmail + "|" + cleanIp;
    }

    public void checkBlocked(String key) {
        cleanupExpired();
        AttemptTracker tracker = attemptsMap.get(key);
        if (tracker != null && tracker.attempts >= MAX_ATTEMPTS) {
            Instant now = Instant.now();
            long elapsedSeconds = now.getEpochSecond() - tracker.firstAttemptAt.getEpochSecond();
            if (elapsedSeconds < WINDOW_SECONDS) {
                long remainingMinutes = Math.max(1, (WINDOW_SECONDS - elapsedSeconds + 59) / 60);
                log.warn("Blocked login attempt for key: {}. Attempts: {}", key, tracker.attempts);
                throw new TooManyRequestsException("Bạn đã nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau " + remainingMinutes + " phút.");
            } else {
                attemptsMap.remove(key);
            }
        }
    }

    public void recordFailure(String key) {
        Instant now = Instant.now();
        attemptsMap.compute(key, (k, existing) -> {
            if (existing == null) {
                return new AttemptTracker(now);
            }
            long elapsedSeconds = now.getEpochSecond() - existing.firstAttemptAt.getEpochSecond();
            if (elapsedSeconds >= WINDOW_SECONDS) {
                return new AttemptTracker(now);
            }
            existing.attempts += 1;
            existing.lastAttemptAt = now;
            return existing;
        });
    }

    public void reset(String key) {
        attemptsMap.remove(key);
    }

    // Periodic or on-demand cleanup to prevent unbounded memory growth
    public void cleanupExpired() {
        Instant threshold = Instant.now().minusSeconds(WINDOW_SECONDS);
        attemptsMap.entrySet().removeIf(entry -> entry.getValue().lastAttemptAt.isBefore(threshold));
    }

    public int getAttempts(String key) {
        AttemptTracker tracker = attemptsMap.get(key);
        return tracker != null ? tracker.attempts : 0;
    }
}
