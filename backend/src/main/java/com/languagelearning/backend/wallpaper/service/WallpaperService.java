package com.languagelearning.backend.wallpaper.service;

import com.languagelearning.backend.common.exception.ResourceNotFoundException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.wallpaper.dto.WallpaperResponse;
import com.languagelearning.backend.wallpaper.entity.UserWallpaper;
import com.languagelearning.backend.wallpaper.repository.UserWallpaperRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@Service
public class WallpaperService {

    private final UserWallpaperRepository wallpaperRepository;
    private final CurrentUserProvider currentUserProvider;

    @Value("${app.upload.wallpaper-dir:uploads/wallpapers}")
    private String uploadDir;

    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final long MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB max

    public WallpaperService(UserWallpaperRepository wallpaperRepository,
                            CurrentUserProvider currentUserProvider) {
        this.wallpaperRepository = wallpaperRepository;
        this.currentUserProvider = currentUserProvider;
    }

    private Path getStoragePath() {
        Path p = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            if (!Files.exists(p)) {
                Files.createDirectories(p);
            }
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
        return p;
    }

    @Transactional(readOnly = true)
    public List<WallpaperResponse> getUserWallpapers() {
        Long userId = currentUserProvider.getCurrentUserId();
        List<UserWallpaper> list = wallpaperRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public WallpaperResponse uploadWallpaper(MultipartFile file, String customName) {
        Long userId = currentUserProvider.getCurrentUserId();

        if (file == null || file.isEmpty()) {
            throw new ValidationException("Vui lòng chọn tệp hình ảnh để tải lên");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ValidationException("Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 15MB)");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new ValidationException("Định dạng tệp không được hỗ trợ. Chỉ chấp nhận ảnh JPG, PNG, hoặc WebP");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        } else {
            if ("image/png".equalsIgnoreCase(contentType)) extension = ".png";
            else if ("image/webp".equalsIgnoreCase(contentType)) extension = ".webp";
            else extension = ".jpg";
        }

        String uniqueFileName = "wp_" + userId + "_" + UUID.randomUUID().toString() + extension;
        Path targetPath = getStoragePath().resolve(uniqueFileName);

        try {
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi lưu trữ hình ảnh", e);
        }

        String name = (customName != null && !customName.trim().isEmpty())
                ? customName.trim()
                : (originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(0, originalFilename.lastIndexOf("."))
                : "Hình nền tùy chỉnh");

        String publicUrl = "/api/wallpapers/files/" + uniqueFileName;

        UserWallpaper entity = new UserWallpaper(userId, name, publicUrl, publicUrl, false);
        entity = wallpaperRepository.save(entity);

        return mapToResponse(entity);
    }

    @Transactional
    public void deleteWallpaper(Long id) {
        Long userId = currentUserProvider.getCurrentUserId();
        UserWallpaper wp = wallpaperRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hình nền với mã: " + id));

        // Delete physical file if it exists in uploads
        String imageUrl = wp.getImageUrl();
        if (imageUrl != null && imageUrl.startsWith("/api/wallpapers/files/")) {
            String filename = imageUrl.substring("/api/wallpapers/files/".length());
            Path filePath = getStoragePath().resolve(filename);
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                // Log and continue deletion
            }
        }

        wallpaperRepository.delete(wp);
    }

    @Transactional
    public void setActiveWallpaper(Long id) {
        Long userId = currentUserProvider.getCurrentUserId();
        List<UserWallpaper> all = wallpaperRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (UserWallpaper wp : all) {
            wp.setActive(wp.getId().equals(id));
            wallpaperRepository.save(wp);
        }
    }

    public ResourceFile loadFile(String filename) {
        try {
            Path filePath = getStoragePath().resolve(filename).normalize();
            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                throw new ResourceNotFoundException("Tệp hình ảnh không tồn tại");
            }
            byte[] bytes = Files.readAllBytes(filePath);
            String probeContentType = Files.probeContentType(filePath);
            if (probeContentType == null) {
                probeContentType = "image/jpeg";
            }
            return new ResourceFile(bytes, probeContentType);
        } catch (IOException e) {
            throw new RuntimeException("Không thể đọc tệp ảnh", e);
        }
    }

    private WallpaperResponse mapToResponse(UserWallpaper wp) {
        return new WallpaperResponse(
                wp.getId(),
                wp.getName(),
                wp.getImageUrl(),
                wp.getThumbnailUrl(),
                wp.isActive(),
                wp.getCreatedAt()
        );
    }

    public record ResourceFile(byte[] data, String contentType) {}
}
