package com.languagelearning.backend.analytics;

import com.languagelearning.backend.analytics.dto.*;
import com.languagelearning.backend.analytics.service.AnalyticsService;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.entity.StudySession;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.repository.StudySessionRepository;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private StudySessionRepository studySessionRepository;

    @Mock
    private StudyProgressRepository studyProgressRepository;

    @Mock
    private VocabularySetRepository vocabularySetRepository;

    @Mock
    private VocabularyRepository vocabularyRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    private Long userId;
    private ZoneId zoneId;

    @BeforeEach
    void setUp() {
        userId = 1L;
        zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
    }

    @Test
    @DisplayName("getOverview calculates streaks, accuracy, and active days correctly")
    void testGetOverview() {
        LocalDate today = LocalDate.now(zoneId);
        Instant t1 = today.minusDays(2).atTime(10, 0).atZone(zoneId).toInstant();
        Instant t2 = today.minusDays(1).atTime(15, 0).atZone(zoneId).toInstant();
        Instant t3 = today.atTime(9, 30).atZone(zoneId).toInstant();

        StudySession s1 = new StudySession(userId, 1L, "VI_TO_EN");
        s1.setStartedAt(t1);
        s1.setTotalQuestions(10);
        s1.setCorrectAnswers(9);
        s1.setWrongAnswers(1);

        StudySession s2 = new StudySession(userId, 1L, "VI_TO_EN");
        s2.setStartedAt(t2);
        s2.setTotalQuestions(20);
        s2.setCorrectAnswers(18);
        s2.setWrongAnswers(2);

        StudySession s3 = new StudySession(userId, 1L, "VI_TO_EN");
        s3.setStartedAt(t3);
        s3.setTotalQuestions(10);
        s3.setCorrectAnswers(9);
        s3.setWrongAnswers(1);

        when(studySessionRepository.findByUserIdOrderByStartedAtAsc(userId))
                .thenReturn(List.of(s1, s2, s3));

        StudyProgress p1 = new StudyProgress(userId, 101L);
        p1.setCorrectCount(5);
        p1.setWrongCount(1);
        when(studyProgressRepository.findByUserId(userId)).thenReturn(List.of(p1));

        AnalyticsOverviewResponse res = analyticsService.getOverview(userId, zoneId);

        assertEquals(3, res.currentStreak());
        assertEquals(3, res.longestStreak());
        assertEquals(40, res.totalQuestions());
        assertEquals(36, res.correctQuestions());
        assertEquals(4, res.wrongQuestions());
        assertEquals(90.0, res.overallAccuracy());
        assertEquals(3, res.totalActiveDays());
        assertEquals(1, res.totalLearnedCards());
    }

    @Test
    @DisplayName("getHeatmap groups sessions by date and determines color level")
    void testGetHeatmap() {
        LocalDate d = LocalDate.of(2026, 5, 20);
        Instant inst = d.atTime(14, 0).atZone(zoneId).toInstant();

        StudySession s = new StudySession(userId, 1L, "VI_TO_EN");
        s.setStartedAt(inst);
        s.setTotalQuestions(30);
        s.setCorrectAnswers(27);
        s.setWrongAnswers(3);

        when(studySessionRepository.findByUserIdAndStartedAtBetweenOrderByStartedAtAsc(eq(userId), any(), any()))
                .thenReturn(List.of(s));

        HeatmapResponse heatmap = analyticsService.getHeatmap(userId, 2026, zoneId);

        assertEquals(2026, heatmap.year());
        assertEquals(1, heatmap.totalActiveDays());
        assertEquals(30, heatmap.totalQuestions());
        assertEquals(90.0, heatmap.averageAccuracy());
        assertEquals(1, heatmap.days().size());

        DailyActivityDto day = heatmap.days().get(0);
        assertEquals("2026-05-20", day.date());
        assertEquals(30, day.totalQuestions());
        assertEquals(3, day.level()); // 25..49 is level 3
    }

    @Test
    @DisplayName("getRetentionDistribution segments cards into unseen, learning, reviewing, mastered")
    void testGetRetention() {
        VocabularySet deck = new VocabularySet(userId, null, "Deck", "Desc");
        deck.setId(10L);
        when(vocabularySetRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(deck));

        Vocabulary v1 = new Vocabulary("word1", "nghia 1", null, null, null);
        v1.setId(1L);
        Vocabulary v2 = new Vocabulary("word2", "nghia 2", null, null, null);
        v2.setId(2L);
        Vocabulary v3 = new Vocabulary("word3", "nghia 3", null, null, null);
        v3.setId(3L);
        Vocabulary v4 = new Vocabulary("word4", "nghia 4", null, null, null);
        v4.setId(4L);
        when(vocabularyRepository.findByDeckIdIn(List.of(10L))).thenReturn(List.of(v1, v2, v3, v4));

        StudyProgress spMastered = new StudyProgress(userId, 1L);
        spMastered.setIntervalDays(25);

        StudyProgress spReviewing = new StudyProgress(userId, 2L);
        spReviewing.setIntervalDays(10);

        StudyProgress spLearning = new StudyProgress(userId, 3L);
        spLearning.setIntervalDays(2);
        spLearning.setCorrectCount(2);

        when(studyProgressRepository.findByUserId(userId))
                .thenReturn(List.of(spMastered, spReviewing, spLearning));

        RetentionDistributionResponse res = analyticsService.getRetentionDistribution(userId);

        assertEquals(1, res.unseenCount());
        assertEquals(1, res.learningCount());
        assertEquals(1, res.reviewingCount());
        assertEquals(1, res.masteredCount());
        assertEquals(4, res.totalCards());
    }

    @Test
    @DisplayName("getWeakWords returns cards with wrong answers sorted by frequency")
    void testGetWeakWords() {
        StudyProgress p1 = new StudyProgress(userId, 101L);
        p1.setWrongCount(8);
        p1.setCorrectCount(2);
        p1.setAccuracy(new BigDecimal("20.0"));

        StudyProgress p2 = new StudyProgress(userId, 102L);
        p2.setWrongCount(3);
        p2.setCorrectCount(5);
        p2.setAccuracy(new BigDecimal("62.5"));

        when(studyProgressRepository.findByUserId(userId)).thenReturn(List.of(p2, p1));

        Vocabulary v1 = new Vocabulary("ubiquitous", "phổ biến", null, null, null);
        v1.setId(101L);
        Vocabulary v2 = new Vocabulary("ephemeral", "phù du", null, null, null);
        v2.setId(102L);

        when(vocabularyRepository.findAllById(List.of(101L, 102L))).thenReturn(List.of(v1, v2));

        List<WeakWordDto> weakWords = analyticsService.getWeakWords(userId, 5);

        assertEquals(2, weakWords.size());
        assertEquals("ubiquitous", weakWords.get(0).word());
        assertEquals(8, weakWords.get(0).wrongCount());
        assertEquals("ephemeral", weakWords.get(1).word());
        assertEquals(3, weakWords.get(1).wrongCount());
    }
}
