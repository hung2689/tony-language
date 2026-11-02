package com.languagelearning.backend.study.synonym.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class QuickAddCardRequest {

    @NotNull(message = "deckId is required")
    private Long deckId;

    @NotBlank(message = "term is required")
    private String term;

    @NotBlank(message = "meaning is required")
    private String meaning;

    private String pronunciation;
    private String partOfSpeech;
    private String exampleSentence;

    public QuickAddCardRequest() {
    }

    public QuickAddCardRequest(Long deckId, String term, String meaning,
                               String pronunciation, String partOfSpeech, String exampleSentence) {
        this.deckId = deckId;
        this.term = term;
        this.meaning = meaning;
        this.pronunciation = pronunciation;
        this.partOfSpeech = partOfSpeech;
        this.exampleSentence = exampleSentence;
    }

    public Long getDeckId() {
        return deckId;
    }

    public void setDeckId(Long deckId) {
        this.deckId = deckId;
    }

    public String getTerm() {
        return term;
    }

    public void setTerm(String term) {
        this.term = term;
    }

    public String getMeaning() {
        return meaning;
    }

    public void setMeaning(String meaning) {
        this.meaning = meaning;
    }

    public String getPronunciation() {
        return pronunciation;
    }

    public void setPronunciation(String pronunciation) {
        this.pronunciation = pronunciation;
    }

    public String getPartOfSpeech() {
        return partOfSpeech;
    }

    public void setPartOfSpeech(String partOfSpeech) {
        this.partOfSpeech = partOfSpeech;
    }

    public String getExampleSentence() {
        return exampleSentence;
    }

    public void setExampleSentence(String exampleSentence) {
        this.exampleSentence = exampleSentence;
    }
}
