package com.languagelearning.backend.study.synonym.dto;

public class SynonymChallengeItemDto {
    private Long id;
    private String term;
    private String meaning;
    private String pronunciation;
    private String partOfSpeech;
    private String exampleSentence;
    private int knownSynonymsCount;

    public SynonymChallengeItemDto() {
    }

    public SynonymChallengeItemDto(Long id, String term, String meaning, String pronunciation,
                                   String partOfSpeech, String exampleSentence, int knownSynonymsCount) {
        this.id = id;
        this.term = term;
        this.meaning = meaning;
        this.pronunciation = pronunciation;
        this.partOfSpeech = partOfSpeech;
        this.exampleSentence = exampleSentence;
        this.knownSynonymsCount = knownSynonymsCount;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public int getKnownSynonymsCount() {
        return knownSynonymsCount;
    }

    public void setKnownSynonymsCount(int knownSynonymsCount) {
        this.knownSynonymsCount = knownSynonymsCount;
    }
}
