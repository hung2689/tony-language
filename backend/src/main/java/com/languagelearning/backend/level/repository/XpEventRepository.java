package com.languagelearning.backend.level.repository;

import com.languagelearning.backend.level.entity.XpEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface XpEventRepository extends JpaRepository<XpEvent, Long> {

    boolean existsByUserIdAndSourceTypeAndSourceKey(Long userId, String sourceType, String sourceKey);

    Optional<XpEvent> findByUserIdAndSourceTypeAndSourceKey(Long userId, String sourceType, String sourceKey);

    @Query("SELECT COALESCE(SUM(e.xp), 0) FROM XpEvent e WHERE e.userId = :userId AND e.createdAt >= :start AND e.createdAt < :end")
    long sumXpByUserIdAndCreatedAtBetween(@Param("userId") Long userId,
                                          @Param("start") Instant start,
                                          @Param("end") Instant end);
}
