package com.languagelearning.backend.study.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "study_plans")
public class StudyPlan {

    public enum Status {
        ACTIVE,
        PAUSED,
        COMPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Column(name = "max_new_words_per_day", nullable = false)
    private int maxNewWordsPerDay = 50;

    @Column(name = "min_words_per_day", nullable = false)
    private int minWordsPerDay = 5;

    @Column(name = "timezone", nullable = false, length = 50)
    private String timezone = "Asia/Ho_Chi_Minh";

    @Column(name = "hard_gate_enabled", nullable = false)
    private boolean hardGateEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public StudyPlan() {
    }

    public StudyPlan(Long userId, String name, LocalDate targetDate, int maxNewWordsPerDay, int minWordsPerDay, String timezone) {
        this.userId = userId;
        this.name = name;
        this.targetDate = targetDate;
        this.maxNewWordsPerDay = maxNewWordsPerDay;
        this.minWordsPerDay = minWordsPerDay;
        this.timezone = timezone != null && !timezone.isBlank() ? timezone : "Asia/Ho_Chi_Minh";
        this.status = Status.ACTIVE;
    }

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public void setTargetDate(LocalDate targetDate) {
        this.targetDate = targetDate;
    }

    public int getMaxNewWordsPerDay() {
        return maxNewWordsPerDay;
    }

    public void setMaxNewWordsPerDay(int maxNewWordsPerDay) {
        this.maxNewWordsPerDay = maxNewWordsPerDay;
    }

    public int getMinWordsPerDay() {
        return minWordsPerDay;
    }

    public void setMinWordsPerDay(int minWordsPerDay) {
        this.minWordsPerDay = minWordsPerDay;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public boolean isHardGateEnabled() {
        return hardGateEnabled;
    }

    public void setHardGateEnabled(boolean hardGateEnabled) {
        this.hardGateEnabled = hardGateEnabled;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
