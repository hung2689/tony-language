package com.languagelearning.backend.term.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "vocabulary_synonyms")
public class VocabularySynonym {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vocabulary_id", nullable = false)
    private Long vocabularyId;

    @Column(name = "synonym", nullable = false, length = 255)
    private String synonym;

    public VocabularySynonym() {
    }

    public VocabularySynonym(Long vocabularyId, String synonym) {
        this.vocabularyId = vocabularyId;
        this.synonym = synonym;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVocabularyId() {
        return vocabularyId;
    }

    public void setVocabularyId(Long vocabularyId) {
        this.vocabularyId = vocabularyId;
    }

    public String getSynonym() {
        return synonym;
    }

    public void setSynonym(String synonym) {
        this.synonym = synonym;
    }
}
