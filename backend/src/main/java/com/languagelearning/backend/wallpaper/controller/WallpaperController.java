package com.languagelearning.backend.wallpaper.controller;

import com.languagelearning.backend.wallpaper.dto.WallpaperResponse;
import com.languagelearning.backend.wallpaper.service.WallpaperService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallpapers")
public class WallpaperController {

    private final WallpaperService wallpaperService;

    public WallpaperController(WallpaperService wallpaperService) {
        this.wallpaperService = wallpaperService;
    }

    /**
     * GET /api/wallpapers
     * Returns the list of wallpapers owned by the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<WallpaperResponse>> getUserWallpapers() {
        List<WallpaperResponse> wallpapers = wallpaperService.getUserWallpapers();
        return ResponseEntity.ok(wallpapers);
    }

    /**
     * POST /api/wallpapers
     * Uploads a new wallpaper image (multipart/form-data).
     * Accepts an optional "name" parameter for a custom display name.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WallpaperResponse> uploadWallpaper(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name) {
        WallpaperResponse response = wallpaperService.uploadWallpaper(file, name);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * DELETE /api/wallpapers/{id}
     * Deletes a wallpaper by ID (must belong to the authenticated user).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteWallpaper(@PathVariable Long id) {
        wallpaperService.deleteWallpaper(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa hình nền thành công"));
    }

    /**
     * PATCH /api/wallpapers/{id}/active
     * Sets the given wallpaper as the active one for the current user.
     */
    @PatchMapping("/{id}/active")
    public ResponseEntity<Map<String, String>> setActiveWallpaper(@PathVariable Long id) {
        wallpaperService.setActiveWallpaper(id);
        return ResponseEntity.ok(Map.of("message", "Đã áp dụng hình nền"));
    }

    /**
     * GET /api/wallpapers/files/{filename}
     * Serves uploaded wallpaper image files.
     * This endpoint is intentionally public (see SecurityConfig).
     */
    @GetMapping("/files/{filename}")
    public ResponseEntity<byte[]> serveFile(@PathVariable String filename) {
        // Reject path-traversal attempts
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return ResponseEntity.badRequest().build();
        }
        WallpaperService.ResourceFile resource = wallpaperService.loadFile(filename);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(resource.contentType()))
                .body(resource.data());
    }
}
