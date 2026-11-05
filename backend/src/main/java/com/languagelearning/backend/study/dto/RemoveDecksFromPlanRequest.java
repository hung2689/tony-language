package com.languagelearning.backend.study.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RemoveDecksFromPlanRequest(
        @NotEmpty(message = "Danh sách bộ từ cần xóa không được để trống")
        @Size(max = 200, message = "Không thể xóa quá 200 bộ từ trong một lần")
        List<@NotNull Long> deckIds
) {
}
