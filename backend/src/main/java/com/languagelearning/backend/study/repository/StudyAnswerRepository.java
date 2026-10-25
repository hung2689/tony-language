package com.languagelearning.backend.study.repository;

import com.languagelearning.backend.study.entity.StudyAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudyAnswerRepository extends JpaRepository<StudyAnswer, Long> {

    boolean existsBySessionIdAndClientAnswerId(Long sessionId, String clientAnswerId);

    Optional<StudyAnswer> findBySessionIdAndClientAnswerId(Long sessionId, String clientAnswerId);

    List<StudyAnswer> findBySessionId(Long sessionId);
}
