package com.languagelearning.backend.auth.service;

import com.languagelearning.backend.account.*;
import com.languagelearning.backend.auth.dto.*;
import com.languagelearning.backend.common.exception.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final BruteForceLimiter bruteForceLimiter;

    public record AuthResult(AuthResponse response, String rawRefreshToken, boolean persistent) {
        public AuthResult(AuthResponse response, String rawRefreshToken) {
            this(response, rawRefreshToken, true);
        }
    }

    public record RefreshResult(TokenRefreshResponse response, String newRawRefreshToken, boolean persistent) {
        public RefreshResult(TokenRefreshResponse response, String newRawRefreshToken) {
            this(response, newRawRefreshToken, true);
        }
    }

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       UserProfileRepository userProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenService jwtTokenService,
                       RefreshTokenService refreshTokenService,
                       BruteForceLimiter bruteForceLimiter) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userProfileRepository = userProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenService = refreshTokenService;
        this.bruteForceLimiter = bruteForceLimiter;
    }

    @Transactional
    public AuthResult register(RegisterRequest request, String clientIp) {
        String email = request.getEmail().trim().toLowerCase();
        String username = request.getUsername().trim();
        String password = request.getPassword();

        validatePassword(password, email, username);

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateEmailException(email);
        }
        if (userRepository.findByUsernameIgnoreCase(username).isPresent()) {
            throw new DuplicateUsernameException(username);
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(new Role("USER")));

        User user = new User(email, passwordEncoder.encode(password), username, User.STATUS_ACTIVE);
        user.getRoles().add(userRole);
        User savedUser = userRepository.save(user);

        UserProfile profile = new UserProfile(savedUser, username);
        userProfileRepository.save(profile);

        String accessToken = jwtTokenService.generateAccessToken(savedUser);
        String rawRefreshToken = refreshTokenService.issueRefreshToken(savedUser);

        UserSummaryDto userSummary = buildUserSummary(savedUser, profile.getDisplayName());
        AuthResponse response = new AuthResponse(accessToken, jwtTokenService.getAccessTokenExpirationSeconds(), userSummary);

        return new AuthResult(response, rawRefreshToken);
    }

    @Transactional
    public AuthResult login(LoginRequest request, String clientIp) {
        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword();
        String rateLimitKey = bruteForceLimiter.buildKey(email, clientIp);

        bruteForceLimiter.checkBlocked(rateLimitKey);

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> {
                    bruteForceLimiter.recordFailure(rateLimitKey);
                    return new InvalidCredentialsException();
                });

        if (!User.STATUS_ACTIVE.equals(user.getStatus())) {
            throw new AccountLockedException("Tài khoản của bạn đã bị khóa hoặc không hoạt động");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            bruteForceLimiter.recordFailure(rateLimitKey);
            throw new InvalidCredentialsException();
        }

        bruteForceLimiter.reset(rateLimitKey);

        boolean rememberMe = request.isRememberMe();
        String accessToken = jwtTokenService.generateAccessToken(user);
        String rawRefreshToken = rememberMe
                ? refreshTokenService.issueRefreshToken(user)
                : refreshTokenService.issueRefreshToken(user, false);

        String displayName = userProfileRepository.findByUserId(user.getId())
                .map(UserProfile::getDisplayName)
                .orElse(user.getUsername());

        UserSummaryDto userSummary = buildUserSummary(user, displayName);
        AuthResponse response = new AuthResponse(accessToken, jwtTokenService.getAccessTokenExpirationSeconds(), userSummary);

        return new AuthResult(response, rawRefreshToken, rememberMe);
    }

    @Transactional
    public RefreshResult refresh(String rawRefreshToken) {
        RefreshTokenService.RotatedTokenResult rotated = refreshTokenService.rotateRefreshToken(rawRefreshToken);
        User user = rotated.user();

        String newAccessToken = jwtTokenService.generateAccessToken(user);
        TokenRefreshResponse response = new TokenRefreshResponse(newAccessToken, jwtTokenService.getAccessTokenExpirationSeconds());

        return new RefreshResult(response, rotated.newRawRefreshToken(), rotated.persistent());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenService.revokeRefreshToken(rawRefreshToken);
    }

    public UserSummaryDto getCurrentUserSummary(User user) {
        String displayName = userProfileRepository.findByUserId(user.getId())
                .map(UserProfile::getDisplayName)
                .orElse(user.getUsername());
        return buildUserSummary(user, displayName);
    }

    private UserSummaryDto buildUserSummary(User user, String displayName) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();
        return new UserSummaryDto(user.getId(), user.getEmail(), user.getUsername(), displayName, roles);
    }

    public void validatePassword(String password, String email, String username) {
        if (password == null || password.length() < 8) {
            throw new ValidationException("PASSWORD_TOO_SHORT", "Mật khẩu phải có ít nhất 8 ký tự");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ValidationException("PASSWORD_TOO_LONG", "Mật khẩu không được vượt quá 72 bytes");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new ValidationException("PASSWORD_TOO_WEAK", "Mật khẩu phải chứa ít nhất một chữ cái và một chữ số");
        }
        if (password.equalsIgnoreCase(email) || password.equalsIgnoreCase(username)) {
            throw new ValidationException("PASSWORD_MATCHES_IDENTIFIER", "Mật khẩu không được trùng với email hoặc tên đăng nhập");
        }
    }
}
