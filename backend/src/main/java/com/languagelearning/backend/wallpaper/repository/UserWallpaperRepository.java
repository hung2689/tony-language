package com.languagelearning.backend.wallpaper.repository;

import com.languagelearning.backend.wallpaper.entity.UserWallpaper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserWallpaperRepository extends JpaRepository<UserWallpaper, Long> {
    List<UserWallpaper> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<UserWallpaper> findByIdAndUserId(Long id, Long userId);
}
