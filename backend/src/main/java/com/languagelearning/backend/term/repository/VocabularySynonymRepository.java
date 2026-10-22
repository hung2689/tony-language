package com.languagelearning.backend.term.repository;

import com.languagelearning.backend.term.entity.VocabularySynonym;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VocabularySynonymRepository extends JpaRepository<VocabularySynonym, Long> {
    List<VocabularySynonym> findByVocabularyId(Long vocabularyId);
    void deleteByVocabularyId(Long vocabularyId);
    List<VocabularySynonym> findByVocabularyIdIn(List<Long> vocabularyIds);
}
