package com.languagelearning.backend.study.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class CreateSessionRequest {

    private Long deckId;

    @NotNull(message = "direction không được để trống")
    @Pattern(regexp = "^(VI_TO_EN|EN_TO_VI|RANDOM)$", message = "direction phải là VI_TO_EN, EN_TO_VI hoặc RANDOM")
    private String direction;

    private Integer plannedCount;

    private String order; // RANDOM | SEQUENTIAL

    public CreateSessionRequest() {
    }

    public CreateSessionRequest(Long deckId, String direction, Integer plannedCount, String order) {
        this.deckId = deckId;
        this.direction = direction;
        this.plannedCount = plannedCount;
        this.order = order;
    }

    public Long getDeckId() {
        return deckId;
    }

    public void setDeckId(Long deckId) {
        this.deckId = deckId;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public Integer getPlannedCount() {
        return plannedCount;
    }

    public void setPlannedCount(Integer plannedCount) {
        this.plannedCount = plannedCount;
    }

    public String getOrder() {
        return order;
    }

    public void setOrder(String order) {
        this.order = order;
    }
}
