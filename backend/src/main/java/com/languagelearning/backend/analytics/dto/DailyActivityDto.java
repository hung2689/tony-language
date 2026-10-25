package com.languagelearning.backend.analytics.dto;

public record DailyActivityDto(
        String date, // YYYY-MM-DD
        int totalQuestions,
        int correctQuestions,
        int wrongQuestions,
        double accuracy,
        int level // 0..4 for heatmap shading
) {}
