package com.languagelearning.backend.study.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AnswerItemDto {

    @Size(max = 64, message = "clientAnswerId không được vượt quá 64 ký tự")
    private String clientAnswerId;

    @NotNull(message = "vocabularyId không được để trống")
    private Long vocabularyId;

    @NotNull(message = "direction không được để trống")
    @Pattern(regexp = "^(VI_TO_EN|EN_TO_VI)$", message = "direction câu hỏi phải là VI_TO_EN hoặc EN_TO_VI")
    private String direction;

    @NotNull(message = "result không được để trống")
    @Pattern(regexp = "^(CORRECT|WRONG|SKIPPED)$", message = "result phải là CORRECT, WRONG hoặc SKIPPED")
    private String result;

    private Boolean override = Boolean.FALSE;

    @Size(max = 500, message = "userAnswer không được vượt quá 500 ký tự")
    private String userAnswer;

    private Integer attemptNo = 1;

    private String rating; // Optional: "AGAIN", "HARD", "GOOD", "EASY"

    public AnswerItemDto() {
    }

    public AnswerItemDto(String clientAnswerId, Long vocabularyId, String direction,
                         String result, Boolean override, String userAnswer, Integer attemptNo) {
        this.clientAnswerId = clientAnswerId;
        this.vocabularyId = vocabularyId;
        this.direction = direction;
        this.result = result;
        this.override = override != null ? override : false;
        this.userAnswer = userAnswer;
        this.attemptNo = attemptNo != null ? attemptNo : 1;
    }

    public String getClientAnswerId() {
        return clientAnswerId;
    }

    public void setClientAnswerId(String clientAnswerId) {
        this.clientAnswerId = clientAnswerId;
    }

    public Long getVocabularyId() {
        return vocabularyId;
    }

    public void setVocabularyId(Long vocabularyId) {
        this.vocabularyId = vocabularyId;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public boolean isOverride() {
        return Boolean.TRUE.equals(override);
    }

    public void setOverride(Boolean override) {
        this.override = override != null ? override : false;
    }

    public String getUserAnswer() {
        return userAnswer;
    }

    public void setUserAnswer(String userAnswer) {
        this.userAnswer = userAnswer;
    }

    public int getAttemptNo() {
        return attemptNo != null ? attemptNo : 1;
    }

    public void setAttemptNo(Integer attemptNo) {
        this.attemptNo = attemptNo != null ? attemptNo : 1;
    }

    public String getRating() {
        return rating;
    }

    public void setRating(String rating) {
        this.rating = rating;
    }
}
