package com.languagelearning.backend.deck.repository;

import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.entity.VocabularySetItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface VocabularySetItemRepository extends JpaRepository<VocabularySetItem, VocabularySetItemId> {

    List<VocabularySetItem> findByIdVocabularySetId(Long vocabularySetId);

    long countByIdVocabularySetId(Long vocabularySetId);

    @Query("SELECT vsi.id.vocabularySetId, COUNT(vsi) FROM VocabularySetItem vsi WHERE vsi.id.vocabularySetId IN :deckIds GROUP BY vsi.id.vocabularySetId")
    List<Object[]> countByVocabularySetIds(@Param("deckIds") Collection<Long> deckIds);

    void deleteByIdVocabularySetId(Long vocabularySetId);

    void deleteByIdVocabularySetIdAndIdVocabularyId(Long vocabularySetId, Long vocabularyId);

    boolean existsByIdVocabularySetIdAndIdVocabularyId(Long vocabularySetId, Long vocabularyId);

    @Query("SELECT COUNT(vsi) > 0 FROM VocabularySetItem vsi WHERE vsi.id.vocabularyId = :vocabularyId")
    boolean existsByIdVocabularyId(@Param("vocabularyId") Long vocabularyId);
}
