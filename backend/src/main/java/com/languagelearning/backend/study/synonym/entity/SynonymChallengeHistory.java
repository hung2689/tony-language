package com.languagelearning.backend.study.synonym.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "synonym_challenge_history")
public class SynonymChallengeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "deck_id", nullable = false)
    private Long deckId;

    @Column(name = "vocabulary_id", nullable = false)
    private Long vocabularyId;

    @Column(name = "root_word", nullable = false)
    private String rootWord;

    @Column(name = "evaluation_mode", nullable = false)
    private String evaluationMode; // AI_GEMINI or LOCAL_FALLBACK

    @Column(name = "submitted_count", nullable = false)
    private int submittedCount;

    @Column(name = "valid_count", nullable = false)
    private int validCount;

    @Column(name = "invalid_count", nullable = false)
    private int invalidCount;

    @Column(name = "evaluated_words_json", columnDefinition = "TEXT")
    private String evaluatedWordsJson;

    @Column(name = "missed_synonyms_json", columnDefinition = "TEXT")
    private String missedSynonymsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public SynonymChallengeHistory() {
    }

    public SynonymChallengeHistory(Long userId, Long deckId, Long vocabularyId, String rootWord,
                                   String evaluationMode, int submittedCount, int validCount,
                                   int invalidCount, String evaluatedWordsJson, String missedSynonymsJson) {
        this.userId = userId;
        this.deckId = deckId;
        this.vocabularyId = vocabularyId;
        this.rootWord = rootWord;
        this.evaluationMode = evaluationMode;
        this.submittedCount = submittedCount;
        this.validCount = validCount;
        this.invalidCount = invalidCount;
        this.evaluatedWordsJson = evaluatedWordsJson;
        this.missedSynonymsJson = missedSynonymsJson;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getDeckId() {
        return deckId;
    }

    public void setDeckId(Long deckId) {
        this.deckId = deckId;
    }

    public Long getVocabularyId() {
        return vocabularyId;
    }

    public void setVocabularyId(Long vocabularyId) {
        this.vocabularyId = vocabularyId;
    }

    public String getRootWord() {
        return rootWord;
    }

    public void setRootWord(String rootWord) {
        this.rootWord = rootWord;
    }

    public String getEvaluationMode() {
        return evaluationMode;
    }

    public void setEvaluationMode(String evaluationMode) {
        this.evaluationMode = evaluationMode;
    }

    public int getSubmittedCount() {
        return submittedCount;
    }

    public void setSubmittedCount(int submittedCount) {
        this.submittedCount = submittedCount;
    }

    public int getValidCount() {
        return validCount;
    }

    public void setValidCount(int validCount) {
        this.validCount = validCount;
    }

    public int getInvalidCount() {
        return invalidCount;
    }

    public void setInvalidCount(int invalidCount) {
        this.invalidCount = invalidCount;
    }

    public String getEvaluatedWordsJson() {
        return evaluatedWordsJson;
    }

    public void setEvaluatedWordsJson(String evaluatedWordsJson) {
        this.evaluatedWordsJson = evaluatedWordsJson;
    }

    public String getMissedSynonymsJson() {
        return missedSynonymsJson;
    }

    public void setMissedSynonymsJson(String missedSynonymsJson) {
        this.missedSynonymsJson = missedSynonymsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
