package com.languagelearning.backend.study.synonym.repository;

import com.languagelearning.backend.study.synonym.entity.SynonymChallengeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SynonymChallengeHistoryRepository extends JpaRepository<SynonymChallengeHistory, Long> {

    List<SynonymChallengeHistory> findByUserIdAndDeckIdOrderByCreatedAtDesc(Long userId, Long deckId);

    List<SynonymChallengeHistory> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserId(Long userId);
}
