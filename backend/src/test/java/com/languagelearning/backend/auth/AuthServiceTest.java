package com.languagelearning.backend.auth;

import com.languagelearning.backend.account.*;
import com.languagelearning.backend.auth.dto.*;
import com.languagelearning.backend.auth.service.AuthService;
import com.languagelearning.backend.auth.service.BruteForceLimiter;
import com.languagelearning.backend.auth.service.JwtTokenService;
import com.languagelearning.backend.auth.service.RefreshTokenService;
import com.languagelearning.backend.common.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenService jwtTokenService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private BruteForceLimiter bruteForceLimiter;

    @InjectMocks
    private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = new User("test@example.com", "$2a$10$hashedPassword", "testuser", User.STATUS_ACTIVE);
        activeUser.setId(10L);
    }

    @Test
    @DisplayName("Password validation: rejects password shorter than 8 chars")
    void passwordTooShort_ThrowsValidationException() {
        assertThrows(ValidationException.class, () ->
                authService.validatePassword("Ab1", "user@test.com", "user"));
    }

    @Test
    @DisplayName("Password validation: rejects password without digit")
    void passwordWithoutDigit_ThrowsValidationException() {
        assertThrows(ValidationException.class, () ->
                authService.validatePassword("Abcdefgh", "user@test.com", "user"));
    }

    @Test
    @DisplayName("Password validation: rejects password without letter")
    void passwordWithoutLetter_ThrowsValidationException() {
        assertThrows(ValidationException.class, () ->
                authService.validatePassword("12345678", "user@test.com", "user"));
    }

    @Test
    @DisplayName("Password validation: rejects password matching email or username")
    void passwordMatchesIdentifier_ThrowsValidationException() {
        assertThrows(ValidationException.class, () ->
                authService.validatePassword("test@example.com", "test@example.com", "myusername"));
        assertThrows(ValidationException.class, () ->
                authService.validatePassword("MyUserName", "diff@example.com", "myusername"));
    }

    @Test
    @DisplayName("Register: fails when email already exists (case-insensitive)")
    void register_DuplicateEmail_ThrowsDuplicateEmailException() {
        when(userRepository.findByEmailIgnoreCase("existing@example.com"))
                .thenReturn(Optional.of(activeUser));

        RegisterRequest request = new RegisterRequest("Existing@example.com", "newuser", "SecurePass123");

        assertThrows(DuplicateEmailException.class, () ->
                authService.register(request, "127.0.0.1"));
    }

    @Test
    @DisplayName("Register: fails when username already exists (case-insensitive)")
    void register_DuplicateUsername_ThrowsDuplicateUsernameException() {
        when(userRepository.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase(anyString())).thenReturn(Optional.of(activeUser));

        RegisterRequest request = new RegisterRequest("new@example.com", "TestUser", "SecurePass123");

        assertThrows(DuplicateUsernameException.class, () ->
                authService.register(request, "127.0.0.1"));
    }

    @Test
    @DisplayName("Register: success returns auth tokens and creates profile")
    void register_Success_CreatesUserAndReturnsTokens() {
        when(userRepository.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("newuser")).thenReturn(Optional.empty());
        when(roleRepository.findByName("USER")).thenReturn(Optional.of(new Role("USER")));
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$encoded");
        when(userRepository.save(any(User.class))).thenReturn(activeUser);
        when(jwtTokenService.generateAccessToken(any(User.class))).thenReturn("access-token-123");
        when(refreshTokenService.issueRefreshToken(any(User.class))).thenReturn("raw-refresh-token");
        when(jwtTokenService.getAccessTokenExpirationSeconds()).thenReturn(900L);

        RegisterRequest request = new RegisterRequest("new@example.com", "newuser", "SecurePass123");
        AuthService.AuthResult result = authService.register(request, "127.0.0.1");

        assertNotNull(result);
        assertEquals("access-token-123", result.response().getAccessToken());
        assertEquals("raw-refresh-token", result.rawRefreshToken());
        verify(userProfileRepository).save(any(UserProfile.class));
    }

    @Test
    @DisplayName("Login: fails with InvalidCredentialsException when email not found")
    void login_UnknownEmail_ThrowsInvalidCredentials() {
        when(bruteForceLimiter.buildKey(anyString(), anyString())).thenReturn("key");
        when(userRepository.findByEmailIgnoreCase("notfound@example.com")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest("notfound@example.com", "Pass1234");

        assertThrows(InvalidCredentialsException.class, () ->
                authService.login(request, "127.0.0.1"));
        verify(bruteForceLimiter).recordFailure("key");
    }

    @Test
    @DisplayName("Login: fails with InvalidCredentialsException when password wrong")
    void login_WrongPassword_ThrowsInvalidCredentials() {
        when(bruteForceLimiter.buildKey(anyString(), anyString())).thenReturn("key");
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("WrongPass123", activeUser.getPasswordHash())).thenReturn(false);

        LoginRequest request = new LoginRequest("test@example.com", "WrongPass123");

        assertThrows(InvalidCredentialsException.class, () ->
                authService.login(request, "127.0.0.1"));
        verify(bruteForceLimiter).recordFailure("key");
    }

    @Test
    @DisplayName("Login: fails with AccountLockedException when user status is LOCKED or DELETED")
    void login_LockedUser_ThrowsAccountLockedException() {
        activeUser.setStatus(User.STATUS_LOCKED);
        when(bruteForceLimiter.buildKey(anyString(), anyString())).thenReturn("key");
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(activeUser));

        LoginRequest request = new LoginRequest("test@example.com", "Pass1234");

        assertThrows(AccountLockedException.class, () ->
                authService.login(request, "127.0.0.1"));
    }

    @Test
    @DisplayName("Login: success resets limiter and returns tokens")
    void login_Success_ReturnsTokensAndResetsLimiter() {
        when(bruteForceLimiter.buildKey(anyString(), anyString())).thenReturn("key");
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("CorrectPass123", activeUser.getPasswordHash())).thenReturn(true);
        when(jwtTokenService.generateAccessToken(activeUser)).thenReturn("access-token-123");
        when(refreshTokenService.issueRefreshToken(activeUser)).thenReturn("raw-refresh-token");
        when(jwtTokenService.getAccessTokenExpirationSeconds()).thenReturn(900L);

        LoginRequest request = new LoginRequest("test@example.com", "CorrectPass123");
        AuthService.AuthResult result = authService.login(request, "127.0.0.1");

        assertNotNull(result);
        assertEquals("access-token-123", result.response().getAccessToken());
        verify(bruteForceLimiter).reset("key");
    }
}
