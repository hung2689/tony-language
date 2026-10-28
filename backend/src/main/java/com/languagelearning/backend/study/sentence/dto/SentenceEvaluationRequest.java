package com.languagelearning.backend.study.sentence.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public class SentenceEvaluationRequest {
    @JsonAlias({"cardId", "id"})
    private Long termId;

    @NotBlank(message = "Từ mục tiêu không được để trống")
    private String targetWord;

    @JsonAlias({"promptVi", "vietnameseSentence", "prompt"})
    private String vietnamesePrompt;

    @NotBlank(message = "Câu dịch của người học không được để trống")
    private String userSentence;

    @JsonAlias({"referenceSentence", "referenceEn", "reference"})
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

    public Long getCardId() {
        return termId;
    }

    public void setCardId(Long cardId) {
        if (this.termId == null) {
            this.termId = cardId;
        }
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

    public String getPromptVi() {
        return vietnamesePrompt;
    }

    public void setPromptVi(String promptVi) {
        if (this.vietnamesePrompt == null || this.vietnamesePrompt.isBlank()) {
            this.vietnamesePrompt = promptVi;
        }
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

    public String getReferenceSentence() {
        return referenceEnglish;
    }

    public void setReferenceSentence(String referenceSentence) {
        if (this.referenceEnglish == null || this.referenceEnglish.isBlank()) {
            this.referenceEnglish = referenceSentence;
        }
    }

    public String getReferenceEn() {
        return referenceEnglish;
    }

    public void setReferenceEn(String referenceEn) {
        if (this.referenceEnglish == null || this.referenceEnglish.isBlank()) {
            this.referenceEnglish = referenceEn;
        }
    }
}
