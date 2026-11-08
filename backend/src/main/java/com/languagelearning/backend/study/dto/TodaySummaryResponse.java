package com.languagelearning.backend.study.dto;

import java.time.LocalDate;

public record TodaySummaryResponse(
        Long planId,
        String planName,
        LocalDate todayDate,
        int totalWords,
        int dueWords,
        int weakWords,
        int newWords,
        int totalCount,
        int dueCount,
        int weakCount,
        int newCount
) {
    public TodaySummaryResponse(Long planId, String planName, LocalDate todayDate, int dueCount, int weakCount, int newCount, int totalCount) {
        this(planId, planName, todayDate, totalCount, dueCount, weakCount, newCount, totalCount, dueCount, weakCount, newCount);
    }
}
