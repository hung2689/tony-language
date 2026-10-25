package com.languagelearning.backend.auth;

import com.languagelearning.backend.account.RefreshToken;
import com.languagelearning.backend.account.RefreshTokenRepository;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.auth.service.RefreshTokenService;
import com.languagelearning.backend.common.exception.InvalidRefreshTokenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    private RefreshTokenService refreshTokenService;

    private User user;

    @BeforeEach
    void setUp() {
        refreshTokenService = new RefreshTokenService(refreshTokenRepository, 30L, 10L);
        user = new User("test@example.com", "hash", "testuser", User.STATUS_ACTIVE);
        user.setId(5L);
    }

    @Test
    @DisplayName("Rotation: successful conditional update issues new refresh token")
    void rotateToken_Success_IssuesNewToken() {
        String rawToken = refreshTokenService.generateRawToken();
        String hash = refreshTokenService.hashToken(rawToken);

        RefreshToken oldToken = new RefreshToken(user, hash, Instant.now().plusSeconds(3600));
        oldToken.setRevokedAt(Instant.now());

        when(refreshTokenRepository.revokeTokenIfActive(eq(hash), any(Instant.class))).thenReturn(1);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(oldToken));

        RefreshTokenService.RotatedTokenResult result = refreshTokenService.rotateRefreshToken(rawToken);

        assertNotNull(result);
        assertEquals(user, result.user());
        assertNotNull(result.newRawRefreshToken());
        assertNotEquals(rawToken, result.newRawRefreshToken());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Rotation: unknown token throws InvalidRefreshTokenException")
    void rotateToken_UnknownToken_ThrowsException() {
        String rawToken = refreshTokenService.generateRawToken();
        String hash = refreshTokenService.hashToken(rawToken);

        when(refreshTokenRepository.revokeTokenIfActive(eq(hash), any(Instant.class))).thenReturn(0);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.empty());

        assertThrows(InvalidRefreshTokenException.class, () ->
                refreshTokenService.rotateRefreshToken(rawToken));
    }

    @Test
    @DisplayName("Rotation: concurrent refresh within grace window (<= 10s) does NOT revoke family")
    void rotateToken_WithinGraceWindow_DoesNotRevokeFamily() {
        String rawToken = refreshTokenService.generateRawToken();
        String hash = refreshTokenService.hashToken(rawToken);

        RefreshToken token = new RefreshToken(user, hash, Instant.now().plusSeconds(3600));
        token.setRevokedAt(Instant.now().minusSeconds(5)); // 5 seconds ago <= 10s grace

        when(refreshTokenRepository.revokeTokenIfActive(eq(hash), any(Instant.class))).thenReturn(0);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(token));

        InvalidRefreshTokenException ex = assertThrows(InvalidRefreshTokenException.class, () ->
                refreshTokenService.rotateRefreshToken(rawToken));

        assertTrue(ex.getMessage().contains("vừa được làm mới ở một tab khác"));
        verify(refreshTokenRepository, never()).revokeAllActiveTokensByUserId(anyLong(), any(Instant.class));
    }

    @Test
    @DisplayName("Rotation: duplicate concurrent call within grace window replays cached rotation result without revoking family")
    void rotateToken_DuplicateConcurrentCallWithinGrace_ReplaysRotatedResult() {
        String rawToken = refreshTokenService.generateRawToken(true);
        String hash = refreshTokenService.hashToken(rawToken);

        RefreshToken oldToken = new RefreshToken(user, hash, Instant.now().plusSeconds(3600));
        oldToken.setRevokedAt(Instant.now());

        // First call succeeds (rowsUpdated = 1), second concurrent call sees rowsUpdated = 0
        when(refreshTokenRepository.revokeTokenIfActive(eq(hash), any(Instant.class)))
                .thenReturn(1)
                .thenReturn(0);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(oldToken));

        RefreshTokenService.RotatedTokenResult firstResult = refreshTokenService.rotateRefreshToken(rawToken);
        RefreshTokenService.RotatedTokenResult secondResult = refreshTokenService.rotateRefreshToken(rawToken);

        assertNotNull(firstResult);
        assertNotNull(secondResult);
        assertEquals(firstResult.newRawRefreshToken(), secondResult.newRawRefreshToken());
        assertTrue(secondResult.persistent());
        verify(refreshTokenRepository, never()).revokeAllActiveTokensByUserId(anyLong(), any(Instant.class));
    }

    @Test
    @DisplayName("Rotation: preserves session vs persistent (rememberMe) mode across sliding rotations")
    void rotateToken_PreservesSessionAndPersistentFlag() {
        String sessionToken = refreshTokenService.generateRawToken(false);
        String sessionHash = refreshTokenService.hashToken(sessionToken);

        assertFalse(refreshTokenService.isPersistentToken(sessionToken));

        RefreshToken oldSessionEntity = new RefreshToken(user, sessionHash, Instant.now().plusSeconds(3600));
        oldSessionEntity.setRevokedAt(Instant.now());

        when(refreshTokenRepository.revokeTokenIfActive(eq(sessionHash), any(Instant.class))).thenReturn(1);
        when(refreshTokenRepository.findByTokenHash(sessionHash)).thenReturn(Optional.of(oldSessionEntity));

        RefreshTokenService.RotatedTokenResult rotatedSession = refreshTokenService.rotateRefreshToken(sessionToken);
        assertFalse(rotatedSession.persistent());
        assertFalse(refreshTokenService.isPersistentToken(rotatedSession.newRawRefreshToken()));
    }

    @Test
    @DisplayName("Rotation: token reuse after grace window (> 10s) revokes ALL user active tokens")
    void rotateToken_ReuseAfterGraceWindow_RevokesAllUserTokens() {
        String rawToken = refreshTokenService.generateRawToken();
        String hash = refreshTokenService.hashToken(rawToken);

        RefreshToken token = new RefreshToken(user, hash, Instant.now().plusSeconds(3600));
        token.setRevokedAt(Instant.now().minusSeconds(30)); // 30 seconds ago > 10s grace

        when(refreshTokenRepository.revokeTokenIfActive(eq(hash), any(Instant.class))).thenReturn(0);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(token));

        InvalidRefreshTokenException ex = assertThrows(InvalidRefreshTokenException.class, () ->
                refreshTokenService.rotateRefreshToken(rawToken));

        assertTrue(ex.getMessage().contains("bất thường"));
        verify(refreshTokenRepository).revokeAllActiveTokensByUserId(eq(user.getId()), any(Instant.class));
    }

    @Test
    @DisplayName("Logout: revokes refresh token if active")
    void logout_RevokesToken() {
        String rawToken = refreshTokenService.generateRawToken();
        String hash = refreshTokenService.hashToken(rawToken);

        refreshTokenService.revokeRefreshToken(rawToken);

        verify(refreshTokenRepository).revokeTokenIfActive(eq(hash), any(Instant.class));
    }
}
