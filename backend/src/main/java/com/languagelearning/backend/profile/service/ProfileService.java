package com.languagelearning.backend.profile.service;

import com.languagelearning.backend.account.RefreshTokenRepository;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserProfile;
import com.languagelearning.backend.account.UserProfileRepository;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.analytics.dto.AnalyticsOverviewResponse;
import com.languagelearning.backend.analytics.service.AnalyticsService;
import com.languagelearning.backend.auth.dto.AuthResponse;
import com.languagelearning.backend.auth.service.AuthService.AuthResult;
import com.languagelearning.backend.auth.dto.UserSummaryDto;
import com.languagelearning.backend.auth.service.AuthService;
import com.languagelearning.backend.auth.service.BruteForceLimiter;
import com.languagelearning.backend.auth.service.JwtTokenService;
import com.languagelearning.backend.auth.service.RefreshTokenService;
import com.languagelearning.backend.common.exception.ResourceNotFoundException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.level.dto.LevelInfoDto;
import com.languagelearning.backend.level.service.XpService;
import com.languagelearning.backend.profile.dto.*;
import com.languagelearning.backend.study.entity.StudySession;
import com.languagelearning.backend.study.repository.StudySessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {

    private static final Logger log = LoggerFactory.getLogger(ProfileService.class);

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final VocabularySetRepository vocabularySetRepository;
    private final StudySessionRepository studySessionRepository;
    private final AnalyticsService analyticsService;
    private final XpService xpService;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;
    private final BruteForceLimiter bruteForceLimiter;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenService refreshTokenService;
    private final JwtTokenService jwtTokenService;

    @Value("${app.upload.avatar-dir:uploads/avatars}")
    private String avatarUploadDir;

    public ProfileService(UserRepository userRepository,
                          UserProfileRepository userProfileRepository,
                          VocabularySetRepository vocabularySetRepository,
                          StudySessionRepository studySessionRepository,
                          AnalyticsService analyticsService,
                          XpService xpService,
                          AuthService authService,
                          PasswordEncoder passwordEncoder,
                          BruteForceLimiter bruteForceLimiter,
                          RefreshTokenRepository refreshTokenRepository,
                          RefreshTokenService refreshTokenService,
                          JwtTokenService jwtTokenService) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.vocabularySetRepository = vocabularySetRepository;
        this.studySessionRepository = studySessionRepository;
        this.analyticsService = analyticsService;
        this.xpService = xpService;
        this.authService = authService;
        this.passwordEncoder = passwordEncoder;
        this.bruteForceLimiter = bruteForceLimiter;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenService = refreshTokenService;
        this.jwtTokenService = jwtTokenService;
    }

    private Path getStoragePath() {
        Path p = Paths.get(avatarUploadDir).toAbsolutePath().normalize();
        try {
            if (!Files.exists(p)) {
                Files.createDirectories(p);
            }
        } catch (IOException e) {
            throw new RuntimeException("Could not create avatar upload directory", e);
        }
        return p;
    }

    @Transactional
    public ProfileResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "Không tìm thấy người dùng"));

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserProfile p = new UserProfile(user, user.getUsername());
                    return userProfileRepository.save(p);
                });

        LevelInfoDto levelInfo = xpService.getLevelInfo(userId);
        AnalyticsOverviewResponse overview = analyticsService.getOverview(userId, ZoneOffset.UTC);

        long deckCount = vocabularySetRepository.countByUserId(userId);

        // Compute study time in minutes
        List<StudySession> sessions = studySessionRepository.findByUserIdOrderByStartedAtAsc(userId);
        long totalStudySeconds = 0;
        for (StudySession s : sessions) {
            if (s.getStartedAt() != null && s.getCompletedAt() != null) {
                long sec = Duration.between(s.getStartedAt(), s.getCompletedAt()).getSeconds();
                if (sec > 0 && sec < 86400) { // filter out anomalous sessions > 24h
                    totalStudySeconds += sec;
                }
            }
        }
        int totalMinutes = (int) (totalStudySeconds / 60);

        ProfileStatsDto stats = new ProfileStatsDto(
                overview.totalLearnedCards(),
                overview.overallAccuracy(),
                overview.totalQuestions(),
                totalMinutes > 0 ? totalMinutes : null,
                (int) deckCount
        );

        return new ProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                profile.getDisplayName() != null ? profile.getDisplayName() : user.getUsername(),
                profile.getAvatarUrl(),
                profile.getBio(),
                user.getCreatedAt(),
                overview.currentStreak(),
                levelInfo.level(),
                levelInfo.totalXp(),
                levelInfo.xpIntoLevel(),
                levelInfo.xpForNext(),
                levelInfo.tierId(),
                levelInfo.tierName(),
                levelInfo.maxLevel(),
                stats
        );
    }

    @Transactional
    public ProfileResponse updateName(Long userId, String rawName) {
        if (rawName == null) {
            throw new ValidationException("NAME_EMPTY", "Họ và tên không được để trống");
        }

        // 1. Trim and normalize to Unicode NFC
        String trimmed = rawName.trim();
        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFC);

        // 2. Length check: 1 to 50 characters
        if (normalized.isEmpty() || normalized.length() > 50) {
            throw new ValidationException("NAME_INVALID_LENGTH", "Họ và tên phải từ 1 đến 50 ký tự");
        }

        // 3. No control characters check (ISO control / unprintable chars)
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (Character.isISOControl(c)) {
                throw new ValidationException("NAME_CONTROL_CHARS", "Họ và tên không được chứa ký tự điều khiển");
            }
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "Không tìm thấy người dùng"));

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> new UserProfile(user, user.getUsername()));

        profile.setDisplayName(normalized);
        userProfileRepository.save(profile);

        return getProfile(userId);
    }

    @Transactional
    public AvatarResponse uploadAvatar(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("AVATAR_EMPTY", "Vui lòng chọn tệp hình ảnh");
        }

        byte[] rawBytes;
        try {
            rawBytes = file.getBytes();
        } catch (IOException e) {
            throw new ValidationException("AVATAR_READ_ERROR", "Không thể đọc dữ liệu tệp tải lên");
        }

        // Validate, strip EXIF metadata, scale and re-encode to safe PNG
        byte[] sanitizedPng = AvatarImageValidator.sanitizeAndReencodeToPng(rawBytes);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "Không tìm thấy người dùng"));

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> new UserProfile(user, user.getUsername()));

        // Store avatar bytes in database (Neon-safe, no ephemeral disk dependency)
        profile.setAvatarData(sanitizedPng);
        profile.setAvatarMime("image/png");
        // URL pattern: /api/profile/avatar/<userId> — served directly from DB bytes
        String storedUrl = "/api/profile/avatar/" + userId;
        profile.setAvatarUrl(storedUrl);
        userProfileRepository.save(profile);

        return new AvatarResponse(storedUrl, "Đã cập nhật ảnh đại diện thành công");
    }

    @Transactional
    public void removeAvatar(Long userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElse(null);

        if (profile != null) {
            profile.setAvatarData(null);
            profile.setAvatarMime(null);
            profile.setAvatarUrl(null);
            userProfileRepository.save(profile);
        }
    }

    public ResourceFile loadAvatarFile(String filename) {
        // filename is now the userId for DB-stored avatars
        Long userId;
        try {
            // Support both old disk path "av_<userId>_<uuid>.png" and new DB path "<userId>"
            String idStr = filename.replaceAll("\\.png$", "").replaceAll("^av_(\\d+)_.*$", "$1");
            userId = Long.parseLong(idStr);
        } catch (NumberFormatException e) {
            throw new ValidationException("INVALID_FILENAME", "Tên tệp không hợp lệ");
        }

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("AVATAR_NOT_FOUND", "Không tìm thấy ảnh đại diện"));

        byte[] data = profile.getAvatarData();
        if (data == null || data.length == 0) {
            throw new ResourceNotFoundException("AVATAR_NOT_FOUND", "Người dùng chưa có ảnh đại diện");
        }

        String contentType = profile.getAvatarMime() != null ? profile.getAvatarMime() : "image/png";
        return new ResourceFile(data, contentType);
    }

    @Transactional
    public AuthResult changePassword(Long userId, String currentPassword, String newPassword, String clientIp) {
        String rateLimitKey = "pwd_change:" + userId;
        bruteForceLimiter.checkBlocked(rateLimitKey);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "Không tìm thấy người dùng"));

        // Verify current password with BCrypt
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            bruteForceLimiter.recordFailure(rateLimitKey);
            throw new ValidationException("INVALID_CURRENT_PASSWORD", "Mật khẩu hiện tại không chính xác");
        }

        // Success on current password -> reset failure count
        bruteForceLimiter.reset(rateLimitKey);

        // Validation for new password
        if (newPassword == null || newPassword.equals(currentPassword)) {
            throw new ValidationException("PASSWORD_SAME_AS_OLD", "Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        authService.validatePassword(newPassword, user.getEmail(), user.getUsername());

        // Update password hash
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Revoke ALL refresh tokens for this user
        refreshTokenRepository.revokeAllActiveTokensByUserId(userId, Instant.now());

        // Issue fresh session for current browser
        String newAccessToken = jwtTokenService.generateAccessToken(user);
        String newRawRefreshToken = refreshTokenService.issueRefreshToken(user);

        String displayName = userProfileRepository.findByUserId(userId)
                .map(UserProfile::getDisplayName)
                .orElse(user.getUsername());

        UserSummaryDto userSummary = new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                displayName,
                user.getRoles().stream().map(r -> r.getName()).toList()
        );

        AuthResponse authResponse = new AuthResponse(
                newAccessToken,
                jwtTokenService.getAccessTokenExpirationSeconds(),
                userSummary
        );

        return new AuthResult(authResponse, newRawRefreshToken);
    }

    private void deleteOldAvatarFile(String avatarUrl) {
        if (avatarUrl == null || !avatarUrl.startsWith("/api/profile/avatar/")) return;
        String oldFilename = avatarUrl.substring("/api/profile/avatar/".length());
        if (oldFilename.contains("..") || oldFilename.contains("/") || oldFilename.contains("\\")) return;

        try {
            Path oldPath = getStoragePath().resolve(oldFilename).normalize();
            if (oldPath.startsWith(getStoragePath()) && Files.exists(oldPath)) {
                Files.deleteIfExists(oldPath);
            }
        } catch (Exception ex) {
            log.warn("Could not delete old avatar file: {}", ex.getMessage());
        }
    }

    public record ResourceFile(byte[] data, String contentType) {}
}
