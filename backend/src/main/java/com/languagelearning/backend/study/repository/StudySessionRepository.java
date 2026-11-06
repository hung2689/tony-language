package com.languagelearning.backend.study.repository;

import com.languagelearning.backend.study.entity.StudySession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    Optional<StudySession> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StudySession s WHERE s.id = :id AND s.userId = :userId")
    Optional<StudySession> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);

    List<StudySession> findByUserIdOrderByStartedAtAsc(Long userId);

    List<StudySession> findByUserIdAndStartedAtBetweenOrderByStartedAtAsc(Long userId, Instant start, Instant end);
}
