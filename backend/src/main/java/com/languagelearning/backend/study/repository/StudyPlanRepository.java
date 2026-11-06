package com.languagelearning.backend.study.repository;

import com.languagelearning.backend.study.entity.StudyPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudyPlanRepository extends JpaRepository<StudyPlan, Long> {

    Optional<StudyPlan> findByUserIdAndStatus(Long userId, StudyPlan.Status status);

    Optional<StudyPlan> findByUserIdAndStatusAndHardGateEnabledTrue(Long userId, StudyPlan.Status status);

    List<StudyPlan> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<StudyPlan> findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndStatus(Long userId, StudyPlan.Status status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE StudyPlan p SET p.revision = p.revision + 1, p.updatedAt = CURRENT_TIMESTAMP WHERE p.id = :planId")
    int bumpRevision(@Param("planId") Long planId);
}
