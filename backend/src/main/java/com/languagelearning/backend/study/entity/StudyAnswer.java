package com.languagelearning.backend.study.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "study_answers")
public class StudyAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "vocabulary_id", nullable = false)
    private Long vocabularyId;

    @Column(name = "question_type", nullable = false, length = 50)
    private String questionType;

    @Column(name = "user_answer", columnDefinition = "TEXT")
    private String userAnswer;

    @Column(name = "is_correct", nullable = false)
    private boolean isCorrect;

    @Column(name = "answered_at", nullable = false, updatable = false)
    private Instant answeredAt;

    @Column(name = "client_answer_id", length = 64)
    private String clientAnswerId;

    @Column(name = "override", nullable = false)
    private boolean override = false;

    @Column(name = "attempt_no", nullable = false)
    private int attemptNo = 1;

    public StudyAnswer() {
    }

    public StudyAnswer(Long sessionId, Long vocabularyId, String questionType, String userAnswer,
                       boolean isCorrect, String clientAnswerId, boolean override, int attemptNo) {
        this.sessionId = sessionId;
        this.vocabularyId = vocabularyId;
        this.questionType = questionType;
        this.userAnswer = userAnswer;
        this.isCorrect = isCorrect;
        this.clientAnswerId = clientAnswerId;
        this.override = override;
        this.attemptNo = attemptNo;
    }

    @PrePersist
    public void prePersist() {
        if (this.answeredAt == null) {
            this.answeredAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public Long getVocabularyId() {
        return vocabularyId;
    }

    public void setVocabularyId(Long vocabularyId) {
        this.vocabularyId = vocabularyId;
    }

    public String getQuestionType() {
        return questionType;
    }

    public void setQuestionType(String questionType) {
        this.questionType = questionType;
    }

    public String getUserAnswer() {
        return userAnswer;
    }

    public void setUserAnswer(String userAnswer) {
        this.userAnswer = userAnswer;
    }

    public boolean isCorrect() {
        return isCorrect;
    }

    public void setCorrect(boolean correct) {
        isCorrect = correct;
    }

    public Instant getAnsweredAt() {
        return answeredAt;
    }

    public void setAnsweredAt(Instant answeredAt) {
        this.answeredAt = answeredAt;
    }

    public String getClientAnswerId() {
        return clientAnswerId;
    }

    public void setClientAnswerId(String clientAnswerId) {
        this.clientAnswerId = clientAnswerId;
    }

    public boolean isOverride() {
        return override;
    }

    public void setOverride(boolean override) {
        this.override = override;
    }

    public int getAttemptNo() {
        return attemptNo;
    }

    public void setAttemptNo(int attemptNo) {
        this.attemptNo = attemptNo;
    }
}
