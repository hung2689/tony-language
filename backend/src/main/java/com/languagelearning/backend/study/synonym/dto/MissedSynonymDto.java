package com.languagelearning.backend.study.synonym.dto;

public class MissedSynonymDto {
    private String word;
    private String ipa;
    private String pos;
    private String meaning;
    private String example;
    private String exampleVi;
    private boolean isAlreadyInDeck;

    public MissedSynonymDto() {
    }

    public MissedSynonymDto(String word, String ipa, String pos, String meaning,
                            String example, String exampleVi, boolean isAlreadyInDeck) {
        this.word = word;
        this.ipa = ipa;
        this.pos = pos;
        this.meaning = meaning;
        this.example = example;
        this.exampleVi = exampleVi;
        this.isAlreadyInDeck = isAlreadyInDeck;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public String getIpa() {
        return ipa;
    }

    public void setIpa(String ipa) {
        this.ipa = ipa;
    }

    public String getPos() {
        return pos;
    }

    public void setPos(String pos) {
        this.pos = pos;
    }

    public String getMeaning() {
        return meaning;
    }

    public void setMeaning(String meaning) {
        this.meaning = meaning;
    }

    public String getExample() {
        return example;
    }

    public void setExample(String example) {
        this.example = example;
    }

    public String getExampleVi() {
        return exampleVi;
    }

    public void setExampleVi(String exampleVi) {
        this.exampleVi = exampleVi;
    }

    public boolean isAlreadyInDeck() {
        return isAlreadyInDeck;
    }

    public void setAlreadyInDeck(boolean alreadyInDeck) {
        isAlreadyInDeck = alreadyInDeck;
    }
}
