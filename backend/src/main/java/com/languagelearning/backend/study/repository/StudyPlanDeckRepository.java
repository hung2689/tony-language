package com.languagelearning.backend.study.repository;

import com.languagelearning.backend.study.entity.StudyPlanDeck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
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

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM StudyPlanDeck d WHERE d.studyPlanId = :planId AND d.deckId IN :deckIds")
    int deleteByPlanIdAndDeckIds(@Param("planId") Long planId,
                                 @Param("deckIds") Collection<Long> deckIds);

    @Query("SELECT COALESCE(MAX(d.sortOrder), 0) FROM StudyPlanDeck d WHERE d.studyPlanId = :planId")
    int findMaxSortOrderByPlanId(@Param("planId") Long planId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = StudyPlanSql.NORMALIZE_SORT_ORDER, nativeQuery = true)
    int normalizeSortOrder(@Param("planId") Long planId);

    @Query(value = StudyPlanSql.DECK_STATS, nativeQuery = true)
    List<DeckStatProjection> findDeckStatsByPlanId(@Param("userId") Long userId,
                                                   @Param("planId") Long planId);

    @Query(value = StudyPlanSql.PLAN_AGGREGATE, nativeQuery = true)
    PlanAggregateProjection calculatePlanAggregate(@Param("userId") Long userId,
                                                   @Param("planId") Long planId,
                                                   @Param("endOfStudyDay") Instant endOfStudyDay);
}
