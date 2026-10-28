package com.languagelearning.backend.profile.dto;

import java.time.Instant;

public record ProfileResponse(
        Long id,
        String username,
        String email,
        String displayName,
        String avatarUrl,
        String bio,
        Instant joinedAt,
        int streak,
        int level,
        long totalXp,
        long xpIntoLevel,
        long xpForNext,
        int tierId,
        String tierName,
        boolean maxLevel,
        ProfileStatsDto stats
) {}
