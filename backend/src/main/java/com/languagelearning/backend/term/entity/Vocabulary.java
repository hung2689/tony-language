package com.languagelearning.backend.term.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "vocabularies")
public class Vocabulary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "word", nullable = false, length = 255)
    private String word;

    @Column(name = "meaning", nullable = false, columnDefinition = "TEXT")
    private String meaning;

    @Column(name = "word_type", length = 50)
    private String wordType;

    @Column(name = "pronunciation", length = 255)
    private String pronunciation;

    @Column(name = "example_sentence", columnDefinition = "TEXT")
    private String exampleSentence;

    @Column(name = "example_paragraph", columnDefinition = "TEXT")
    private String exampleParagraph;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Vocabulary() {
    }

    public Vocabulary(String word, String meaning, String wordType, String pronunciation, String exampleSentence) {
        this.word = word;
        this.meaning = meaning;
        this.wordType = wordType;
        this.pronunciation = pronunciation;
        this.exampleSentence = exampleSentence;
    }

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public String getMeaning() {
        return meaning;
    }

    public void setMeaning(String meaning) {
        this.meaning = meaning;
    }

    public String getWordType() {
        return wordType;
    }

    public void setWordType(String wordType) {
        this.wordType = wordType;
    }

    public String getPronunciation() {
        return pronunciation;
    }

    public void setPronunciation(String pronunciation) {
        this.pronunciation = pronunciation;
    }

    public String getExampleSentence() {
        return exampleSentence;
    }

    public void setExampleSentence(String exampleSentence) {
        this.exampleSentence = exampleSentence;
    }

    public String getExampleParagraph() {
        return exampleParagraph;
    }

    public void setExampleParagraph(String exampleParagraph) {
        this.exampleParagraph = exampleParagraph;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
