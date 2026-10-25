package com.languagelearning.backend.study.dto;

import com.languagelearning.backend.term.dto.TermCardDto;
import java.time.LocalDate;
import java.util.List;

public record TodayStudyQueueResponse(
        Long planId,
        String planName,
        LocalDate todayDate,
        List<TermCardDto> cards,
        int dueCount,
        int weakCount,
        int newCount,
        int totalCount
) {}
