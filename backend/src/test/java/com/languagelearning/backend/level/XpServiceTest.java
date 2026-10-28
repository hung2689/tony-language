package com.languagelearning.backend.level;

import com.languagelearning.backend.level.dto.LevelInfoDto;
import com.languagelearning.backend.level.entity.UserXp;
import com.languagelearning.backend.level.entity.XpEvent;
import com.languagelearning.backend.level.repository.UserXpRepository;
import com.languagelearning.backend.level.repository.XpEventRepository;
import com.languagelearning.backend.level.service.XpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class XpServiceTest {

    @Mock
    private UserXpRepository userXpRepository;

    @Mock
    private XpEventRepository xpEventRepository;

    private XpService xpService;

    @BeforeEach
    void setUp() {
        xpService = new XpService(userXpRepository, xpEventRepository);
    }

    @Test
    @DisplayName("Answer correct on first attempt awards +5 XP")
    void testAwardFirstAttemptCorrectXp() {
        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "STUDY_ANSWER", "ans_1")).thenReturn(false);
        when(xpEventRepository.sumXpByUserIdAndCreatedAtBetween(eq(1L), any(Instant.class), any(Instant.class))).thenReturn(0L);

        int xp = xpService.awardAnswerXp(1L, "ans_1", true, 1, false);

        assertEquals(XpConfig.FIRST_ATTEMPT_CORRECT_XP, xp);
        verify(xpEventRepository).save(any(XpEvent.class));
        verify(userXpRepository).addXpAtomic(eq(1L), eq(5L), any(Instant.class));
    }

    @Test
    @DisplayName("Answer correct after miss (attempt > 1) awards +2 XP")
    void testAwardRetryCorrectXp() {
        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "STUDY_ANSWER", "ans_2")).thenReturn(false);
        when(xpEventRepository.sumXpByUserIdAndCreatedAtBetween(eq(1L), any(Instant.class), any(Instant.class))).thenReturn(0L);

        int xp = xpService.awardAnswerXp(1L, "ans_2", true, 2, false);

        assertEquals(XpConfig.RETRY_CORRECT_XP, xp);
        verify(userXpRepository).addXpAtomic(eq(1L), eq(2L), any(Instant.class));
    }

    @Test
    @DisplayName("Wrong answer or override awards 0 XP")
    void testWrongOrOverrideAwardsZeroXp() {
        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "STUDY_ANSWER", "ans_wrong")).thenReturn(false);
        int wrongXp = xpService.awardAnswerXp(1L, "ans_wrong", false, 1, false);
        assertEquals(0, wrongXp);
        verify(userXpRepository, never()).addXpAtomic(eq(1L), anyLong(), any(Instant.class));

        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "STUDY_ANSWER", "ans_override")).thenReturn(false);
        int overrideXp = xpService.awardAnswerXp(1L, "ans_override", true, 1, true);
        assertEquals(0, overrideXp);
    }

    @Test
    @DisplayName("Idempotent retry: same clientAnswerId does not award double XP")
    void testIdempotentRetryPreventsDoubleXp() {
        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "STUDY_ANSWER", "dup_ans")).thenReturn(true);

        int xp = xpService.awardAnswerXp(1L, "dup_ans", true, 1, false);

        assertEquals(0, xp);
        verify(xpEventRepository, never()).save(any(XpEvent.class));
        verify(userXpRepository, never()).addXpAtomic(anyLong(), anyLong(), any(Instant.class));
    }

    @Test
    @DisplayName("Session finish bonus: >= 5 answers gives +10 XP, < 5 answers gives 0")
    void testSessionFinishBonus() {
        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "SESSION_FINISH", "session_10")).thenReturn(false);
        when(xpEventRepository.sumXpByUserIdAndCreatedAtBetween(eq(1L), any(Instant.class), any(Instant.class))).thenReturn(0L);

        int bonus = xpService.awardSessionCompletionBonus(1L, 10L, 5);
        assertEquals(XpConfig.SESSION_FINISHED_XP, bonus);

        // Less than 5 answers
        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "SESSION_FINISH", "session_11")).thenReturn(false);
        int noBonus = xpService.awardSessionCompletionBonus(1L, 11L, 4);
        assertEquals(0, noBonus);
    }

    @Test
    @DisplayName("Daily streak bonus awards +20 XP once per day")
    void testDailyStreakBonus() {
        LocalDate today = LocalDate.of(2026, 10, 25);
        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "DAILY_STREAK", "streak_2026-10-25")).thenReturn(false);
        when(xpEventRepository.sumXpByUserIdAndCreatedAtBetween(eq(1L), any(Instant.class), any(Instant.class))).thenReturn(0L);

        int xp = xpService.awardDailyStreakBonus(1L, today);
        assertEquals(XpConfig.DAILY_STREAK_BONUS_XP, xp);
    }

    @Test
    @DisplayName("Daily cap (500 XP) clamps awarded XP")
    void testDailyCapClamping() {
        when(xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(1L, "STUDY_ANSWER", "ans_cap")).thenReturn(false);
        // Already earned 498 XP today
        when(xpEventRepository.sumXpByUserIdAndCreatedAtBetween(eq(1L), any(Instant.class), any(Instant.class))).thenReturn(498L);

        // Asking for +5 XP, but only 2 XP left until 500
        int xp = xpService.awardAnswerXp(1L, "ans_cap", true, 1, false);
        assertEquals(2, xp);
        verify(userXpRepository).addXpAtomic(eq(1L), eq(2L), any(Instant.class));
    }

    @Test
    @DisplayName("getLevelInfo calculates correct level from user total XP")
    void testGetLevelInfo() {
        when(userXpRepository.findById(1L)).thenReturn(Optional.of(new UserXp(1L, 3600L)));

        LevelInfoDto info = xpService.getLevelInfo(1L);
        assertEquals(10, info.level());
        assertEquals(3600L, info.totalXp());
        assertEquals("Bạc", info.tierName());
    }
}
