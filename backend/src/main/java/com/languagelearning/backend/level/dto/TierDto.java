package com.languagelearning.backend.level.dto;

public record TierDto(
        int id,
        String name,
        int minLevel,
        int maxLevel,
        String colorHex,
        String description
) {}
