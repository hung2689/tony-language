package com.languagelearning.backend.study.dto;

import java.time.LocalDate;

public record PreviewAddDecksResponse(
        int currentTotalWords,
        int addedWordsCount,
        int newTotalWords,
        long daysRemaining,
        double currentAveragePerDay,
        double newAveragePerDay,
        int maxNewWordsPerDay,
        boolean isOverloaded,
        LocalDate suggestedTargetDate,
        int suggestedMaxPerDay
) {}
