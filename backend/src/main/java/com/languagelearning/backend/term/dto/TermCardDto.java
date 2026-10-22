package com.languagelearning.backend.term.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;

public class TermCardDto {

    private Long id;

    @NotBlank(message = "Thuật ngữ không được để trống")
    private String term;

    @NotBlank(message = "Định nghĩa không được để trống")
    private String definition;

    private String pronunciation;
    private String partOfSpeech;
    private String example;
    private List<String> synonyms = new ArrayList<>();

    public TermCardDto() {
    }

    public TermCardDto(Long id, String term, String definition, String pronunciation, String partOfSpeech, String example, List<String> synonyms) {
        this.id = id;
        this.term = term;
        this.definition = definition;
        this.pronunciation = pronunciation;
        this.partOfSpeech = partOfSpeech;
        this.example = example;
        this.synonyms = synonyms != null ? synonyms : new ArrayList<>();
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

    public String getDefinition() {
        return definition;
    }

    public void setDefinition(String definition) {
        this.definition = definition;
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
}
