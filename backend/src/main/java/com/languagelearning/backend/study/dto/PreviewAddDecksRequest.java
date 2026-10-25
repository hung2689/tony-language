package com.languagelearning.backend.study.dto;

import java.time.LocalDate;
import java.util.List;

public record PreviewAddDecksRequest(
        List<Long> deckIds,
        LocalDate targetDate,
        Integer maxNewWordsPerDay
) {}
