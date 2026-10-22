package com.languagelearning.backend.term.repository;

import com.languagelearning.backend.term.entity.Vocabulary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {

    @Query("SELECT v FROM Vocabulary v JOIN VocabularySetItem vsi ON v.id = vsi.id.vocabularyId WHERE vsi.id.vocabularySetId = :deckId ORDER BY v.id ASC")
    List<Vocabulary> findByDeckId(@Param("deckId") Long deckId);
}
