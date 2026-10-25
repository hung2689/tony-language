package com.languagelearning.backend.study.repository;

import com.languagelearning.backend.study.entity.StudyProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface StudyProgressRepository extends JpaRepository<StudyProgress, Long> {

    Optional<StudyProgress> findByUserIdAndVocabularyId(Long userId, Long vocabularyId);

    java.util.List<StudyProgress> findByUserIdAndVocabularyIdIn(Long userId, java.util.Collection<Long> vocabularyIds);

    java.util.List<StudyProgress> findByUserId(Long userId);

    @Modifying
    @Query("""
        UPDATE StudyProgress sp
        SET sp.intervalDays = :intervalDays,
            sp.easeFactor = :easeFactor,
            sp.repetitions = :repetitions,
            sp.nextReviewAt = :nextReviewAt,
            sp.memoryLevel = :memoryLevel,
            sp.lastReviewedAt = :now,
            sp.updatedAt = :now
        WHERE sp.userId = :userId AND sp.vocabularyId = :vocabularyId
    """)
    int updateSm2Progress(@Param("userId") Long userId,
                          @Param("vocabularyId") Long vocabularyId,
                          @Param("intervalDays") int intervalDays,
                          @Param("easeFactor") java.math.BigDecimal easeFactor,
                          @Param("repetitions") int repetitions,
                          @Param("nextReviewAt") Instant nextReviewAt,
                          @Param("memoryLevel") int memoryLevel,
                          @Param("now") Instant now);

    @Modifying
    @Query(value = """
        INSERT INTO study_progress (
            user_id, vocabulary_id, correct_count, wrong_count, accuracy,
            current_streak, difficulty, memory_level, last_reviewed_at, created_at, updated_at
        ) VALUES (
            :userId, :vocabularyId, :correctInc, :wrongInc,
            CASE WHEN (:correctInc + :wrongInc) > 0 THEN ROUND((:correctInc * 100.0) / (:correctInc + :wrongInc), 2) ELSE 0.00 END,
            CASE WHEN :isCorrect THEN 1 ELSE 0 END,
            0.00, 0, :now, :now, :now
        )
        ON CONFLICT (user_id, vocabulary_id) DO UPDATE SET
            correct_count = study_progress.correct_count + :correctInc,
            wrong_count = study_progress.wrong_count + :wrongInc,
            accuracy = CASE\s
                WHEN (study_progress.correct_count + :correctInc + study_progress.wrong_count + :wrongInc) > 0
                THEN ROUND(((study_progress.correct_count + :correctInc) * 100.0) / (study_progress.correct_count + :correctInc + study_progress.wrong_count + :wrongInc), 2)
                ELSE 0.00\s
            END,
            current_streak = CASE WHEN :isCorrect THEN study_progress.current_streak + 1 ELSE 0 END,
            last_reviewed_at = :now,
            updated_at = :now
        """, nativeQuery = true)
    int upsertProgress(@Param("userId") Long userId,
                       @Param("vocabularyId") Long vocabularyId,
                       @Param("correctInc") int correctInc,
                       @Param("wrongInc") int wrongInc,
                       @Param("isCorrect") boolean isCorrect,
                       @Param("now") Instant now);
}
