package com.languagelearning.backend.profile;

import com.languagelearning.backend.account.*;
import com.languagelearning.backend.analytics.dto.AnalyticsOverviewResponse;
import com.languagelearning.backend.analytics.service.AnalyticsService;
import com.languagelearning.backend.auth.service.*;
import com.languagelearning.backend.common.exception.TooManyRequestsException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.level.service.XpService;
import com.languagelearning.backend.profile.dto.ProfileResponse;
import com.languagelearning.backend.profile.service.ProfileService;
import com.languagelearning.backend.study.repository.StudySessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.text.Normalizer;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileValidationTest {

    @Mock private UserRepository userRepository;
    @Mock private UserProfileRepository userProfileRepository;
    @Mock private VocabularySetRepository vocabularySetRepository;
    @Mock private StudySessionRepository studySessionRepository;
    @Mock private AnalyticsService analyticsService;
    @Mock private XpService xpService;
    @Mock private AuthService authService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private JwtTokenService jwtTokenService;

    private BruteForceLimiter bruteForceLimiter;
    private ProfileService profileService;

    @BeforeEach
    void setUp() {
        bruteForceLimiter = new BruteForceLimiter();
        profileService = new ProfileService(
                userRepository,
                userProfileRepository,
                vocabularySetRepository,
                studySessionRepository,
                analyticsService,
                xpService,
                authService,
                passwordEncoder,
                bruteForceLimiter,
                refreshTokenRepository,
                refreshTokenService,
                jwtTokenService
        );
    }

    @Test
    @DisplayName("Display name: trim, NFC normalized, 1-50 chars")
    void testDisplayNameValidationSuccess() {
        User user = new User("user@example.com", "hash", "john_doe", User.STATUS_ACTIVE);
        UserProfile existingProfile = new UserProfile(user, "old_name");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userProfileRepository.findByUserId(1L)).thenReturn(Optional.of(existingProfile));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(i -> i.getArgument(0));
        when(xpService.getLevelInfo(1L)).thenReturn(new com.languagelearning.backend.level.dto.LevelInfoDto(1, 0, 0, 80, 1, "Tập sự", false));
        when(analyticsService.getOverview(eq(1L), any())).thenReturn(new AnalyticsOverviewResponse(0, 0, 0, 0, 0, 0.0, 0, 0));

        // NFD Vietnamese text with extra spaces
        String nfdName = "  Nguye" + "\u0303" + "n Va" + "\u0306" + "n A  ";
        ProfileResponse resp = profileService.updateName(1L, nfdName);

        // Expected to be NFC normalized and trimmed
        String expectedNfc = Normalizer.normalize("Nguye\u0303n Va\u0306n A", Normalizer.Form.NFC);
        assertEquals(expectedNfc, resp.displayName());
    }

    @Test
    @DisplayName("Display name: control characters are rejected")
    void testDisplayNameRejectsControlChars() {
        String nameWithControlChar = "John\u0007Doe"; // Bell control char
        ValidationException ex = assertThrows(ValidationException.class, () ->
                profileService.updateName(1L, nameWithControlChar));
        assertTrue(ex.getMessage().contains("ký tự điều khiển"));
    }

    @Test
    @DisplayName("Display name: empty or > 50 chars rejected")
    void testDisplayNameLengthBoundaries() {
        assertThrows(ValidationException.class, () -> profileService.updateName(1L, "   "));
        assertThrows(ValidationException.class, () -> profileService.updateName(1L, "A".repeat(51)));
    }

    @Test
    @DisplayName("Change password: wrong current password records failure and locks after 5 attempts")
    void testChangePasswordRateLimiting() {
        User user = new User("user@test.com", "encoded_old", "tester", User.STATUS_ACTIVE);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong_pwd", "encoded_old")).thenReturn(false);

        // First 4 attempts fail with ValidationException
        for (int i = 0; i < 4; i++) {
            assertThrows(ValidationException.class, () ->
                    profileService.changePassword(10L, "wrong_pwd", "NewPass123", "127.0.0.1"));
        }

        // 5th attempt fails
        assertThrows(ValidationException.class, () ->
                profileService.changePassword(10L, "wrong_pwd", "NewPass123", "127.0.0.1"));

        // 6th attempt is blocked with 429 TooManyRequestsException
        assertThrows(TooManyRequestsException.class, () ->
                profileService.changePassword(10L, "wrong_pwd", "NewPass123", "127.0.0.1"));
    }

    @Test
    @DisplayName("Change password: new password identical to current is rejected")
    void testChangePasswordRejectsSamePassword() {
        User user = new User("user@test.com", "encoded_old", "tester", User.STATUS_ACTIVE);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("CurrentPass1", "encoded_old")).thenReturn(true);

        ValidationException ex = assertThrows(ValidationException.class, () ->
                profileService.changePassword(10L, "CurrentPass1", "CurrentPass1", "127.0.0.1"));
        assertTrue(ex.getMessage().contains("trùng"));
    }
}
