package com.languagelearning.backend.deck.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "vocabulary_set_items")
public class VocabularySetItem {

    @EmbeddedId
    private VocabularySetItemId id;

    public VocabularySetItem() {
    }

    public VocabularySetItem(Long vocabularySetId, Long vocabularyId) {
        this.id = new VocabularySetItemId(vocabularySetId, vocabularyId);
    }

    public VocabularySetItem(VocabularySetItemId id) {
        this.id = id;
    }

    public VocabularySetItemId getId() {
        return id;
    }

    public void setId(VocabularySetItemId id) {
        this.id = id;
    }
}
