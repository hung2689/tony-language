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

    @Query(value = """
        SELECT EXISTS(
            WITH plan_words AS (
                SELECT MIN(v.id) AS vocabulary_id
                FROM study_plan_decks spd
                JOIN vocabulary_set_items vsi ON vsi.vocabulary_set_id = spd.deck_id
                JOIN vocabularies v ON v.id = vsi.vocabulary_id
                WHERE spd.study_plan_id = :planId
                GROUP BY LOWER(BTRIM(v.word, E' \\t\\n\\r'))
            )
            SELECT 1
            FROM plan_words pw
            LEFT JOIN study_progress sp ON sp.vocabulary_id = pw.vocabulary_id AND sp.user_id = :userId
            WHERE (
                (sp.id IS NOT NULL AND (
                    (sp.next_review_at IS NOT NULL AND sp.next_review_at < :endOfStudyDay)
                    OR (sp.wrong_count > 0 AND sp.accuracy < 70.0)
                ))
                OR
                (:maxNewWords > 0 AND (sp.id IS NULL OR (sp.correct_count = 0 AND sp.wrong_count = 0)))
            )
            LIMIT 1
        )
    """, nativeQuery = true)
    boolean hasCardsToStudyToday(@Param("userId") Long userId,
                                 @Param("planId") Long planId,
                                 @Param("endOfStudyDay") Instant endOfStudyDay,
                                 @Param("maxNewWords") int maxNewWords);
}
