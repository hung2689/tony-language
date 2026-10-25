package com.languagelearning.backend.analytics.dto;

import java.util.List;

public record HeatmapResponse(
        int year,
        int totalActiveDays,
        int totalQuestions,
        double averageAccuracy,
        List<DailyActivityDto> days
) {}
