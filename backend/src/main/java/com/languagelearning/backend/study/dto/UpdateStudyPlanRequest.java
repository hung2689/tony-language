package com.languagelearning.backend.study.dto;

import com.languagelearning.backend.study.entity.StudyPlan;
import jakarta.validation.constraints.FutureOrPresent;
import java.time.LocalDate;

public record UpdateStudyPlanRequest(
        String name,
        @FutureOrPresent(message = "Ngày cần hoàn thành phải từ hôm nay trở đi")
        LocalDate targetDate,
        Integer maxNewWordsPerDay,
        Integer minWordsPerDay,
        Boolean hardGateEnabled,
        StudyPlan.Status status
) {}
