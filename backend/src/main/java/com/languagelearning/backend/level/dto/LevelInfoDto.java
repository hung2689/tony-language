package com.languagelearning.backend.level.dto;

public record LevelInfoDto(
        int level,
        long totalXp,
        long xpIntoLevel,
        long xpForNext,
        int tierId,
        String tierName,
        boolean maxLevel
) {}
