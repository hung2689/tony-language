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
        int learningWords,
        int remainingWords,
        long daysRemaining,
        double averageWordsPerDay,
        boolean isOverloaded,
        TodayStats todayStats,
        long revision,
        Integer restoredCount,
        Instant createdAt,
        Instant updatedAt
) {
    public StudyPlanResponse(
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
        this(
                id,
                name,
                targetDate,
                maxNewWordsPerDay,
                minWordsPerDay,
                timezone,
                hardGateEnabled,
                status,
                decks,
                totalWords,
                masteredWords,
                0,
                remainingWords,
                daysRemaining,
                averageWordsPerDay,
                isOverloaded,
                todayStats,
                0L,
                null,
                createdAt,
                updatedAt
        );
    }

    public record DeckInfo(Long id, String name, int cardCount, int masteredCount, int sortOrder) {
        public DeckInfo(Long id, String name, int cardCount) {
            this(id, name, cardCount, 0, 0);
        }
    }

    public record TodayStats(int dueCount, int weakCount, int newCount, int totalCount, boolean completedToday) {}
}
