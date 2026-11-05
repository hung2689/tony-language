package com.languagelearning.backend.study.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "study_plan_decks")
public class StudyPlanDeck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "study_plan_id", nullable = false)
    private Long studyPlanId;

    @Column(name = "deck_id", nullable = false)
    private Long deckId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;

    public StudyPlanDeck() {
    }

    public StudyPlanDeck(Long studyPlanId, Long deckId) {
        this.studyPlanId = studyPlanId;
        this.deckId = deckId;
    }

    public StudyPlanDeck(Long studyPlanId, Long deckId, int sortOrder) {
        this.studyPlanId = studyPlanId;
        this.deckId = deckId;
        this.sortOrder = sortOrder;
    }

    @PrePersist
    public void prePersist() {
        if (this.addedAt == null) {
            this.addedAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getStudyPlanId() {
        return studyPlanId;
    }

    public void setStudyPlanId(Long studyPlanId) {
        this.studyPlanId = studyPlanId;
    }

    public Long getDeckId() {
        return deckId;
    }

    public void setDeckId(Long deckId) {
        this.deckId = deckId;
    }

    public Instant getAddedAt() {
        return addedAt;
    }

    public void setAddedAt(Instant addedAt) {
        this.addedAt = addedAt;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
