package com.languagelearning.backend.level.repository;

import com.languagelearning.backend.level.entity.UserXp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface UserXpRepository extends JpaRepository<UserXp, Long> {

    @Modifying
    @Query(value = """
        INSERT INTO user_xp (user_id, total_xp, updated_at)
        VALUES (:userId, :amount, :now)
        ON CONFLICT (user_id)
        DO UPDATE SET total_xp = user_xp.total_xp + :amount, updated_at = :now
        """, nativeQuery = true)
    int addXpAtomic(@Param("userId") Long userId, @Param("amount") long amount, @Param("now") Instant now);
}
