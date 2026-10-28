package com.languagelearning.backend.profile.dto;

public record ProfileStatsDto(
        int wordsStudied,
        Double accuracyPercent,
        int totalAnswers,
        Integer studyTimeMinutes,
        int numberDecks
) {}
