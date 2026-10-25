package com.languagelearning.backend.study.repository;

import com.languagelearning.backend.study.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    Optional<StudySession> findByIdAndUserId(Long id, Long userId);

    List<StudySession> findByUserIdOrderByStartedAtAsc(Long userId);

    List<StudySession> findByUserIdAndStartedAtBetweenOrderByStartedAtAsc(Long userId, Instant start, Instant end);
}
