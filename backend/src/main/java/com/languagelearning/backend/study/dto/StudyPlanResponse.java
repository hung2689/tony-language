package com.languagelearning.backend.study.dto;

import com.languagelearning.backend.study.entity.StudyPlan;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record StudyPlanResponse(
        Long id,
        String name,
        LocalDate targetDate,
        int maxNewWordsPerDay,
        int minWordsPerDay,
        String timezone,
        boolean hardGateEnabled,
        StudyPlan.Status status,
        List<DeckInfo> decks,
        int totalWords,
        int masteredWords,
        int remainingWords,
        long daysRemaining,
        double averageWordsPerDay,
        boolean isOverloaded,
        TodayStats todayStats,
        Instant createdAt,
        Instant updatedAt
) {
    public record DeckInfo(Long id, String name, int cardCount) {}
    public record TodayStats(int dueCount, int weakCount, int newCount, int totalCount, boolean completedToday) {}
}
