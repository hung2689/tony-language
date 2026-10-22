package com.languagelearning.backend.auth.service;

import com.languagelearning.backend.account.RefreshToken;
import com.languagelearning.backend.account.RefreshTokenRepository;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.common.exception.AccountLockedException;
import com.languagelearning.backend.common.exception.InvalidRefreshTokenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshTokenExpirationDays;
    private final long graceWindowSeconds;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               @Value("${app.jwt.refresh-token-expiration-days:14}") long refreshTokenExpirationDays,
                               @Value("${app.jwt.refresh-grace-seconds:10}") long graceWindowSeconds) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
        this.graceWindowSeconds = graceWindowSeconds;
    }

    public record RotatedTokenResult(User user, String newRawRefreshToken) {}

    public String generateRawToken() {
        byte[] randomBytes = new byte[32]; // 256 bits
        secureRandom.nextBytes(randomBytes);
        return HexFormat.of().formatHex(randomBytes);
    }

    public String hashToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidRefreshTokenException("Refresh token không được để trống");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    @Transactional
    public String issueRefreshToken(User user) {
        String rawToken = generateRawToken();
        String tokenHash = hashToken(rawToken);
        Instant expiresAt = Instant.now().plus(Duration.ofDays(refreshTokenExpirationDays));

        RefreshToken entity = new RefreshToken(user, tokenHash, expiresAt);
        refreshTokenRepository.save(entity);
        return rawToken;
    }

    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public RotatedTokenResult rotateRefreshToken(String rawRefreshToken) {
        String tokenHash = hashToken(rawRefreshToken);
        Instant now = Instant.now();

        int rowsUpdated = refreshTokenRepository.revokeTokenIfActive(tokenHash, now);

        if (rowsUpdated == 1) {
            RefreshToken oldToken = refreshTokenRepository.findByTokenHash(tokenHash)
                    .orElseThrow(() -> new InvalidRefreshTokenException("Không tìm thấy refresh token sau khi xoay vòng"));

            User user = oldToken.getUser();
            if (!User.STATUS_ACTIVE.equals(user.getStatus())) {
                throw new AccountLockedException("Tài khoản đã bị khóa hoặc ngừng hoạt động");
            }

            if (oldToken.isExpired()) {
                throw new InvalidRefreshTokenException("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
            }

            String newRawToken = issueRefreshToken(user);
            return new RotatedTokenResult(user, newRawToken);
        }

        // rowsUpdated == 0: either token does not exist, or it was already revoked / expired
        Optional<RefreshToken> optToken = refreshTokenRepository.findByTokenHash(tokenHash);
        if (optToken.isEmpty()) {
            throw new InvalidRefreshTokenException("Refresh token không hợp lệ hoặc không tồn tại");
        }

        RefreshToken token = optToken.get();
        if (token.getRevokedAt() != null) {
            long secondsSinceRevocation = Duration.between(token.getRevokedAt(), now).toSeconds();
            if (secondsSinceRevocation <= graceWindowSeconds) {
                // Grace window for concurrent refresh (e.g., multiple browser tabs refreshing simultaneously)
                log.info("Concurrent refresh within grace window ({}s <= {}s) for user id: {}",
                        secondsSinceRevocation, graceWindowSeconds, token.getUser().getId());
                throw new InvalidRefreshTokenException("Phiên đăng nhập vừa được làm mới ở một tab khác. Vui lòng làm mới trang.");
            }

            // Outside grace window -> TOKEN REUSE DETECTED
            log.warn("SECURITY ALERT: Refresh token reuse detected for user id: {}. Revoking all active tokens.",
                    token.getUser().getId());
            refreshTokenRepository.revokeAllActiveTokensByUserId(token.getUser().getId(), now);
            throw new InvalidRefreshTokenException("Phát hiện bất thường trong phiên đăng nhập. Toàn bộ phiên làm việc đã bị thu hồi.");
        }

        if (token.isExpired()) {
            throw new InvalidRefreshTokenException("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        }

        throw new InvalidRefreshTokenException("Refresh token không hợp lệ");
    }

    @Transactional
    public void revokeRefreshToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        try {
            String tokenHash = hashToken(rawRefreshToken);
            refreshTokenRepository.revokeTokenIfActive(tokenHash, Instant.now());
        } catch (Exception e) {
            log.warn("Failed to revoke refresh token: {}", e.getMessage());
        }
    }
}
