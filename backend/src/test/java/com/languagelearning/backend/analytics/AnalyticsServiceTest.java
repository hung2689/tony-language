package com.languagelearning.backend.analytics;

import com.languagelearning.backend.analytics.dto.*;
import com.languagelearning.backend.analytics.repository.AnalyticsSql;
import com.languagelearning.backend.analytics.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

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

        when(jdbcTemplate.queryForObject(
                eq(AnalyticsSql.OVERVIEW_TOTALS),
                any(RowMapper.class),
                eq(userId), eq(userId), eq(userId), eq(userId)
        )).thenReturn(new int[]{40, 36, 4, 1});

        when(jdbcTemplate.query(
                eq(AnalyticsSql.OVERVIEW_ACTIVE_DATES),
                any(RowMapper.class),
                eq(zoneId.getId()), eq(userId)
        )).thenReturn(List.of(today.minusDays(2), today.minusDays(1), today));

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
        DailyActivityDto day = new DailyActivityDto("2026-05-20", 30, 27, 3, 90.0, 3);
        when(jdbcTemplate.query(
                eq(AnalyticsSql.HEATMAP_DAILY),
                any(RowMapper.class),
                eq(zoneId.getId()), eq(userId), any(), any()
        )).thenReturn(List.of(day));

        HeatmapResponse heatmap = analyticsService.getHeatmap(userId, 2026, zoneId);

        assertEquals(2026, heatmap.year());
        assertEquals(1, heatmap.totalActiveDays());
        assertEquals(30, heatmap.totalQuestions());
        assertEquals(90.0, heatmap.averageAccuracy());
        assertEquals(1, heatmap.days().size());

        DailyActivityDto resDay = heatmap.days().get(0);
        assertEquals("2026-05-20", resDay.date());
        assertEquals(30, resDay.totalQuestions());
        assertEquals(3, resDay.level()); // 25..49 is level 3
    }

    @Test
    @DisplayName("getRetention distribution segments cards into unseen, learning, reviewing, mastered")
    void testGetRetention() {
        RetentionDistributionResponse mockResp = new RetentionDistributionResponse(1, 1, 1, 1, 4);
        when(jdbcTemplate.queryForObject(
                eq(AnalyticsSql.RETENTION_DISTRIBUTION),
                any(RowMapper.class),
                eq(userId), eq(userId)
        )).thenReturn(mockResp);

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
        WeakWordDto w1 = new WeakWordDto(101L, "ubiquitous", "phổ biến", 8, 2, 20.0, null);
        WeakWordDto w2 = new WeakWordDto(102L, "ephemeral", "phù du", 3, 5, 62.5, null);

        when(jdbcTemplate.query(
                eq(AnalyticsSql.WEAK_WORDS),
                any(RowMapper.class),
                eq(userId), eq(5)
        )).thenReturn(List.of(w1, w2));

        List<WeakWordDto> weakWords = analyticsService.getWeakWords(userId, 5);

        assertEquals(2, weakWords.size());
        assertEquals("ubiquitous", weakWords.get(0).word());
        assertEquals(8, weakWords.get(0).wrongCount());
        assertEquals("ephemeral", weakWords.get(1).word());
        assertEquals(3, weakWords.get(1).wrongCount());
    }
}
