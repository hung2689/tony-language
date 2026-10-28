package com.languagelearning.backend.profile.controller;

import com.languagelearning.backend.auth.dto.AuthResponse;
import com.languagelearning.backend.auth.service.AuthService.AuthResult;
import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.profile.dto.*;
import com.languagelearning.backend.profile.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";

    private final ProfileService profileService;
    private final CurrentUserProvider currentUserProvider;
    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final long refreshTokenExpirationDays;

    public ProfileController(ProfileService profileService,
                             CurrentUserProvider currentUserProvider,
                             @Value("${app.cookie.secure:false}") boolean cookieSecure,
                             @Value("${app.cookie.same-site:Strict}") String cookieSameSite,
                             @Value("${app.jwt.refresh-token-expiration-days:30}") long refreshTokenExpirationDays) {
        this.profileService = profileService;
        this.currentUserProvider = currentUserProvider;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
    }

    /**
     * GET /api/profile
     * Returns full user profile, level info, and verified learning stats.
     */
    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile() {
        Long userId = currentUserProvider.getCurrentUserId();
        ProfileResponse response = profileService.getProfile(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/profile
     * Updates display name (NFC normalized, 1-50 chars, no control chars).
     */
    @PatchMapping
    public ResponseEntity<ProfileResponse> updateName(@Valid @RequestBody UpdateNameRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        ProfileResponse updated = profileService.updateName(userId, request.getDisplayName());
        return ResponseEntity.ok(updated);
    }

    /**
     * POST /api/profile/avatar
     * Uploads avatar image (JPEG/PNG/WebP, max 2MB).
     * Server decodes/re-encodes to strip EXIF and stores securely.
     */
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AvatarResponse> uploadAvatar(@RequestPart("file") MultipartFile file) {
        Long userId = currentUserProvider.getCurrentUserId();
        AvatarResponse response = profileService.uploadAvatar(userId, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * DELETE /api/profile/avatar
     * Removes user avatar and deletes file from disk.
     */
    @DeleteMapping("/avatar")
    public ResponseEntity<Map<String, String>> removeAvatar() {
        Long userId = currentUserProvider.getCurrentUserId();
        profileService.removeAvatar(userId);
        return ResponseEntity.ok(Map.of("message", "Đã xóa ảnh đại diện thành công"));
    }

    /**
     * GET /api/profile/avatar/{filename}
     * Serves uploaded avatar image files publicly for <img> tags.
     * Content-Type verified, X-Content-Type-Options: nosniff enforced.
     */
    @GetMapping("/avatar/{filename}")
    public ResponseEntity<byte[]> serveAvatar(@PathVariable String filename) {
        ProfileService.ResourceFile resource = profileService.loadAvatarFile(filename);
        return ResponseEntity.ok()
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentType(MediaType.parseMediaType(resource.contentType()))
                .body(resource.data());
    }

    /**
     * POST /api/profile/password
     * Changes user password. Verifies current password with rate-limiting,
     * updates hash, revokes all existing refresh tokens, and issues fresh session.
     */
    @PostMapping("/password")
    public ResponseEntity<ApiResponse<AuthResponse>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        Long userId = currentUserProvider.getCurrentUserId();
        String clientIp = extractClientIp(httpRequest);

        AuthResult result = profileService.changePassword(userId, request.getCurrentPassword(), request.getNewPassword(), clientIp);

        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, result.rawRefreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/api/auth")
                .sameSite(cookieSameSite)
                .maxAge(Duration.ofDays(refreshTokenExpirationDays))
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.success("Đã đổi mật khẩu; các thiết bị khác cần đăng nhập lại", result.response()));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}
