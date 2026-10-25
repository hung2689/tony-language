package com.languagelearning.backend.study.sentence.dto;

import java.util.List;

public class SentenceChallengeItemDto {
    private Long id;
    private Long termId;
    private String targetWord;
    private String partOfSpeech;
    private String phonetic;
    private String vietnamesePrompt;
    private String hint;
    private String referenceEnglish;
    private List<String> acceptableKeywords;

    public SentenceChallengeItemDto() {}

    public SentenceChallengeItemDto(
            Long id,
            Long termId,
            String targetWord,
            String partOfSpeech,
            String phonetic,
            String vietnamesePrompt,
            String hint,
            String referenceEnglish,
            List<String> acceptableKeywords
    ) {
        this.id = id;
        this.termId = termId;
        this.targetWord = targetWord;
        this.partOfSpeech = partOfSpeech;
        this.phonetic = phonetic;
        this.vietnamesePrompt = vietnamesePrompt;
        this.hint = hint;
        this.referenceEnglish = referenceEnglish;
        this.acceptableKeywords = acceptableKeywords;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getPartOfSpeech() {
        return partOfSpeech;
    }

    public void setPartOfSpeech(String partOfSpeech) {
        this.partOfSpeech = partOfSpeech;
    }

    public String getPhonetic() {
        return phonetic;
    }

    public void setPhonetic(String phonetic) {
        this.phonetic = phonetic;
    }

    public String getVietnamesePrompt() {
        return vietnamesePrompt;
    }

    public void setVietnamesePrompt(String vietnamesePrompt) {
        this.vietnamesePrompt = vietnamesePrompt;
    }

    public String getHint() {
        return hint;
    }

    public void setHint(String hint) {
        this.hint = hint;
    }

    public String getReferenceEnglish() {
        return referenceEnglish;
    }

    public void setReferenceEnglish(String referenceEnglish) {
        this.referenceEnglish = referenceEnglish;
    }

    public List<String> getAcceptableKeywords() {
        return acceptableKeywords;
    }

    public void setAcceptableKeywords(List<String> acceptableKeywords) {
        this.acceptableKeywords = acceptableKeywords;
    }
}
