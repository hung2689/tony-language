package com.languagelearning.backend.study.synonym.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

public class SynonymEvaluateRequest {

    private Long deckId;

    @NotNull(message = "vocabularyId is required")
    private Long vocabularyId;

    @NotBlank(message = "rootWord cannot be blank")
    private String rootWord;

    private List<String> userAnswers = new ArrayList<>();

    private String customApiKey;

    public SynonymEvaluateRequest() {
    }

    public SynonymEvaluateRequest(Long deckId, Long vocabularyId, String rootWord, List<String> userAnswers, String customApiKey) {
        this.deckId = deckId;
        this.vocabularyId = vocabularyId;
        this.rootWord = rootWord;
        this.userAnswers = userAnswers != null ? userAnswers : new ArrayList<>();
        this.customApiKey = customApiKey;
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

    public List<String> getUserAnswers() {
        return userAnswers;
    }

    public void setUserAnswers(List<String> userAnswers) {
        this.userAnswers = userAnswers != null ? userAnswers : new ArrayList<>();
    }

    public String getCustomApiKey() {
        return customApiKey;
    }

    public void setCustomApiKey(String customApiKey) {
        this.customApiKey = customApiKey;
    }
}
