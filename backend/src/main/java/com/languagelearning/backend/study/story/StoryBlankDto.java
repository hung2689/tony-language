package com.languagelearning.backend.study.story;

import java.util.ArrayList;
import java.util.List;

public class StoryBlankDto {
    private int index;
    private Long cardId;
    private String term;
    private String definition;
    private String partOfSpeech;
    private String example;
    private List<String> synonyms = new ArrayList<>();
    private String matchedWord;

    public StoryBlankDto() {
    }

    public StoryBlankDto(int index, Long cardId, String term, String definition, String partOfSpeech, String example, List<String> synonyms) {
        this(index, cardId, term, definition, partOfSpeech, example, synonyms, term);
    }

    public StoryBlankDto(int index, Long cardId, String term, String definition, String partOfSpeech, String example, List<String> synonyms, String matchedWord) {
        this.index = index;
        this.cardId = cardId;
        this.term = term;
        this.definition = definition;
        this.partOfSpeech = partOfSpeech;
        this.example = example;
        this.synonyms = synonyms != null ? synonyms : new ArrayList<>();
        this.matchedWord = matchedWord != null ? matchedWord : term;
    }

    public int getIndex() {
        return index;
    }

    public void setIndex(int index) {
        this.index = index;
    }

    public Long getCardId() {
        return cardId;
    }

    public void setCardId(Long cardId) {
        this.cardId = cardId;
    }

    public String getTerm() {
        return term;
    }

    public void setTerm(String term) {
        this.term = term;
    }

    public String getDefinition() {
        return definition;
    }

    public void setDefinition(String definition) {
        this.definition = definition;
    }

    public String getPartOfSpeech() {
        return partOfSpeech;
    }

    public void setPartOfSpeech(String partOfSpeech) {
        this.partOfSpeech = partOfSpeech;
    }

    public String getExample() {
        return example;
    }

    public void setExample(String example) {
        this.example = example;
    }

    public List<String> getSynonyms() {
        return synonyms;
    }

    public void setSynonyms(List<String> synonyms) {
        this.synonyms = synonyms != null ? synonyms : new ArrayList<>();
    }

    public String getMatchedWord() {
        return matchedWord;
    }

    public void setMatchedWord(String matchedWord) {
        this.matchedWord = matchedWord;
    }
}
