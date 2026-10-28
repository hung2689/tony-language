package com.languagelearning.backend.study.dto;

import java.time.Instant;

public class StudySessionResponse {

    private Long id;
    private Long deckId;
    private String direction;
    private Instant startedAt;
    private Instant completedAt;
    private int totalQuestions;
    private int correctAnswers;
    private int wrongAnswers;

    // Student Level & XP fields
    private Integer xpGained;
    private Long totalXp;
    private Integer level;
    private String tier;
    private Boolean leveledUp;

    public StudySessionResponse() {
    }

    public StudySessionResponse(Long id, Long deckId, String direction, Instant startedAt,
                                Instant completedAt, int totalQuestions, int correctAnswers, int wrongAnswers) {
        this.id = id;
        this.deckId = deckId;
        this.direction = direction;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.totalQuestions = totalQuestions;
        this.correctAnswers = correctAnswers;
        this.wrongAnswers = wrongAnswers;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public int getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(int totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public int getCorrectAnswers() {
        return correctAnswers;
    }

    public void setCorrectAnswers(int correctAnswers) {
        this.correctAnswers = correctAnswers;
    }

    public int getWrongAnswers() {
        return wrongAnswers;
    }

    public void setWrongAnswers(int wrongAnswers) {
        this.wrongAnswers = wrongAnswers;
    }

    public Integer getXpGained() {
        return xpGained;
    }

    public void setXpGained(Integer xpGained) {
        this.xpGained = xpGained;
    }

    public Long getTotalXp() {
        return totalXp;
    }

    public void setTotalXp(Long totalXp) {
        this.totalXp = totalXp;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public String getTier() {
        return tier;
    }

    public void setTier(String tier) {
        this.tier = tier;
    }

    public Boolean getLeveledUp() {
        return leveledUp;
    }

    public void setLeveledUp(Boolean leveledUp) {
        this.leveledUp = leveledUp;
    }
}
