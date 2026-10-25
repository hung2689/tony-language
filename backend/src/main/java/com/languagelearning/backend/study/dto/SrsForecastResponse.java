package com.languagelearning.backend.study.dto;

import java.util.List;

public record SrsForecastResponse(
        Long deckId,
        String deckName,
        int dueCount,
        int masteredCount,
        int totalCount,
        List<DayForecast> forecast7Days
) {
    public record DayForecast(
            String dayLabel,
            String date,
            int count,
            boolean isToday
    ) {}
}
