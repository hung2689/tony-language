package com.languagelearning.backend.deck.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class VocabularySetItemId implements Serializable {

    @Column(name = "vocabulary_set_id")
    private Long vocabularySetId;

    @Column(name = "vocabulary_id")
    private Long vocabularyId;

    public VocabularySetItemId() {
    }

    public VocabularySetItemId(Long vocabularySetId, Long vocabularyId) {
        this.vocabularySetId = vocabularySetId;
        this.vocabularyId = vocabularyId;
    }

    public Long getVocabularySetId() {
        return vocabularySetId;
    }

    public void setVocabularySetId(Long vocabularySetId) {
        this.vocabularySetId = vocabularySetId;
    }

    public Long getVocabularyId() {
        return vocabularyId;
    }

    public void setVocabularyId(Long vocabularyId) {
        this.vocabularyId = vocabularyId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        VocabularySetItemId that = (VocabularySetItemId) o;
        return Objects.equals(vocabularySetId, that.vocabularySetId) &&
                Objects.equals(vocabularyId, that.vocabularyId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(vocabularySetId, vocabularyId);
    }
}
