package com.languagelearning.backend.study.synonym.dto;

import com.fasterxml.jackson.annotation.JsonGetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;

public class EvaluatedWordDto {
    @JsonProperty("word")
    private String word;

    @JsonProperty("status")
    private String status; // "EXACT_SYNONYM", "CONTEXTUAL_SYNONYM", "NOT_SYNONYM"

    @JsonProperty("isValid")
    private boolean isValid;

    @JsonProperty("source")
    private String source; // "DATABASE", "AI", "FALLBACK"

    @JsonProperty("meaning")
    private String meaning;

    @JsonProperty("explanation")
    private String explanation;

    public EvaluatedWordDto() {
    }

    public EvaluatedWordDto(String word, String status, boolean isValid, String source, String meaning, String explanation) {
        this.word = word;
        this.status = status;
        this.isValid = isValid;
        this.source = source;
        this.meaning = meaning;
        this.explanation = explanation;
    }

    public EvaluatedWordDto(String word, boolean isValid, String source, String meaning, String explanation) {
        this(word, isValid ? "EXACT_SYNONYM" : "NOT_SYNONYM", isValid, source, meaning, explanation);
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
        if ("EXACT_SYNONYM".equalsIgnoreCase(status) || "CONTEXTUAL_SYNONYM".equalsIgnoreCase(status)) {
            this.isValid = true;
        } else if ("NOT_SYNONYM".equalsIgnoreCase(status)) {
            this.isValid = false;
        }
    }

    @JsonGetter("isValid")
    public boolean isValid() {
        return isValid;
    }

    @JsonSetter("isValid")
    public void setIsValid(boolean valid) {
        this.isValid = valid;
    }

    // Expose "valid" as well for backwards compatibility and JSON serializers
    @JsonGetter("valid")
    public boolean getValid() {
        return isValid;
    }

    @JsonSetter("valid")
    public void setValid(boolean valid) {
        this.isValid = valid;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getMeaning() {
        return meaning;
    }

    public void setMeaning(String meaning) {
        this.meaning = meaning;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }
}
