package com.languagelearning.backend.study.repository;

import com.languagelearning.backend.study.entity.StudyPlanDeck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudyPlanDeckRepository extends JpaRepository<StudyPlanDeck, Long> {

    List<StudyPlanDeck> findByStudyPlanId(Long studyPlanId);

    List<StudyPlanDeck> findByDeckId(Long deckId);

    Optional<StudyPlanDeck> findByStudyPlanIdAndDeckId(Long studyPlanId, Long deckId);

    boolean existsByStudyPlanIdAndDeckId(Long studyPlanId, Long deckId);

    void deleteByStudyPlanIdAndDeckId(Long studyPlanId, Long deckId);

    void deleteByStudyPlanId(Long studyPlanId);

    void deleteByDeckId(Long deckId);
}
