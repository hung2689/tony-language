package com.languagelearning.backend.analytics;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.analytics.dto.AnalyticsOverviewResponse;
import com.languagelearning.backend.analytics.dto.HeatmapResponse;
import com.languagelearning.backend.analytics.dto.RetentionDistributionResponse;
import com.languagelearning.backend.analytics.dto.WeakWordDto;
import com.languagelearning.backend.analytics.service.AnalyticsService;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class AnalyticsParityIntegrationTest {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private StudySessionRepository studySessionRepository;

    @Autowired
    private StudyProgressRepository studyProgressRepository;

    private User testUser;
    private final ZoneId zoneHcm = ZoneId.of("Asia/Ho_Chi_Minh");
    private final ZoneId zoneUtc = ZoneId.of("UTC");

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("parity_user_" + System.currentTimeMillis() + "_" + Math.random());
        testUser.setEmail("parity_" + System.currentTimeMillis() + "@test.com");
        testUser.setPasswordHash("hashedpassword123");
        testUser = userRepository.save(testUser);
    }

    private Vocabulary createVocab(String word, String meaning) {
        Vocabulary v = new Vocabulary(word, meaning, "noun", "/word/", "Example sentence");
        return vocabularyRepository.save(v);
    }

    private VocabularySet createDeck(String name, List<Vocabulary> vocabs) {
        VocabularySet deck = new VocabularySet(testUser.getId(), null, name, "Description");
        deck = vocabularySetRepository.save(deck);
        for (Vocabulary v : vocabs) {
            vocabularySetItemRepository.save(new VocabularySetItem(deck.getId(), v.getId()));
        }
        return deck;
    }

    private StudySession createSession(Instant startedAt, int total, int correct, int wrong) {
        StudySession s = new StudySession(testUser.getId(), null, "VI_TO_EN");
        s.setStartedAt(startedAt);
        s.setTotalQuestions(total);
        s.setCorrectAnswers(correct);
        s.setWrongAnswers(wrong);
        return studySessionRepository.save(s);
    }

    private StudyProgress createProgress(Vocabulary v, int correct, int wrong, BigDecimal accuracy, int intervalDays) {
        StudyProgress p = new StudyProgress(testUser.getId(), v.getId());
        p.setCorrectCount(correct);
        p.setWrongCount(wrong);
        p.setAccuracy(accuracy);
        p.setIntervalDays(intervalDays);
        p.setLastReviewedAt(Instant.now());
        return studyProgressRepository.save(p);
    }

    @Test
    @DisplayName("Ca 1: User mới (chưa có session, chưa có progress, chưa có deck)")
    void testScenario1_NewUser() {
        AnalyticsOverviewResponse overviewOpt = analyticsService.getOverview(testUser.getId(), zoneHcm);
        AnalyticsOverviewResponse overviewLeg = analyticsService.getOverviewLegacyForParity(testUser.getId(), zoneHcm);
        assertEquals(overviewLeg, overviewOpt);
        assertEquals(0, overviewOpt.totalQuestions());
        assertEquals(0, overviewOpt.currentStreak());
        assertEquals(0, overviewOpt.longestStreak());
        assertEquals(0.0, overviewOpt.overallAccuracy());
        assertEquals(0, overviewOpt.totalActiveDays());
        assertEquals(0, overviewOpt.totalLearnedCards());

        HeatmapResponse heatmapOpt = analyticsService.getHeatmap(testUser.getId(), 2026, zoneHcm);
        HeatmapResponse heatmapLeg = analyticsService.getHeatmapLegacyForParity(testUser.getId(), 2026, zoneHcm);
        assertEquals(heatmapLeg.year(), heatmapOpt.year());
        assertEquals(heatmapLeg.totalActiveDays(), heatmapOpt.totalActiveDays());
        assertEquals(heatmapLeg.totalQuestions(), heatmapOpt.totalQuestions());
        assertEquals(heatmapLeg.averageAccuracy(), heatmapOpt.averageAccuracy());
        assertEquals(heatmapLeg.days(), heatmapOpt.days());

        RetentionDistributionResponse retOpt = analyticsService.getRetentionDistribution(testUser.getId());
        RetentionDistributionResponse retLeg = analyticsService.getRetentionDistributionLegacyForParity(testUser.getId());
        assertEquals(retLeg, retOpt);
        assertEquals(0, retOpt.totalCards());
        assertEquals(0, retOpt.masteredCount());
        assertEquals(0, retOpt.unseenCount());

        List<WeakWordDto> weakOpt = analyticsService.getWeakWords(testUser.getId(), 10);
        List<WeakWordDto> weakLeg = analyticsService.getWeakWordsLegacyForParity(testUser.getId(), 10);
        assertEquals(weakLeg, weakOpt);
        assertTrue(weakOpt.isEmpty());
    }

    @Test
    @DisplayName("Ca 2: User chỉ có đúng 1 session duy nhất")
    void testScenario2_SingleSession() {
        Vocabulary v1 = createVocab("single_1", "nghia 1");
        Vocabulary v2 = createVocab("single_2", "nghia 2");
        createDeck("Deck Single", List.of(v1, v2));

        LocalDate today = LocalDate.now(zoneHcm);
        Instant startedAt = today.atTime(10, 0).atZone(zoneHcm).toInstant();
        createSession(startedAt, 10, 8, 2);
        createProgress(v1, 8, 2, new BigDecimal("80.00"), 2);

        AnalyticsOverviewResponse overviewOpt = analyticsService.getOverview(testUser.getId(), zoneHcm);
        AnalyticsOverviewResponse overviewLeg = analyticsService.getOverviewLegacyForParity(testUser.getId(), zoneHcm);
        assertEquals(overviewLeg, overviewOpt);
        assertEquals(10, overviewOpt.totalQuestions());
        assertEquals(8, overviewOpt.correctQuestions());
        assertEquals(2, overviewOpt.wrongQuestions());
        assertEquals(80.0, overviewOpt.overallAccuracy());
        assertEquals(1, overviewOpt.totalActiveDays());
        assertEquals(1, overviewOpt.totalLearnedCards());
        assertEquals(1, overviewOpt.currentStreak());
        assertEquals(1, overviewOpt.longestStreak());

        HeatmapResponse heatmapOpt = analyticsService.getHeatmap(testUser.getId(), today.getYear(), zoneHcm);
        HeatmapResponse heatmapLeg = analyticsService.getHeatmapLegacyForParity(testUser.getId(), today.getYear(), zoneHcm);
        assertEquals(heatmapLeg.totalActiveDays(), heatmapOpt.totalActiveDays());
        assertEquals(heatmapLeg.totalQuestions(), heatmapOpt.totalQuestions());
        assertEquals(heatmapLeg.averageAccuracy(), heatmapOpt.averageAccuracy());
        assertEquals(heatmapLeg.days().size(), heatmapOpt.days().size());
        assertEquals(heatmapLeg.days().get(0), heatmapOpt.days().get(0));

        RetentionDistributionResponse retOpt = analyticsService.getRetentionDistribution(testUser.getId());
        RetentionDistributionResponse retLeg = analyticsService.getRetentionDistributionLegacyForParity(testUser.getId());
        assertEquals(retLeg, retOpt);
        assertEquals(2, retOpt.totalCards());
        assertEquals(1, retOpt.learningCount());
        assertEquals(1, retOpt.unseenCount());

        List<WeakWordDto> weakOpt = analyticsService.getWeakWords(testUser.getId(), 5);
        List<WeakWordDto> weakLeg = analyticsService.getWeakWordsLegacyForParity(testUser.getId(), 5);
        assertEquals(weakLeg.size(), weakOpt.size());
        assertEquals(weakLeg.get(0).word(), weakOpt.get(0).word());
        assertEquals(weakLeg.get(0).wrongCount(), weakOpt.get(0).wrongCount());
    }

    @Test
    @DisplayName("Ca 3: Streak đứt ngay hôm nay / hôm qua")
    void testScenario3_BrokenStreak() {
        LocalDate today = LocalDate.now(zoneHcm);

        // Subcase 3a: Learned 3 days ago and 2 days ago, but NOT yesterday and NOT today -> currentStreak = 0, longestStreak = 2
        Instant tMinus3 = today.minusDays(3).atTime(9, 0).atZone(zoneHcm).toInstant();
        Instant tMinus2 = today.minusDays(2).atTime(9, 0).atZone(zoneHcm).toInstant();
        createSession(tMinus3, 10, 9, 1);
        createSession(tMinus2, 10, 8, 2);

        AnalyticsOverviewResponse resOpt = analyticsService.getOverview(testUser.getId(), zoneHcm);
        AnalyticsOverviewResponse resLeg = analyticsService.getOverviewLegacyForParity(testUser.getId(), zoneHcm);
        assertEquals(resLeg, resOpt);
        assertEquals(0, resOpt.currentStreak(), "Current streak should be 0 because streak broke before yesterday");
        assertEquals(2, resOpt.longestStreak(), "Longest streak should be 2");

        // Subcase 3b: Now user studies yesterday (today - 1) -> currentStreak continues at 1
        Instant tMinus1 = today.minusDays(1).atTime(15, 0).atZone(zoneHcm).toInstant();
        createSession(tMinus1, 15, 12, 3);

        AnalyticsOverviewResponse resOpt2 = analyticsService.getOverview(testUser.getId(), zoneHcm);
        AnalyticsOverviewResponse resLeg2 = analyticsService.getOverviewLegacyForParity(testUser.getId(), zoneHcm);
        assertEquals(resLeg2, resOpt2);
        assertEquals(3, resOpt2.currentStreak(), "Streak continued through yesterday: day-3, day-2, day-1 = 3");
        assertEquals(3, resOpt2.longestStreak());

        // Subcase 3c: Add a session today -> currentStreak = 4
        Instant tToday = today.atTime(11, 0).atZone(zoneHcm).toInstant();
        createSession(tToday, 20, 18, 2);

        AnalyticsOverviewResponse resOpt3 = analyticsService.getOverview(testUser.getId(), zoneHcm);
        AnalyticsOverviewResponse resLeg3 = analyticsService.getOverviewLegacyForParity(testUser.getId(), zoneHcm);
        assertEquals(resLeg3, resOpt3);
        assertEquals(4, resOpt3.currentStreak());
        assertEquals(4, resOpt3.longestStreak());
    }

    @Test
    @DisplayName("Ca 4: Học qua nửa đêm theo múi giờ khác nhau (UTC vs Asia/Ho_Chi_Minh)")
    void testScenario4_MidnightTimezones() {
        // 2026-05-20 18:00:00 UTC is:
        // - 2026-05-20 in UTC
        // - 2026-05-21 01:00:00 in Asia/Ho_Chi_Minh (UTC+7)
        Instant midnightCrossInstant = Instant.parse("2026-05-20T18:00:00Z");
        createSession(midnightCrossInstant, 30, 25, 5);

        // Test with UTC
        AnalyticsOverviewResponse utcOpt = analyticsService.getOverview(testUser.getId(), zoneUtc);
        AnalyticsOverviewResponse utcLeg = analyticsService.getOverviewLegacyForParity(testUser.getId(), zoneUtc);
        assertEquals(utcLeg, utcOpt);

        HeatmapResponse heatmapUtcOpt = analyticsService.getHeatmap(testUser.getId(), 2026, zoneUtc);
        HeatmapResponse heatmapUtcLeg = analyticsService.getHeatmapLegacyForParity(testUser.getId(), 2026, zoneUtc);
        assertEquals(heatmapUtcLeg.days(), heatmapUtcOpt.days());
        assertEquals(1, heatmapUtcOpt.days().size());
        assertEquals("2026-05-20", heatmapUtcOpt.days().get(0).date(), "In UTC date must be 2026-05-20");

        // Test with Asia/Ho_Chi_Minh
        AnalyticsOverviewResponse hcmOpt = analyticsService.getOverview(testUser.getId(), zoneHcm);
        AnalyticsOverviewResponse hcmLeg = analyticsService.getOverviewLegacyForParity(testUser.getId(), zoneHcm);
        assertEquals(hcmLeg, hcmOpt);

        HeatmapResponse heatmapHcmOpt = analyticsService.getHeatmap(testUser.getId(), 2026, zoneHcm);
        HeatmapResponse heatmapHcmLeg = analyticsService.getHeatmapLegacyForParity(testUser.getId(), 2026, zoneHcm);
        assertEquals(heatmapHcmLeg.days(), heatmapHcmOpt.days());
        assertEquals(1, heatmapHcmOpt.days().size());
        assertEquals("2026-05-21", heatmapHcmOpt.days().get(0).date(), "In Asia/Ho_Chi_Minh date must be 2026-05-21");
    }

    @Test
    @DisplayName("Ca 5: Weak words có nhiều từ cùng wrong_count nhưng khác accuracy (tie-break)")
    void testScenario5_WeakWordsTieBreak() {
        Vocabulary vA = createVocab("word_A", "mean A");
        Vocabulary vB = createVocab("word_B", "mean B");
        Vocabulary vC = createVocab("word_C", "mean C");
        Vocabulary vD = createVocab("word_D", "mean D");
        Vocabulary vE = createVocab("word_E", "mean E");

        createProgress(vA, 5, 5, new BigDecimal("50.00"), 1);  // wrong=5, acc=50.00
        createProgress(vB, 1, 5, new BigDecimal("16.67"), 1);  // wrong=5, acc=16.67
        createProgress(vC, 15, 5, new BigDecimal("75.00"), 1); // wrong=5, acc=75.00
        createProgress(vD, 0, 3, new BigDecimal("0.00"), 1);   // wrong=3, acc=0.00
        createProgress(vE, 2, 8, new BigDecimal("20.00"), 1);  // wrong=8, acc=20.00

        // Test limit = 10
        List<WeakWordDto> weakOpt = analyticsService.getWeakWords(testUser.getId(), 10);
        List<WeakWordDto> weakLeg = analyticsService.getWeakWordsLegacyForParity(testUser.getId(), 10);

        assertEquals(weakLeg.size(), weakOpt.size());
        assertEquals(5, weakOpt.size());

        for (int i = 0; i < weakOpt.size(); i++) {
            assertEquals(weakLeg.get(i).vocabularyId(), weakOpt.get(i).vocabularyId());
            assertEquals(weakLeg.get(i).word(), weakOpt.get(i).word());
            assertEquals(weakLeg.get(i).wrongCount(), weakOpt.get(i).wrongCount());
            assertEquals(weakLeg.get(i).correctCount(), weakOpt.get(i).correctCount());
            assertEquals(weakLeg.get(i).accuracy(), weakOpt.get(i).accuracy(), 0.001);
        }

        // Expected order:
        // Index 0: vE (wrong=8)
        // Index 1: vB (wrong=5, acc=16.67)
        // Index 2: vA (wrong=5, acc=50.00)
        // Index 3: vC (wrong=5, acc=75.00)
        // Index 4: vD (wrong=3, acc=0.00)
        assertEquals("word_E", weakOpt.get(0).word());
        assertEquals("word_B", weakOpt.get(1).word());
        assertEquals("word_A", weakOpt.get(2).word());
        assertEquals("word_C", weakOpt.get(3).word());
        assertEquals("word_D", weakOpt.get(4).word());

        // Test limit = 2
        List<WeakWordDto> weakOptLimit2 = analyticsService.getWeakWords(testUser.getId(), 2);
        List<WeakWordDto> weakLegLimit2 = analyticsService.getWeakWordsLegacyForParity(testUser.getId(), 2);
        assertEquals(2, weakOptLimit2.size());
        assertEquals(weakLegLimit2.size(), weakOptLimit2.size());
        assertEquals("word_E", weakOptLimit2.get(0).word());
        assertEquals("word_B", weakOptLimit2.get(1).word());
    }

    @Test
    @DisplayName("Ca 6: Retention distribution buckets (mastered, reviewing, learning, unseen)")
    void testScenario6_RetentionDistributionBuckets() {
        Vocabulary vMastered = createVocab("ret_mastered", "mean");
        Vocabulary vReviewing1 = createVocab("ret_reviewing1", "mean");
        Vocabulary vReviewing2 = createVocab("ret_reviewing2", "mean");
        Vocabulary vLearning = createVocab("ret_learning", "mean");
        Vocabulary vUnseenWithProgress = createVocab("ret_unseen1", "mean");
        Vocabulary vUnseenNoProgress = createVocab("ret_unseen2", "mean");

        createDeck("Retention Deck", List.of(
                vMastered, vReviewing1, vReviewing2, vLearning, vUnseenWithProgress, vUnseenNoProgress
        ));

        // Mastered: interval > 21
        createProgress(vMastered, 10, 0, new BigDecimal("100.00"), 25);
        // Reviewing: 7 <= interval <= 21
        createProgress(vReviewing1, 5, 0, new BigDecimal("100.00"), 21);
        createProgress(vReviewing2, 4, 1, new BigDecimal("80.00"), 7);
        // Learning: interval < 7 AND (correct > 0 || wrong > 0)
        createProgress(vLearning, 1, 0, new BigDecimal("100.00"), 4);
        // Unseen with progress: interval < 7 AND correct == 0 AND wrong == 0
        createProgress(vUnseenWithProgress, 0, 0, BigDecimal.ZERO, 0);
        // vUnseenNoProgress: no progress row

        RetentionDistributionResponse opt = analyticsService.getRetentionDistribution(testUser.getId());
        RetentionDistributionResponse leg = analyticsService.getRetentionDistributionLegacyForParity(testUser.getId());

        assertEquals(leg, opt);
        assertEquals(6, opt.totalCards());
        assertEquals(1, opt.masteredCount());
        assertEquals(2, opt.reviewingCount());
        assertEquals(1, opt.learningCount());
        assertEquals(2, opt.unseenCount());
    }
}
