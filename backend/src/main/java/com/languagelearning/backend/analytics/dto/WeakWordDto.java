package com.languagelearning.backend.analytics.dto;

import java.time.Instant;

public record WeakWordDto(
        Long vocabularyId,
        String word,
        String meaning,
        int wrongCount,
        int correctCount,
        double accuracy,
        Instant lastReviewedAt
) {}
