package com.languagelearning.backend.deck.repository;

import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.entity.VocabularySetItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VocabularySetItemRepository extends JpaRepository<VocabularySetItem, VocabularySetItemId> {

    List<VocabularySetItem> findByIdVocabularySetId(Long vocabularySetId);

    long countByIdVocabularySetId(Long vocabularySetId);

    void deleteByIdVocabularySetId(Long vocabularySetId);

    void deleteByIdVocabularySetIdAndIdVocabularyId(Long vocabularySetId, Long vocabularyId);

    boolean existsByIdVocabularySetIdAndIdVocabularyId(Long vocabularySetId, Long vocabularyId);
}
