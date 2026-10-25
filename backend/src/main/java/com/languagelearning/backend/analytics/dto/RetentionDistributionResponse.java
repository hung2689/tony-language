package com.languagelearning.backend.analytics.dto;

public record RetentionDistributionResponse(
        int unseenCount,
        int learningCount,
        int reviewingCount,
        int masteredCount,
        int totalCards
) {}
