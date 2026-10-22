package com.languagelearning.backend.deck.repository;

import com.languagelearning.backend.deck.entity.VocabularySet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VocabularySetRepository extends JpaRepository<VocabularySet, Long> {

    List<VocabularySet> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<VocabularySet> findByUserIdAndFolderIdOrderByCreatedAtDesc(Long userId, Long folderId);

    List<VocabularySet> findByUserIdAndFolderIdIsNullOrderByCreatedAtDesc(Long userId);

    Optional<VocabularySet> findByIdAndUserId(Long id, Long userId);

    long countByFolderId(Long folderId);

    long countByUserId(Long userId);

    long countByUserIdAndFolderIdIsNull(Long userId);

    @Query("SELECT v FROM VocabularySet v WHERE v.userId = :userId AND " +
            "(:folderId IS NULL OR v.folderId = :folderId) AND " +
            "(:isUncategorized = false OR v.folderId IS NULL) " +
            "ORDER BY v.createdAt DESC")
    List<VocabularySet> findByFolderFilter(
            @Param("userId") Long userId,
            @Param("folderId") Long folderId,
            @Param("isUncategorized") boolean isUncategorized
    );
}
