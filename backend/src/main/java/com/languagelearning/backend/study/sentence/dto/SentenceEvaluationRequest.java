package com.languagelearning.backend.study.sentence.dto;

import jakarta.validation.constraints.NotBlank;

public class SentenceEvaluationRequest {
    private Long termId;

    @NotBlank(message = "Từ mục tiêu không được để trống")
    private String targetWord;

    private String vietnamesePrompt;

    @NotBlank(message = "Câu dịch của người học không được để trống")
    private String userSentence;

    private String referenceEnglish;

    public SentenceEvaluationRequest() {}

    public SentenceEvaluationRequest(
            Long termId,
            String targetWord,
            String vietnamesePrompt,
            String userSentence,
            String referenceEnglish
    ) {
        this.termId = termId;
        this.targetWord = targetWord;
        this.vietnamesePrompt = vietnamesePrompt;
        this.userSentence = userSentence;
        this.referenceEnglish = referenceEnglish;
    }

    public Long getTermId() {
        return termId;
    }

    public void setTermId(Long termId) {
        this.termId = termId;
    }

    public String getTargetWord() {
        return targetWord;
    }

    public void setTargetWord(String targetWord) {
        this.targetWord = targetWord;
    }

    public String getVietnamesePrompt() {
        return vietnamesePrompt;
    }

    public void setVietnamesePrompt(String vietnamesePrompt) {
        this.vietnamesePrompt = vietnamesePrompt;
    }

    public String getUserSentence() {
        return userSentence;
    }

    public void setUserSentence(String userSentence) {
        this.userSentence = userSentence;
    }

    public String getReferenceEnglish() {
        return referenceEnglish;
    }

    public void setReferenceEnglish(String referenceEnglish) {
        this.referenceEnglish = referenceEnglish;
    }
}
