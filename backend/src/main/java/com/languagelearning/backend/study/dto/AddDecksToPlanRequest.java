package com.languagelearning.backend.study.dto;

import jakarta.validation.constraints.NotEmpty;
import java.time.LocalDate;
import java.util.List;

public record AddDecksToPlanRequest(
        @NotEmpty(message = "Danh sách bộ từ không được để trống")
        List<Long> deckIds,
        String overloadStrategy, // KEEP_DEADLINE, EXTEND_DEADLINE, INCREASE_CAP
        LocalDate newTargetDate,
        Integer newMaxNewWordsPerDay
) {}
