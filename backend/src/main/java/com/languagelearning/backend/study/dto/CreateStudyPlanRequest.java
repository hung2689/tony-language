package com.languagelearning.backend.study.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record CreateStudyPlanRequest(
        String name,
        @NotEmpty(message = "Vui lòng chọn ít nhất một bộ từ vựng")
        List<Long> deckIds,
        @NotNull(message = "Vui lòng chọn ngày cần hoàn thành")
        @FutureOrPresent(message = "Ngày cần hoàn thành phải từ hôm nay trở đi")
        LocalDate targetDate,
        Integer maxNewWordsPerDay,
        Integer minWordsPerDay,
        String timezone,
        Boolean hardGateEnabled
) {}
