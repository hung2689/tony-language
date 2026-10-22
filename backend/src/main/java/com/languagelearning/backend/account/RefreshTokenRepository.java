package com.languagelearning.backend.account;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revokedAt = :revokedAt WHERE r.tokenHash = :tokenHash AND r.revokedAt IS NULL")
    int revokeTokenIfActive(@Param("tokenHash") String tokenHash, @Param("revokedAt") Instant revokedAt);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revokedAt = :revokedAt WHERE r.user.id = :userId AND r.revokedAt IS NULL")
    int revokeAllActiveTokensByUserId(@Param("userId") Long userId, @Param("revokedAt") Instant revokedAt);

    List<RefreshToken> findByUserId(Long userId);
}
