package com.languagelearning.backend.auth.controller;

import com.languagelearning.backend.auth.dto.*;
import com.languagelearning.backend.auth.service.AuthService;
import com.languagelearning.backend.common.exception.CsrfMissingHeaderException;
import com.languagelearning.backend.common.exception.InvalidRefreshTokenException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";
    private static final String CSRF_HEADER_NAME = "X-Requested-With";

    private final AuthService authService;
    private final boolean cookieSecure;
    private final long refreshTokenExpirationDays;

    public AuthController(AuthService authService,
                          @Value("${app.cookie.secure:false}") boolean cookieSecure,
                          @Value("${app.jwt.refresh-token-expiration-days:14}") long refreshTokenExpirationDays) {
        this.authService = authService;
        this.cookieSecure = cookieSecure;
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        AuthService.AuthResult result = authService.register(request, clientIp);

        ResponseCookie cookie = buildRefreshTokenCookie(result.rawRefreshToken(), Duration.ofDays(refreshTokenExpirationDays));

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.response());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        AuthService.AuthResult result = authService.login(request, clientIp);

        ResponseCookie cookie = buildRefreshTokenCookie(result.rawRefreshToken(), Duration.ofDays(refreshTokenExpirationDays));

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.response());
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponse> refresh(
            @RequestHeader(value = CSRF_HEADER_NAME, required = false) String csrfHeader,
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String rawRefreshToken) {

        verifyCsrfHeader(csrfHeader);

        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new InvalidRefreshTokenException("Không tìm thấy refresh token trong cookie");
        }

        AuthService.RefreshResult result = authService.refresh(rawRefreshToken);
        ResponseCookie cookie = buildRefreshTokenCookie(result.newRawRefreshToken(), Duration.ofDays(refreshTokenExpirationDays));

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.response());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader(value = CSRF_HEADER_NAME, required = false) String csrfHeader,
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String rawRefreshToken) {

        verifyCsrfHeader(csrfHeader);

        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            authService.logout(rawRefreshToken);
        }

        ResponseCookie clearCookie = buildRefreshTokenCookie("", Duration.ZERO);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(Map.of("message", "Đăng xuất thành công"));
    }

    private void verifyCsrfHeader(String csrfHeader) {
        if (csrfHeader == null || !csrfHeader.equalsIgnoreCase("XMLHttpRequest")) {
            throw new CsrfMissingHeaderException("Yêu cầu thiếu header bảo mật " + CSRF_HEADER_NAME);
        }
    }

    private ResponseCookie buildRefreshTokenCookie(String token, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/api/auth")
                .sameSite("Strict")
                .maxAge(maxAge)
                .build();
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}
