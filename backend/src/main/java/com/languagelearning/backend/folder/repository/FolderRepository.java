package com.languagelearning.backend.folder.repository;

import com.languagelearning.backend.folder.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Folder> findByIdAndUserId(Long id, Long userId);
    Optional<Folder> findByUserIdAndNameIgnoreCase(Long userId, String name);
    boolean existsByUserIdAndNameIgnoreCase(Long userId, String name);
}
