package com.languagelearning.backend.study.synonym.dto;

public class EvaluatedWordDto {
    private String word;
    private boolean isValid;
    private String source; // "DATABASE", "AI", "FALLBACK"
    private String meaning;
    private String explanation;

    public EvaluatedWordDto() {
    }

    public EvaluatedWordDto(String word, boolean isValid, String source, String meaning, String explanation) {
        this.word = word;
        this.isValid = isValid;
        this.source = source;
        this.meaning = meaning;
        this.explanation = explanation;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public boolean isValid() {
        return isValid;
    }

    public void setValid(boolean valid) {
        isValid = valid;
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
