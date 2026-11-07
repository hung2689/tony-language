package com.languagelearning.backend.analytics.service;

import com.languagelearning.backend.analytics.dto.*;
import com.languagelearning.backend.analytics.repository.AnalyticsSql;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;

@Service
public class AnalyticsService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public AnalyticsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse getOverview(Long userId, ZoneId zoneId) {
        String tz = zoneId != null ? zoneId.getId() : "UTC";

        int[] totalsAndLearned = jdbcTemplate.queryForObject(
                AnalyticsSql.OVERVIEW_TOTALS,
                (rs, rowNum) -> new int[]{
                        rs.getInt("total_questions"),
                        rs.getInt("correct_answers"),
                        rs.getInt("wrong_answers"),
                        rs.getInt("total_learned_cards")
                },
                userId, userId, userId, userId
        );

        int totalQuestions = totalsAndLearned != null ? totalsAndLearned[0] : 0;
        int correctQuestions = totalsAndLearned != null ? totalsAndLearned[1] : 0;
        int wrongQuestions = totalsAndLearned != null ? totalsAndLearned[2] : 0;
        int totalLearnedCards = totalsAndLearned != null ? totalsAndLearned[3] : 0;

        TreeSet<LocalDate> activeDates = new TreeSet<>(
                jdbcTemplate.query(
                        AnalyticsSql.OVERVIEW_ACTIVE_DATES,
                        (rs, rowNum) -> rs.getDate("study_date").toLocalDate(),
                        tz, userId
                )
        );

        double overallAccuracy = totalQuestions > 0
                ? BigDecimal.valueOf((correctQuestions * 100.0) / totalQuestions)
                    .setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        int currentStreak = calculateCurrentStreak(activeDates, LocalDate.now(zoneId));
        int longestStreak = calculateLongestStreak(activeDates);

        return new AnalyticsOverviewResponse(
                currentStreak,
                longestStreak,
                totalQuestions,
                correctQuestions,
                wrongQuestions,
                overallAccuracy,
                activeDates.size(),
                totalLearnedCards
        );
    }

    @Transactional(readOnly = true)
    public HeatmapResponse getHeatmap(Long userId, int year, ZoneId zoneId) {
        String tz = zoneId != null ? zoneId.getId() : "UTC";
        LocalDate startOfYear = LocalDate.of(year, 1, 1);
        Instant startInstant = startOfYear.atStartOfDay(zoneId).toInstant();
        Instant endInstant = startOfYear.plusYears(1).atStartOfDay(zoneId).toInstant();

        List<DailyActivityDto> days = jdbcTemplate.query(
                AnalyticsSql.HEATMAP_DAILY,
                (rs, rowNum) -> {
                    LocalDate d = rs.getDate("study_date").toLocalDate();
                    int totalQ = rs.getInt("total_q");
                    int correctQ = rs.getInt("correct_q");
                    int wrongQ = rs.getInt("wrong_q");

                    double acc = totalQ > 0
                            ? BigDecimal.valueOf((correctQ * 100.0) / totalQ).setScale(1, RoundingMode.HALF_UP).doubleValue()
                            : 0.0;

                    int level;
                    if (totalQ == 0) level = 0;
                    else if (totalQ < 10) level = 1;
                    else if (totalQ < 25) level = 2;
                    else if (totalQ < 50) level = 3;
                    else level = 4;

                    return new DailyActivityDto(
                            d.toString(),
                            totalQ,
                            correctQ,
                            wrongQ,
                            acc,
                            level
                    );
                },
                tz, userId, Timestamp.from(startInstant), Timestamp.from(endInstant)
        );

        int totalQuestionsYear = 0;
        int totalCorrectYear = 0;
        for (DailyActivityDto d : days) {
            totalQuestionsYear += d.totalQuestions();
            totalCorrectYear += d.correctQuestions();
        }

        double avgAccuracy = totalQuestionsYear > 0
                ? BigDecimal.valueOf((totalCorrectYear * 100.0) / totalQuestionsYear)
                    .setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        return new HeatmapResponse(
                year,
                days.size(),
                totalQuestionsYear,
                avgAccuracy,
                days
        );
    }

    @Transactional(readOnly = true)
    public RetentionDistributionResponse getRetentionDistribution(Long userId) {
        return jdbcTemplate.queryForObject(
                AnalyticsSql.RETENTION_DISTRIBUTION,
                (rs, rowNum) -> {
                    int totalCards = rs.getInt("total_cards");
                    int mastered = rs.getInt("mastered");
                    int reviewing = rs.getInt("reviewing");
                    int learning = rs.getInt("learning");

                    int activeCount = mastered + reviewing + learning;
                    int unseen = Math.max(0, totalCards - activeCount);

                    return new RetentionDistributionResponse(
                            unseen,
                            learning,
                            reviewing,
                            mastered,
                            Math.max(totalCards, activeCount)
                    );
                },
                userId, userId
        );
    }

    @Transactional(readOnly = true)
    public List<WeakWordDto> getWeakWords(Long userId, int limit) {
        int actualLimit = limit > 0 ? limit : 10;

        return jdbcTemplate.query(
                AnalyticsSql.WEAK_WORDS,
                (rs, rowNum) -> {
                    BigDecimal accBd = rs.getBigDecimal("accuracy");
                    double acc = accBd != null ? accBd.doubleValue() : 0.0;
                    Timestamp ts = rs.getTimestamp("last_reviewed_at");
                    Instant lastReviewedAt = ts != null ? ts.toInstant() : null;

                    return new WeakWordDto(
                            rs.getLong("vocab_id"),
                            rs.getString("word"),
                            rs.getString("meaning"),
                            rs.getInt("wrong_count"),
                            rs.getInt("correct_count"),
                            acc,
                            lastReviewedAt
                    );
                },
                userId, actualLimit
        );
    }

    private int calculateCurrentStreak(NavigableSet<LocalDate> dates, LocalDate today) {
        if (dates.isEmpty()) return 0;

        LocalDate checkDate = today;
        if (!dates.contains(checkDate)) {
            checkDate = today.minusDays(1);
            if (!dates.contains(checkDate)) {
                return 0;
            }
        }

        int streak = 0;
        while (dates.contains(checkDate)) {
            streak++;
            checkDate = checkDate.minusDays(1);
        }

        return streak;
    }

    private int calculateLongestStreak(NavigableSet<LocalDate> dates) {
        if (dates.isEmpty()) return 0;

        int maxStreak = 0;
        int currentStreak = 0;
        LocalDate prevDate = null;

        for (LocalDate d : dates) {
            if (prevDate == null || d.minusDays(1).isEqual(prevDate)) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }
            prevDate = d;
        }

        return maxStreak;
    }
}
