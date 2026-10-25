package com.languagelearning.backend.analytics.dto;

public record AnalyticsOverviewResponse(
        int currentStreak,
        int longestStreak,
        int totalQuestions,
        int correctQuestions,
        int wrongQuestions,
        double overallAccuracy,
        int totalActiveDays,
        int totalLearnedCards
) {}
